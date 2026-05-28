import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lynk-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractBuyerEmail(payload: any): string | null {
  const messageData = payload?.data?.message_data;
  const candidates = [
    payload?.customer?.email,
    payload?.buyer_email,
    payload?.email,
    payload?.data?.customer?.email,
    messageData?.customer?.email,
    payload?.customer_email,
    payload?.payer?.email,
    payload?.billing_email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

function extractLynkItems(payload: any): any[] {
  const candidates = [
    payload?.items,
    payload?.data?.items,
    payload?.data?.message_data?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }

  return [];
}

function extractLynkUuid(payload: any): string | null {
  const items = extractLynkItems(payload);
  const itemUuid = items.find((item) => typeof item?.uuid === "string" && item.uuid.trim())?.uuid;

  const candidates = [
    itemUuid,
    payload?.product_uuid,
    payload?.uuid,
    payload?.data?.product_uuid,
    payload?.data?.uuid,
    payload?.data?.message_data?.product_uuid,
    payload?.data?.message_data?.uuid,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  return null;
}

function extractPaymentAmount(payload: any): number {
  const messageData = payload?.data?.message_data;
  const candidates = [
    payload?.amount,
    payload?.data?.amount,
    messageData?.amount,
    messageData?.totals?.grandTotal,
    messageData?.totals?.customerPay,
    extractLynkItems(payload)?.[0]?.price,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  }

  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  // Read raw body for signature verification
  const rawBody = await req.text();
  let payload: any = null;
  try { payload = JSON.parse(rawBody); } catch { /* ignore — logged below */ }

  // Helper to write a log row and return the response. Always called once per request.
  const log = async (
    status: string,
    httpStatus: number,
    body: Record<string, unknown>,
    extra: {
      lynk_uuid?: string | null;
      buyer_email?: string | null;
      user_id?: string | null;
      exam_id?: string | null;
      amount?: number | null;
      error?: string | null;
    } = {}
  ) => {
    try {
      await db.from("lynk_webhook_logs").insert({
        status,
        http_status: httpStatus,
        lynk_uuid: extra.lynk_uuid ?? null,
        buyer_email: extra.buyer_email ?? null,
        user_id: extra.user_id ?? null,
        exam_id: extra.exam_id ?? null,
        amount: extra.amount ?? null,
        error: extra.error ?? null,
        raw_payload: payload ?? { _raw_body: rawBody },
      });
    } catch (e) {
      console.error("Failed to write webhook log:", e);
    }
    return json({ ...body, status }, httpStatus);
  };

  // Load merchant key from admin_settings
  const { data: mkRow } = await db
    .from("admin_settings")
    .select("value")
    .eq("key", "lynk_merchant_key")
    .maybeSingle();

  const merchantKey = mkRow?.value as string | undefined;

  const isTestMode = req.headers.get("x-test-mode") === "1";

  // Verify Lynk signature if merchant key is configured (skip in test mode)
  if (merchantKey && !isTestMode) {
    const receivedSig = req.headers.get("x-lynk-signature") ?? "";
    const expectedSig = await hmacSha256Hex(merchantKey, rawBody);
    const normalizedSig = receivedSig.startsWith("sha256=") ? receivedSig.slice(7) : receivedSig;
    if (normalizedSig !== expectedSig) {
      return log("invalid_signature", 401, { error: "Invalid signature — request not from Lynk" }, {
        error: `received=${receivedSig.slice(0, 16)}... expected_len=${expectedSig.length}`,
      });
    }
  }

  if (!payload) {
    return log("invalid_payload", 400, { error: "Invalid JSON body" }, {
      error: "JSON.parse failed on body",
    });
  }

  const eventName = payload?.event;
  const actionStatus = payload?.data?.message_action;
  if (eventName && eventName !== "payment.received") {
    return log("ignored_event", 200, { ignored: true, reason: `Unhandled event: ${eventName}` });
  }
  if (actionStatus && actionStatus !== "SUCCESS") {
    return log("ignored_action", 200, { ignored: true, reason: `Payment action not successful: ${actionStatus}` });
  }

  // Extract Lynk product UUID
  const lynkUuid = extractLynkUuid(payload);
  const buyerEmail = extractBuyerEmail(payload);
  const amount = extractPaymentAmount(payload);

  if (!lynkUuid) {
    return log("invalid_payload", 400, { error: "No product UUID found in payload" }, {
      buyer_email: buyerEmail,
      amount,
      error: "extractLynkUuid returned null",
    });
  }

  // Find matching package config
  const { data: pkg, error: pkgErr } = await db
    .from("lynk_packages")
    .select("*, exams(id,title)")
    .eq("lynk_uuid", lynkUuid)
    .eq("is_active", true)
    .maybeSingle();

  if (pkgErr) {
    return log("error", 500, { error: pkgErr.message }, { lynk_uuid: lynkUuid, buyer_email: buyerEmail, amount, error: pkgErr.message });
  }
  if (!pkg) {
    return log("unknown_uuid", 404, { error: `No active package found for UUID: ${lynkUuid}` }, {
      lynk_uuid: lynkUuid,
      buyer_email: buyerEmail,
      amount,
      error: "lynk_packages lookup returned no rows",
    });
  }
  if (!pkg.exam_id) {
    return log("error", 422, { error: "Package has no exam linked" }, {
      lynk_uuid: lynkUuid,
      buyer_email: buyerEmail,
      amount,
      error: "pkg.exam_id is null",
    });
  }

  if (!buyerEmail) {
    return log("invalid_payload", 400, { error: "No buyer email in payload" }, {
      lynk_uuid: lynkUuid,
      exam_id: pkg.exam_id,
      amount,
      error: "extractBuyerEmail returned null",
    });
  }

  // Find user by email from profiles (case-insensitive)
  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("id,email,username")
    .ilike("email", buyerEmail)
    .maybeSingle();

  if (profileErr) {
    return log("error", 500, { error: profileErr.message }, {
      lynk_uuid: lynkUuid,
      buyer_email: buyerEmail,
      exam_id: pkg.exam_id,
      amount,
      error: profileErr.message,
    });
  }
  if (!profile?.id) {
    return log("user_not_found", 404, {
      error: `User with email ${buyerEmail} not found. They must register first at the platform.`,
    }, {
      lynk_uuid: lynkUuid,
      buyer_email: buyerEmail,
      exam_id: pkg.exam_id,
      amount,
      error: "profile lookup by email returned no rows",
    });
  }

  const { data: childExams, error: childErr } = await db
    .from("exams")
    .select("id")
    .eq("parent_exam_id", pkg.exam_id);
  if (childErr) {
    return log("error", 500, { error: childErr.message }, {
      lynk_uuid: lynkUuid,
      buyer_email: buyerEmail,
      user_id: profile.id,
      exam_id: pkg.exam_id,
      amount,
      error: childErr.message,
    });
  }

  const examIdsToGrant = [pkg.exam_id, ...(childExams ?? []).map((exam) => exam.id)];
  const grantedExamIds: string[] = [];
  const alreadyGrantedExamIds: string[] = [];

  for (const examId of examIdsToGrant) {
    const { count: existingCount } = await db
      .from("exam_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("exam_id", examId)
      .eq("used", false);

    if ((existingCount ?? 0) > 0) {
      alreadyGrantedExamIds.push(examId);
      continue;
    }

    const { error: purchaseErr } = await db
      .from("exam_purchases")
      .insert({ user_id: profile.id, exam_id: examId, price_paid: amount });

    if (purchaseErr) {
      return log("error", 500, { error: purchaseErr.message, exam_id: examId }, {
        lynk_uuid: lynkUuid,
        buyer_email: buyerEmail,
        user_id: profile.id,
        exam_id: examId,
        amount,
        error: purchaseErr.message,
      });
    }
    grantedExamIds.push(examId);
  }

  const finalStatus = grantedExamIds.length > 0 ? "success" : "already_granted";
  return log(finalStatus, 200, {
    success: true,
    already_granted: grantedExamIds.length === 0,
    message: grantedExamIds.length > 0
      ? `Access granted to "${pkg.exams?.title}" for ${buyerEmail}`
      : `Access to "${pkg.exams?.title}" was already granted for ${buyerEmail}`,
    exam_id: pkg.exam_id,
    user_id: profile.id,
    granted_exam_ids: grantedExamIds,
    already_granted_exam_ids: alreadyGrantedExamIds,
  }, {
    lynk_uuid: lynkUuid,
    buyer_email: buyerEmail,
    user_id: profile.id,
    exam_id: pkg.exam_id,
    amount,
  });
});
