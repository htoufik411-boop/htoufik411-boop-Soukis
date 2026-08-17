import { getAdminOrders, updateOrderStatus } from './admin-service.js';

const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  shipped: 'تم الشحن',
  completed: 'مكتمل',
  cancelled: 'ملغى'
};

export async function renderAdminPanel(container) {
  if (!container) return;
  container.innerHTML = '<p>جاري تحميل لوحة الإدارة…</p>';
  const result = await getAdminOrders();
  if (!result.ok) {
    container.innerHTML = '<div class="msg">الوصول إلى لوحة الإدارة غير متاح.</div>';
    return;
  }
  container.innerHTML = `
    <div class="admin-head"><div><small>Soukis Admin</small><h2>إدارة الطلبات</h2></div><span class="pill">${result.orders.length} طلب</span></div>
    ${result.orders.length ? result.orders.map(order => `
    <article class="msg admin-order" data-order-id="${escapeHtml(order.id)}">
      <strong>طلب #${escapeHtml(order.id)}</strong>
      <div>العميل: ${escapeHtml(order.shipping_name || '—')}</div>
      <div>الهاتف: ${escapeHtml(order.shipping_phone || '—')}</div>
      <div>العنوان: ${escapeHtml(order.shipping_address || '—')}</div>
      <div>الإجمالي: ${Number(order.total || 0).toLocaleString('fr-DZ')} ${escapeHtml(order.currency || 'DA')}</div>
      <select class="admin-status" aria-label="حالة الطلب">
        ${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${value === order.status ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
    </article>`).join('') : '<div class="msg">لا توجد طلبات حتى الآن.</div>'}`;

  container.querySelectorAll('.admin-status').forEach(select => {
    select.addEventListener('change', async () => {
      const orderId = select.closest('.admin-order')?.dataset.orderId;
      const previous = select.dataset.previous || select.value;
      select.disabled = true;
      const updated = await updateOrderStatus(orderId, select.value);
      select.disabled = false;
      if (!updated.ok) {
        select.value = previous;
        alert('تعذر تحديث حالة الطلب.');
      } else {
        select.dataset.previous = select.value;
      }
    });
    select.dataset.previous = select.value;
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
