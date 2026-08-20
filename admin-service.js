import { db } from './supabase.js';

export async function isAdmin() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return false;
  const { data, error } = await db.rpc('is_admin');
  return !error && data === true;
}

export async function getAdminOrders() {
  if (!(await isAdmin())) return { ok: false, reason: 'admin_required', orders: [] };
  const { data, error } = await db
    .from('orders')
    .select('id,user_id,status,total,currency,shipping_name,shipping_phone,shipping_address,created_at')
    .order('created_at', { ascending: false });
  return error ? { ok: false, error, orders: [] } : { ok: true, orders: data || [] };
}

export async function updateOrderStatus(orderId, status) {
  const allowed = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return { ok: false, reason: 'invalid_status' };
  if (!(await isAdmin())) return { ok: false, reason: 'admin_required' };

  const { data, error } = await db
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('*')
    .single();

  return error ? { ok: false, error } : { ok: true, order: data };
}
