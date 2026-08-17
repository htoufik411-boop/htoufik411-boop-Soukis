import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function getAdminOrders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required', orders: [] };
  const { data, error } = await supabase.from('orders').select('id,user_id,status,total_amount,shipping_name,shipping_phone,shipping_address,created_at').order('created_at',{ascending:false});
  return error ? { ok:false,error,orders:[] } : { ok:true,orders:data||[] };
}

export async function updateOrderStatus(orderId, status) {
  const allowed = ['pending','confirmed','shipped','delivered','cancelled'];
  if (!allowed.includes(status)) return { ok:false, reason:'invalid_status' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok:false, reason:'auth_required' };
  const { data, error } = await supabase.from('orders').update({status}).eq('id',orderId).select('*').single();
  return error ? {ok:false,error} : {ok:true,order:data};
}
