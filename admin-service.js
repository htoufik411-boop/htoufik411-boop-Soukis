import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

export async function getAdminOrders() {
  if (!(await isAdmin())) return { ok: false, reason: 'admin_required', orders: [] };
  const { data, error } = await supabase.from('orders').select('id,buyer_id,status,total,currency,shipping_name,shipping_phone,shipping_address,created_at').order('created_at',{ascending:false});
  return error ? { ok:false,error,orders:[] } : { ok:true,orders:data||[] };
}

export async function updateOrderStatus(orderId, status) {
  // Must stay aligned with the database CHECK constraint.
  const allowed = ['pending','confirmed','processing','shipped','delivered','cancelled'];
  if (!allowed.includes(status)) return { ok:false, reason:'invalid_status' };
  if (!(await isAdmin())) return { ok:false, reason:'admin_required' };
  const { data, error } = await supabase.from('orders').update({status}).eq('id',orderId).select('*').single();
  return error ? {ok:false,error} : {ok:true,order:data};
}
