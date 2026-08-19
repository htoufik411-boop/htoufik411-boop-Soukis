import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),anonKey=Deno.env.get("SUPABASE_ANON_KEY"),chargilyKey=Deno.env.get("CHARGILY_SECRET_KEY");
  if(!supabaseUrl||!anonKey||!chargilyKey)return json({error:"server_not_configured"},503);
  const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return json({error:"missing_authorization"},401);
  const supabase=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)return json({error:"not_authenticated"},401);
  let input:Record<string,unknown>;try{input=await req.json()}catch{return json({error:"invalid_json"},400)}
  const requestId=typeof input.request_id==="string"?input.request_id:"",method=typeof input.payment_method==="string"?input.payment_method:"edahabia";
  if(!requestId)return json({error:"request_id_required"},400);if(!["edahabia","cib","chargily_app"].includes(method))return json({error:"invalid_payment_method"},400);
  const {error:createError}=await supabase.rpc("create_corporate_ad_checkout",{p_request_id:requestId,p_payment_provider:"chargily",p_payment_method:method});
  if(createError&&!String(createError.message||"").includes("payment_already_exists"))return json({error:"payment_creation_failed"},400);
  const origin=req.headers.get("origin")||"https://htoufik411-boop.github.io";
  const webhookEndpoint=`${supabaseUrl}/functions/v1/chargily-webhook`;
  const apiBase=Deno.env.get("CHARGILY_API_BASE_URL")||(Deno.env.get("CHARGILY_LIVE")==="true"||chargilyKey.startsWith("live_")?"https://pay.chargily.net/api/v2":"https://pay.chargily.net/test/api/v2");
  const {data:prepared,error:prepareError}=await supabase.rpc("prepare_chargily_checkout",{p_request_id:requestId});
  if(prepareError||!prepared)return json({error:"checkout_preparation_failed"},400);
  if(prepared.status==="already_created"&&prepared.checkout_id)return json({status:"already_created",payment_id:prepared.payment_id,checkout_id:prepared.checkout_id});
  const response=await fetch(`${apiBase.replace(/\/$/,"")}/checkouts`,{method:"POST",headers:{Authorization:`Bearer ${chargilyKey}`,"Content-Type":"application/json"},body:JSON.stringify({amount:prepared.amount_dzd,currency:"dzd",payment_method:prepared.payment_method||method,success_url:`${origin}/?payment=success&request_id=${encodeURIComponent(requestId)}`,failure_url:`${origin}/?payment=failed&request_id=${encodeURIComponent(requestId)}`,webhook_endpoint:webhookEndpoint,description:`Soukis corporate ad ${requestId}`,locale:"ar",metadata:[{request_id:requestId,payment_id:prepared.payment_id}]})});
  const checkout=await response.json().catch(()=>null);if(!response.ok||!checkout?.id||!checkout?.checkout_url){console.error("Chargily checkout creation failed",response.status,checkout);return json({error:"provider_checkout_creation_failed"},502)}
  const {data:bound,error:bindError}=await supabase.rpc("bind_chargily_checkout",{p_payment_id:prepared.payment_id,p_creation_token:prepared.creation_token,p_checkout_id:checkout.id});if(bindError||!bound)return json({error:"checkout_binding_failed"},500);
  return json({status:"bound",payment_id:prepared.payment_id,checkout_id:checkout.id,checkout_url:checkout.checkout_url,livemode:checkout.livemode??(Deno.env.get("CHARGILY_LIVE")==="true"||chargilyKey.startsWith("live_"))});
 }catch(error){console.error("chargily-checkout error",error);return json({error:"internal_error"},500)}
});
