import { getAdminOrders, updateOrderStatus } from './admin-service.js';

export async function renderAdminPanel(container) {
  if (!container) return;
  container.innerHTML = '<p>جاري تحميل لوحة الإدارة…</p>';
  const result = await getAdminOrders();
  if (!result.ok) {
    container.innerHTML = '<div class="msg">الوصول إلى لوحة الإدارة غير متاح.</div>';
    return;
  }
  if (!result.orders.length) {
    container.innerHTML = '<div class="msg">لا توجد طلبات.</div>';
    return;
  }
  container.innerHTML = result.orders.map(order => `
    <article class="msg admin-order" data-order-id="${escapeHtml(order.id)}">
      <strong>طلب #${escapeHtml(order.id)}</strong>
      <div>العميل: ${escapeHtml(order.shipping_name || '')}</div>
      <div>الهاتف: ${escapeHtml(order.shipping_phone || '')}</div>
      <div>الإجمالي: ${Number(order.total || 0).toLocaleString('fr-DZ')} DA</div>
      <select class="admin-status">
        ${['pending','confirmed','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </article>`).join('');

  container.querySelectorAll('.admin-status').forEach(select => {
    select.addEventListener('change', async () => {
      const orderId = select.closest('.admin-order')?.dataset.orderId;
      select.disabled = true;
      const result = await updateOrderStatus(orderId, select.value);
      select.disabled = false;
      if (!result.ok) alert('تعذر تحديث حالة الطلب.');
    });
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
