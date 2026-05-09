import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lynk-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  let payload: any;
  try {
    payload = await req.json();
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

  // Extract buyer email from Lynk payload (common fields)
  const buyerEmail: string | undefined =
    payload?.customer?.email ?? payload?.buyer_email ?? payload?.email;

  if (!buyerEmail) {
    return json({ error: "No buyer email in payload", received: payload }, 400);
  }

  // Find user by email
  const { data: { users }, error: userErr } = await db.auth.admin.listUsers();
  if (userErr) return json({ error: userErr.message }, 500);

  const user = users.find((u) => u.email?.toLowerCase() === buyerEmail.toLowerCase());
  if (!user) {
    return json({ error: `User with email ${buyerEmail} not found. They must register first.` }, 404);
  }

  // Grant exam access — upsert to avoid duplicates
  const { error: purchaseErr } = await db
    .from("exam_purchases")
    .upsert({ user_id: user.id, exam_id: pkg.exam_id }, { onConflict: "user_id,exam_id", ignoreDuplicates: true });

  if (purchaseErr) return json({ error: purchaseErr.message }, 500);

  return json({
    success: true,
    message: `Access granted to exam "${pkg.exams?.title}" for ${buyerEmail}`,
    exam_id: pkg.exam_id,
    user_id: user.id,
  });
});
