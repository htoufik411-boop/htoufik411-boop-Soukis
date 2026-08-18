import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

async function requireAdmin() {
  if (!(await isAdmin())) return { ok: false, reason: 'admin_required' };
  return { ok: true };
}

export async function getAdminOrders() {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, ...guard, orders: [] };
  const { data, error } = await supabase
    .from('orders')
    .select('id,user_id,status,total,currency,shipping_name,shipping_phone,shipping_address,created_at')
    .order('created_at', { ascending: false });
  return error ? { ok: false, error, orders: [] } : { ok: true, orders: data || [] };
}

export async function updateOrderStatus(orderId, status) {
  const allowed = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return { ok: false, reason: 'invalid_status' };
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('*')
    .single();
  return error ? { ok: false, error } : { ok: true, order: data };
}

export async function getAdminMonetization() {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, ...guard, payments: [], promotions: [], subscriptions: [] };

  const [payments, promotions, subscriptions] = await Promise.all([
    supabase.from('payment_transactions').select('id,user_id,listing_id,plan,amount_dzd,currency,payment_provider,payment_method,provider_transaction_id,provider_reference,status,created_at,paid_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('promotion_events').select('id,listing_id,user_id,promotion_type,starts_at,ends_at,status,created_at,reviewed_by,reviewed_at,review_note').order('created_at', { ascending: false }).limit(100),
    supabase.from('seller_subscriptions').select('id,user_id,plan,status,starts_at,ends_at,created_at,updated_at').order('created_at', { ascending: false }).limit(100)
  ]);

  const firstError = payments.error || promotions.error || subscriptions.error;
  if (firstError) return { ok: false, error: firstError, payments: [], promotions: [], subscriptions: [] };
  return { ok: true, payments: payments.data || [], promotions: promotions.data || [], subscriptions: subscriptions.data || [] };
}

export async function reviewPromotion(promotionId, status, reviewNote = '') {
  const allowed = ['approved', 'rejected'];
  if (!allowed.includes(status)) return { ok: false, reason: 'invalid_status' };
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('promotion_events')
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_note: reviewNote || null })
    .eq('id', promotionId)
    .eq('status', 'pending')
    .select('*')
    .single();
  return error ? { ok: false, error } : { ok: true, promotion: data };
}
