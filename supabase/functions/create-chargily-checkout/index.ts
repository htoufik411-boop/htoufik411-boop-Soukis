import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const allowedMethods = new Set(["edahabia", "cib", "chargily_app"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const secret = Deno.env.get("CHARGILY_SECRET_KEY");
  const apiBase = Deno.env.get("CHARGILY_API_BASE_URL") || "https://pay.chargily.net/test/api/v2";
  const successUrl = Deno.env.get("CHARGILY_SUCCESS_URL");
  const failureUrl = Deno.env.get("CHARGILY_FAILURE_URL");
  const webhookEndpoint = Deno.env.get("CHARGILY_WEBHOOK_ENDPOINT");

  if (!supabaseUrl || !anonKey || !secret || !successUrl || !failureUrl || !webhookEndpoint) {
    return json({ error: "server_not_configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "missing_authorization" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "not_authenticated" }, 401);

  let input: { request_id?: string };
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (!input.request_id || typeof input.request_id !== "string") return json({ error: "request_id_required" }, 400);
  if (!uuidPattern.test(input.request_id)) return json({ error: "invalid_request_id" }, 400);

  const { data: prepared, error: prepareError } = await userClient.rpc("prepare_chargily_checkout", {
    p_request_id: input.request_id,
  });
  if (prepareError) {
    console.error("checkout preparation failed", prepareError);
    return json({ error: "checkout_preparation_failed" }, 400);
  }
  if (!prepared) return json({ error: "checkout_preparation_failed" }, 500);
  if (prepared.status === "already_created") {
    return json({ status: "already_created", checkout_id: prepared.checkout_id });
  }

  const method = typeof prepared.payment_method === "string" && allowedMethods.has(prepared.payment_method)
    ? prepared.payment_method : undefined;

  const payload: Record<string, unknown> = {
    amount: prepared.amount_dzd,
    currency: "dzd",
    success_url: successUrl,
    failure_url: failureUrl,
    webhook_endpoint: webhookEndpoint,
    description: `Soukis corporate ad ${prepared.request_id}`,
    locale: "ar",
    metadata: [{ request_id: prepared.request_id, payment_id: prepared.payment_id }],
  };
  if (method) payload.payment_method = method;

  let providerResponse: Response;
  try {
    providerResponse = await fetch(`${apiBase.replace(/\/$/, "")}/checkouts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("provider request failed", error);
    return json({ error: "provider_unreachable" }, 502);
  }

  const providerBody = await providerResponse.text();
  let checkout: any;
  try { checkout = JSON.parse(providerBody); } catch { checkout = null; }
  if (!providerResponse.ok || !checkout?.id || !checkout?.checkout_url) {
    console.error("provider checkout creation rejected", providerResponse.status, providerBody);
    return json({ error: "provider_checkout_creation_failed" }, 502);
  }

  const { data: bound, error: bindError } = await userClient.rpc("bind_chargily_checkout", {
    p_payment_id: prepared.payment_id,
    p_creation_token: prepared.creation_token,
    p_checkout_id: checkout.id,
  });
  if (bindError) {
    console.error("checkout binding failed", bindError);
    return json({ error: "checkout_binding_failed" }, 500);
  }

  return json({
    status: bound?.status || "bound",
    payment_id: prepared.payment_id,
    checkout_id: checkout.id,
    checkout_url: checkout.checkout_url,
  });
});
