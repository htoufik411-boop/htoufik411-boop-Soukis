import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { addToCart, getCart } from './cart-ui.js';
import { openCheckout } from './order-checkout.js';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export function installCartBridge({ buttonSelector = '.cart', listingIdAttribute = 'data-listing-id' } = {}) {
  if (document.documentElement.dataset.soukisCartBridgeInstalled === 'true') return;
  document.documentElement.dataset.soukisCartBridgeInstalled = 'true';

  const modal = () => document.querySelector('#modal');
  const body = () => document.querySelector('#modalBody');
  const openModal = html => { if (!modal() || !body()) return; body().innerHTML = html; modal().hidden = false; };
  const closeModal = () => { if (modal()) modal().hidden = true; };

  const refreshCartCount = async () => {
    const cart = await getCart();
    const count = cart.ok ? cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0;
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
    openModal(`<h2>تسجيل الدخول</h2><form id="authForm" class="form"><input name="email" type="email" required autocomplete="email" placeholder="البريد الإلكتروني"><input name="password" type="password" required minlength="6" autocomplete="current-password"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="blue" type="submit" data-mode="signin">دخول</button><button type="button" data-mode="signup">إنشاء حساب</button></div><p id="authMessage" class="msg" hidden></p></form>`);
    const form = document.querySelector('#authForm');
    const message = document.querySelector('#authMessage');
    form?.addEventListener('click', async event => {
      const mode = event.target.closest('[data-mode]')?.dataset.mode;
      if (!mode) return;
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      form.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const result = mode === 'signin' ? await supabase.auth.signInWithPassword({ email: values.email, password: values.password }) : await supabase.auth.signUp({ email: values.email, password: values.password });
      form.querySelectorAll('button').forEach(b => { b.disabled = false; });
      message.hidden = false;
      if (result.error) { message.textContent = result.error.message || 'تعذر إتمام العملية.'; return; }
      if (mode === 'signup' && !result.data.session) { message.textContent = 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول.'; return; }
      await refreshAuthUI();
      message.textContent = 'تم تسجيل الدخول بنجاح.';
      setTimeout(closeModal, 500);
    });
  };

  const openCart = async () => {
    const cart = await getCart();
    if (!cart.ok) { openModal('<h2>السلة</h2><p class="msg">سجّل الدخول أولًا لعرض سلتك.</p><button class="blue" id="cartLogin">تسجيل الدخول</button>'); document.querySelector('#cartLogin')?.addEventListener('click', () => { closeModal(); openAuthModal(); }); return; }
    const items = cart.items || [];
    if (!items.length) { openModal('<h2>السلة</h2><p class="msg">السلة فارغة حاليًا.</p>'); return; }
    const total = items.reduce((sum, item) => sum + Number(item.listings?.price || 0) * Number(item.quantity || 0), 0);
    openModal(`<h2>سلة التسوق</h2><div style="display:grid;gap:10px;margin:16px 0">${items.map(item => `<div style="display:flex;justify-content:space-between;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:12px"><div><strong>${esc(item.listings?.title || 'منتج')}</strong><small style="display:block;color:#6b7280">${Number(item.listings?.price || 0).toLocaleString('fr-DZ')} ${esc(item.listings?.currency || 'DA')} × ${item.quantity}</small></div><b>${(Number(item.listings?.price || 0) * Number(item.quantity || 0)).toLocaleString('fr-DZ')} ${esc(item.listings?.currency || 'DA')}</b></div>`).join('')}</div><h3>الإجمالي: ${total.toLocaleString('fr-DZ')} DA</h3><button class="blue" id="checkoutBtn" style="margin-top:14px;width:100%">متابعة إلى تأكيد الطلب</button>`);
    document.querySelector('#checkoutBtn')?.addEventListener('click', () => openCheckout(openModal, closeModal));
  };

  document.addEventListener('click', async event => {
    const authButton = event.target.closest('#authBtn');
    if (authButton) { event.preventDefault(); const { data: { user } } = await supabase.auth.getUser(); if (user) await supabase.auth.signOut(); else openAuthModal(); await refreshAuthUI(); return; }
    const cartButton = event.target.closest('#cartBtn');
    if (cartButton) { event.preventDefault(); await openCart(); return; }
    const button = event.target.closest(buttonSelector);
    if (!button) return;
    const listingId = button.getAttribute(listingIdAttribute) || button.dataset.id;
    if (!listingId) return;
    button.disabled = true;
    try {
      const result = await addToCart(listingId, 1);
      if (result.ok) { await refreshCartCount(); button.dataset.added = 'true'; button.setAttribute('aria-label', 'Added to cart'); }
      else if (result.reason === 'auth_required') openAuthModal();
    } finally { button.disabled = false; }
  });

  window.addEventListener('soukis:order-created', refreshCartCount);
  supabase.auth.onAuthStateChange(() => { refreshAuthUI(); refreshCartCount(); });
  refreshAuthUI();
  refreshCartCount();
}

function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
