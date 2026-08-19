import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function timingSafeEqual(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i); return diff===0; }

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  try {
    const secret=Deno.env.get("CHARGILY_SECRET_KEY"), signature=req.headers.get("signature"), supabaseUrl=Deno.env.get("SUPABASE_URL"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!secret||!signature||!supabaseUrl||!serviceKey)return new Response("bad_request",{status:400});
    const raw=await req.text();
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));
    const computed=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
    if(!timingSafeEqual(computed,signature.trim().toLowerCase()))return new Response("invalid_signature",{status:403});
    const event=JSON.parse(raw); if(event?.type!=="checkout.paid")return json({received:true});
    const checkout=event?.data,eventId=typeof event?.id==="string"?event.id:"",checkoutId=typeof checkout?.id==="string"?checkout.id:"",amount=Number(checkout?.amount),currency=typeof checkout?.currency==="string"?checkout.currency:"";
    if(!eventId||!checkoutId||!Number.isFinite(amount)||!currency)return new Response("invalid_payload",{status:400});
    const admin=createClient(supabaseUrl,serviceKey);
    const {data:payment,error:lookupError}=await admin.from("corporate_ad_payments").select("id,request_id,payment_provider").eq("provider_checkout_id",checkoutId).maybeSingle();
    if(lookupError)throw lookupError; if(!payment)return json({received:true}); if(payment.payment_provider!=="chargily")return new Response("invalid_payment_provider",{status:409});
    const {error:processError}=await admin.rpc("process_chargily_checkout_paid",{p_event_id:eventId,p_checkout_id:checkoutId,p_request_id:payment.request_id,p_amount:amount,p_currency:currency,p_payment_method:typeof checkout?.payment_method==="string"?checkout.payment_method:null});
    if(processError){console.error("Chargily webhook processing failed",processError);return new Response("webhook_processing_failed",{status:500});}
    return json({received:true});
  }catch(error){console.error("chargily-webhook error",error);return new Response("webhook_error",{status:500});}
});
