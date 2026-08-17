import { createOrderFromCart } from './orders-service.js';

export function openCheckout(openModal, closeModal) {
  openModal(`
    <h2>تأكيد الطلب</h2>
    <form id="checkoutForm" class="form">
      <input name="shippingName" required placeholder="الاسم الكامل">
      <input name="shippingPhone" required placeholder="رقم الهاتف">
      <textarea name="shippingAddress" required placeholder="عنوان التوصيل"></textarea>
      <button class="blue" type="submit">تأكيد الطلب</button>
      <p id="checkoutMessage" class="msg" hidden></p>
    </form>`);

  const form = document.getElementById('checkoutForm');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const message = document.getElementById('checkoutMessage');
    button.disabled = true;
    const values = Object.fromEntries(new FormData(form));
    const result = await createOrderFromCart(values);
    button.disabled = false;
    message.hidden = false;
    if (result.ok) {
      message.textContent = `تم إنشاء الطلب #${result.order.id}`;
      form.reset();
      window.dispatchEvent(new CustomEvent('soukis:order-created', { detail: result.order }));
      setTimeout(closeModal, 900);
    } else {
      message.textContent = result.reason === 'empty_cart' ? 'السلة فارغة.' : 'تعذر إنشاء الطلب. حاول مرة أخرى.';
    }
  });
}
