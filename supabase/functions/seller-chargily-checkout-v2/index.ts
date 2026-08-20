import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),key=Deno.env.get("CHARGILY_SECRET_KEY");
    if(!url||!anon||!key)return json({error:"server_not_configured"},503);
    const auth=req.headers.get("Authorization");
    if(!auth?.startsWith("Bearer "))return json({error:"missing_authorization"},401);
    const sb=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user}}=await sb.auth.getUser();
    if(!user)return json({error:"not_authenticated"},401);
    const input=await req.json().catch(()=>null);
    const paymentId=typeof input?.payment_id==="string"?input.payment_id:"";
    const method=typeof input?.payment_method==="string"?input.payment_method:"edahabia";
    if(!paymentId)return json({error:"payment_id_required"},400);
    if(!["edahabia","cib","chargily_app"].includes(method))return json({error:"invalid_payment_method"},400);
    const {data:prepared,error:prepError}=await sb.rpc("prepare_seller_chargily_checkout",{p_payment_id:paymentId});
    if(prepError||!prepared)return json({error:"checkout_preparation_failed"},400);
    const origin=req.headers.get("origin")||"https://htoufik411-boop.github.io";
    const base=Deno.env.get("CHARGILY_API_BASE_URL")||(Deno.env.get("CHARGILY_LIVE")==="true"||key.startsWith("live_")?"https://pay.chargily.net/api/v2":"https://pay.chargily.net/test/api/v2");
    const res=await fetch(`${base.replace(/\/$/,"")}/checkouts`,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({amount:prepared.amount_dzd,currency:"dzd",payment_method:method,success_url:`${origin}/?payment=success&payment_id=${encodeURIComponent(paymentId)}`,failure_url:`${origin}/?payment=failed&payment_id=${encodeURIComponent(paymentId)}`,webhook_endpoint:`${url}/functions/v1/chargily-webhook`,description:`Soukis ${prepared.plan} ${paymentId}`,locale:"ar",metadata:[{payment_id:paymentId,user_id:user.id,plan:prepared.plan}]})});
    const checkout=await res.json().catch(()=>null);
    if(!res.ok||!checkout?.id||!checkout?.checkout_url){console.error("Chargily seller checkout creation failed",res.status,checkout);return json({error:"provider_checkout_creation_failed"},502)}
    const {error:bindError}=await sb.rpc("bind_seller_chargily_checkout",{p_payment_id:paymentId,p_creation_token:prepared.creation_token,p_checkout_id:checkout.id});
    if(bindError)return json({error:"checkout_binding_failed"},500);
    return json({status:"bound",payment_id:paymentId,checkout_id:checkout.id,checkout_url:checkout.checkout_url});
  }catch(e){console.error(e);return json({error:"internal_error"},500)}
});
