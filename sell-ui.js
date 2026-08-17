import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function openSellModal(openModal, closeModal, onCreated = () => {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    openModal('<h2>تسجيل الدخول مطلوب</h2><p class="msg">سجّل الدخول أولًا حتى تتمكن من نشر منتج.</p><button class="blue" id="sellLogin">تسجيل الدخول</button>');
    document.querySelector('#sellLogin')?.addEventListener('click', () => document.querySelector('#authBtn')?.click());
    return;
  }

  openModal(`<h2>أضف منتجًا</h2><p class="msg">انشر منتجك ليظهر في سوق Soukis.</p>
    <form id="sellForm" class="form">
      <input name="title" required maxlength="120" placeholder="اسم المنتج">
      <input name="price" required type="number" min="0" step="0.01" placeholder="السعر">
      <input name="category" required maxlength="60" placeholder="الفئة">
      <input name="location" maxlength="120" placeholder="الموقع / المدينة">
      <input name="seller_name" maxlength="120" placeholder="اسم البائع">
      <input name="seller_phone" maxlength="40" placeholder="رقم الهاتف (اختياري)">
      <input name="image_url" type="url" maxlength="1000" placeholder="رابط صورة المنتج (اختياري)">
      <textarea name="description" maxlength="2000" placeholder="وصف المنتج"></textarea>
      <button class="blue" type="submit">نشر المنتج</button>
      <p id="sellMessage" class="msg" hidden></p>
    </form>`);

  const form = document.querySelector('#sellForm');
  const message = document.querySelector('#sellMessage');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    message.hidden = false;
    message.textContent = 'جارٍ نشر المنتج…';
    const values = Object.fromEntries(new FormData(form));
    const payload = {
      user_id: user.id,
      title: values.title.trim(),
      price: Number(values.price),
      category: values.category.trim(),
      location: values.location.trim() || null,
      seller_name: values.seller_name.trim() || null,
      seller_phone: values.seller_phone.trim() || null,
      image_url: values.image_url.trim() || null,
      description: values.description.trim() || null
    };
    const { error } = await supabase.from('listings').insert(payload);
    submit.disabled = false;
    if (error) {
      message.textContent = `تعذر نشر المنتج: ${error.message}`;
      return;
    }
    message.textContent = 'تم نشر المنتج بنجاح ✓';
    onCreated();
    setTimeout(closeModal, 700);
  });
}
