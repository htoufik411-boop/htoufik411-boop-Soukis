import { getMyOrders, renderMyOrders } from './my-orders.js';

export async function openMyOrders(openModal) {
  openModal('<h2>طلباتي</h2><div id="myOrdersContent" class="form"><p>جاري التحميل…</p></div>');
  const container = document.getElementById('myOrdersContent');
  const result = await getMyOrders();
  if (!result.ok) {
    container.innerHTML = '<div class="msg">يرجى تسجيل الدخول لعرض طلباتك.</div>';
    return;
  }
  renderMyOrders(container, result.orders);
}
