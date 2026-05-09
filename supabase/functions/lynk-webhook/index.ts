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

  // Verify Lynk signature if merchant key is configured
  if (merchantKey) {
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

  // Extract Lynk product UUID — Lynk sends items[0].uuid
  const lynkUuid: string | undefined =
    payload?.items?.[0]?.uuid ?? payload?.product_uuid ?? payload?.uuid;

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
  const buyerEmail: string | undefined =
    payload?.customer?.email ?? payload?.buyer_email ?? payload?.email ?? payload?.data?.customer?.email;

  if (!buyerEmail) {
    return json({ error: "No buyer email in payload", received: payload }, 400);
  }

  // Find user by email
  const { data: { users }, error: userErr } = await db.auth.admin.listUsers();
  if (userErr) return json({ error: userErr.message }, 500);

  const user = users.find((u) => u.email?.toLowerCase() === buyerEmail.toLowerCase());
  if (!user) {
    return json({
      error: `User with email ${buyerEmail} not found. They must register first at the platform.`,
    }, 404);
  }

  // Grant exam access
  const { error: purchaseErr } = await db
    .from("exam_purchases")
    .upsert({ user_id: user.id, exam_id: pkg.exam_id }, { onConflict: "user_id,exam_id", ignoreDuplicates: true });

  if (purchaseErr) return json({ error: purchaseErr.message }, 500);

  return json({
    success: true,
    message: `Access granted to "${pkg.exams?.title}" for ${buyerEmail}`,
    exam_id: pkg.exam_id,
    user_id: user.id,
  });
});
