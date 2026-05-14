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
    // Lynk may send "sha256=<hex>" or just "<hex>"
    const normalizedSig = receivedSig.startsWith("sha256=") ? receivedSig.slice(7) : receivedSig;
    if (normalizedSig !== expectedSig) {
      return json({ error: "Invalid signature — request not from Lynk" }, 401);
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const eventName = payload?.event;
  const actionStatus = payload?.data?.message_action;
  if (eventName && eventName !== "payment.received") {
    return json({ ignored: true, reason: `Unhandled event: ${eventName}` });
  }
  if (actionStatus && actionStatus !== "SUCCESS") {
    return json({ ignored: true, reason: `Payment action not successful: ${actionStatus}` });
  }

  // Extract Lynk product UUID — Lynk sends items[0].uuid
  const lynkUuid = extractLynkUuid(payload);
  if (!lynkUuid) {
    return json({ error: "No product UUID found in payload", received: payload }, 400);
  }

  // Find matching package config
  const { data: pkg, error: pkgErr } = await db
    .from("lynk_packages")
    .select("*, exams(id,title)")
    .eq("lynk_uuid", lynkUuid)
    .eq("is_active", true)
    .maybeSingle();

  if (pkgErr) return json({ error: pkgErr.message }, 500);
  if (!pkg) return json({ error: `No active package found for UUID: ${lynkUuid}` }, 404);
  if (!pkg.exam_id) return json({ error: "Package has no exam linked" }, 422);

  // Extract buyer email from Lynk payload
  const buyerEmail = extractBuyerEmail(payload);
  if (!buyerEmail) {
    return json({ error: "No buyer email in payload", received: payload }, 400);
  }

  // Find user by email from profiles instead of auth.admin.listUsers().
  // listUsers() is paginated and can silently miss valid users when the account count grows.
  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("id,email,username")
    .ilike("email", buyerEmail)
    .maybeSingle();

  if (profileErr) return json({ error: profileErr.message }, 500);
  if (!profile?.id) {
    return json({
      error: `User with email ${buyerEmail} not found. They must register first at the platform.`,
    }, 404);
  }

  const { data: childExams, error: childErr } = await db
    .from("exams")
    .select("id")
    .eq("parent_exam_id", pkg.exam_id);
  if (childErr) return json({ error: childErr.message }, 500);

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
      .insert({ user_id: profile.id, exam_id: examId, price_paid: extractPaymentAmount(payload) });

    if (purchaseErr) return json({ error: purchaseErr.message, exam_id: examId }, 500);
    grantedExamIds.push(examId);
  }

  return json({
    success: true,
    already_granted: grantedExamIds.length === 0,
    message: grantedExamIds.length > 0
      ? `Access granted to "${pkg.exams?.title}" for ${buyerEmail}`
      : `Access to "${pkg.exams?.title}" was already granted for ${buyerEmail}`,
    exam_id: pkg.exam_id,
    user_id: profile.id,
    granted_exam_ids: grantedExamIds,
    already_granted_exam_ids: alreadyGrantedExamIds,
  });
});
