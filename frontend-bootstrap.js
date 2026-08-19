const modules = [
  ['i18n', () => import('./i18n.js?v=20260819-stability')],
  ['cart', () => import('./cart-bridge.js')],
  ['products', () => import('./products-ui.js')],
  ['integration', () => import('./soukis-integration.js')],
  ['monetization', () => import('./monetization.js')],
  ['corporate-ads', () => import('./corporate-ads.js')],
  ['my-products', () => import('./my-products.js')],
  ['orders', () => import('./my-orders.js')],
  ['admin', () => import('./admin.js')],
  ['auth', () => import('./auth.js')]
];

const safe = async (name, loader) => {
  try { return await loader(); }
  catch (error) { console.error(`[Soukis] ${name} failed to load`, error); return null; }
};

const safeInit = (name, initializer) => {
  try { initializer(); }
  catch (error) { console.error(`[Soukis] ${name} failed to initialize`, error); }
};

export async function bootSoukis() {
  if (window.__soukisBooted) return;
  window.__soukisBooted = true;

  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');
  const openModal = html => { if (body && modal) { body.innerHTML = html; modal.hidden = false; window.dispatchEvent(new CustomEvent('soukis:modal-opened')); } };
  const closeModal = () => { if (modal) modal.hidden = true; };
  document.getElementById('close')?.addEventListener('click', closeModal);

  const results = await Promise.all(modules.map(async ([name, loader]) => [name, await safe(name, loader)]));
  const loaded = Object.fromEntries(results);

  safeInit('i18n', () => loaded.i18n?.installI18n?.());
  safeInit('cart', () => loaded.cart?.installCartBridge?.());
  safeInit('products', () => loaded.products?.installProductsUI?.());
  safeInit('integration', () => loaded.integration?.installSoukisIntegration?.({ openModal, closeModal }));
  safeInit('monetization', () => loaded.monetization?.installMonetization?.({ openModal }));
  safeInit('corporate-ads', () => loaded['corporate-ads']?.installCorporateAds?.({ openModal }));
  safeInit('my-products', () => {
    if (!loaded['my-products']?.openMyProducts) return;
    document.getElementById('myProductsBtn')?.addEventListener('click', () => loaded['my-products'].openMyProducts(openModal, closeModal));
  });
  safeInit('admin', () => loaded.admin?.initAdmin?.());
  safeInit('auth', () => loaded.auth?.initAuth?.({ openModal, closeModal }));

  safeInit('orders', () => {
    const orders = loaded.orders;
    if (!orders?.getMyOrders || !orders?.renderMyOrders || document.getElementById('myOrdersBtn')) return;
    const t = loaded.i18n?.t || (key => key);
    const button = document.createElement('button');
    button.id = 'myOrdersBtn';
    button.className = 'pill';
    button.dataset.i18n = 'myOrders';
    button.textContent = t('myOrders');
    document.querySelector('.userbar')?.appendChild(button);

    button.addEventListener('click', async () => {
      try {
        const result = await orders.getMyOrders();
        if (!result.ok) {
          openModal(`<h2>${t('myOrders')}</h2><p class="msg">${t('adminLoginRequired')}</p>`);
          return;
        }
        openModal(`<h2>${t('myOrders')}</h2><div id="myOrdersList"></div>`);
        orders.renderMyOrders(document.getElementById('myOrdersList'), result.orders);
      } catch (error) {
        console.error('[Soukis] Orders UI failed', error);
        openModal(`<h2>${t('myOrders')}</h2><p class="msg">${t('ordersLoadError')}</p>`);
      }
    });
  });

  // Keep dynamically rendered modal content synchronized with the active language.
  window.addEventListener('soukis:language-changed', () => {
    const lang = loaded.i18n?.getCurrentLanguage?.() || document.documentElement.lang || 'ar';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (loaded.i18n?.t && key) el.textContent = loaded.i18n.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (loaded.i18n?.t && key) el.placeholder = loaded.i18n.t(key);
    });
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  });
}

window.addEventListener('DOMContentLoaded', bootSoukis, { once: true });
