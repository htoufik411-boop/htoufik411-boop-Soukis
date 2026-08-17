import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';
import { addToCart, getCart } from './cart-ui.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export function installCartBridge({ buttonSelector = '.cart', listingIdAttribute = 'data-listing-id' } = {}) {
  if (document.documentElement.dataset.soukisCartBridgeInstalled === 'true') return;
  document.documentElement.dataset.soukisCartBridgeInstalled = 'true';

  const refreshCartCount = async () => {
    const cart = await getCart();
    const count = cart.ok
      ? cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      : 0;
    const counter = document.querySelector('#cartCount');
    if (counter) counter.textContent = String(count);
  };

  const refreshAuthUI = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const session = document.querySelector('#session');
    const button = document.querySelector('#authBtn');
    if (session) session.textContent = user ? (user.email || 'حساب مسجل') : 'غير مسجل';
    if (button) button.textContent = user ? 'تسجيل الخروج' : 'تسجيل الدخول';
  };

  const openAuthModal = () => {
    const modal = document.querySelector('#modal');
    const body = document.querySelector('#modalBody');
    if (!modal || !body) return;
    body.innerHTML = `<h2>تسجيل الدخول</h2><form id="authForm" class="form">
      <input name="email" type="email" required autocomplete="email" placeholder="البريد الإلكتروني">
      <input name="password" type="password" required minlength="6" autocomplete="current-password" placeholder="كلمة المرور">
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="blue" type="submit" data-mode="signin">دخول</button><button type="button" data-mode="signup">إنشاء حساب</button></div>
      <p id="authMessage" class="msg" hidden></p></form>`;
    modal.hidden = false;
    const form = document.querySelector('#authForm');
    const message = document.querySelector('#authMessage');
    form?.addEventListener('click', async event => {
      const mode = event.target.closest('[data-mode]')?.dataset.mode;
      if (!mode) return;
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      form.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const result = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: values.email, password: values.password })
        : await supabase.auth.signUp({ email: values.email, password: values.password });
      form.querySelectorAll('button').forEach(b => { b.disabled = false; });
      message.hidden = false;
      if (result.error) {
        message.textContent = result.error.message || 'تعذر إتمام العملية.';
        return;
      }
      if (mode === 'signup' && !result.data.session) {
        message.textContent = 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول.';
        return;
      }
      await refreshAuthUI();
      message.textContent = 'تم تسجيل الدخول بنجاح.';
      setTimeout(() => { modal.hidden = true; }, 500);
    });
  };

  document.addEventListener('click', async event => {
    const authButton = event.target.closest('#authBtn');
    if (authButton) {
      event.preventDefault();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.auth.signOut();
      else openAuthModal();
      await refreshAuthUI();
      return;
    }

    const button = event.target.closest(buttonSelector);
    if (!button) return;
    const listingId = button.getAttribute(listingIdAttribute) || button.dataset.id;
    if (!listingId) return;

    button.disabled = true;
    try {
      const result = await addToCart(listingId, 1);
      if (result.ok) {
        await refreshCartCount();
        button.dataset.added = 'true';
        button.setAttribute('aria-label', 'Added to cart');
      } else if (result.reason === 'auth_required') {
        openAuthModal();
      }
    } finally {
      button.disabled = false;
    }
  });

  window.addEventListener('soukis:order-created', refreshCartCount);
  supabase.auth.onAuthStateChange(() => { refreshAuthUI(); refreshCartCount(); });
  refreshAuthUI();
  refreshCartCount();
}
