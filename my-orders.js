import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function getMyOrders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required', orders: [] };

  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total_amount, shipping_name, shipping_phone, shipping_address, created_at, order_items(id, listing_id, quantity, unit_price, listings(title, name))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return error ? { ok: false, error, orders: [] } : { ok: true, orders: data || [] };
}

export function renderMyOrders(container, orders) {
  if (!container) return;
  if (!orders.length) {
    container.innerHTML = '<div class="msg">لا توجد طلبات بعد.</div>';
    return;
  }
  container.innerHTML = orders.map(order => `
    <article class="msg" style="margin-bottom:10px">
      <strong>طلب #${escapeHtml(order.id)}</strong>
      <div>الحالة: ${escapeHtml(order.status || 'pending')}</div>
      <div>الإجمالي: ${Number(order.total_amount || 0).toLocaleString('fr-DZ')} DA</div>
      <div>العنوان: ${escapeHtml(order.shipping_address || '')}</div>
    </article>`).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
