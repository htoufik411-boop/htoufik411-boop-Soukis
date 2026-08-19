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

const safe = async (name, loader, setup) => {
  try {
    const mod = await loader();
    if (setup) await setup(mod);
    return mod;
  } catch (error) {
    console.error(`[Soukis] ${name} failed to initialize`, error);
    return null;
  }
};

export async function bootSoukis() {
  if (window.__soukisBooted) return;
  window.__soukisBooted = true;

  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');
  const openModal = html => { if (body && modal) { body.innerHTML = html; modal.hidden = false; } };
  const closeModal = () => { if (modal) modal.hidden = true; };
  document.getElementById('close')?.addEventListener('click', closeModal, { once: true });

  const loaded = {};
  for (const [name, loader] of modules) {
    loaded[name] = await safe(name, loader);
  }

  if (loaded.i18n?.installI18n) loaded.i18n.installI18n();
  if (loaded.cart?.installCartBridge) loaded.cart.installCartBridge();
  if (loaded.products?.installProductsUI) loaded.products.installProductsUI();
  if (loaded.integration?.installSoukisIntegration) loaded.integration.installSoukisIntegration({ openModal, closeModal });
  if (loaded.monetization?.installMonetization) loaded.monetization.installMonetization({ openModal });
  if (loaded['corporate-ads']?.installCorporateAds) loaded['corporate-ads'].installCorporateAds({ openModal });
  if (loaded['my-products']?.openMyProducts) document.getElementById('myProductsBtn')?.addEventListener('click', () => loaded['my-products'].openMyProducts(openModal, closeModal));
  if (loaded.admin?.initAdmin) loaded.admin.initAdmin();
  if (loaded.auth?.initAuth) loaded.auth.initAuth({ openModal, closeModal });

  if (loaded.orders?.getMyOrders && loaded.orders?.renderMyOrders && !document.getElementById('myOrdersBtn')) {
    const button = document.createElement('button');
    button.id = 'myOrdersBtn';
    button.className = 'pill';
    button.dataset.i18n = 'myOrders';
    button.textContent = 'طلباتي';
    document.querySelector('.userbar')?.appendChild(button);
    button.addEventListener('click', async () => {
      const result = await loaded.orders.getMyOrders();
      if (!result.ok) {
        const { t } = loaded.i18n || {};
        openModal(`<h2>${t?.('myOrders') || 'طلباتي'}</h2><p class="msg">${t?.('adminLoginRequired') || 'سجّل الدخول أولًا.'}</p>`);
        return;
      }
      openModal(`<h2>${loaded.i18n?.t?.('myOrders') || 'طلباتي'}</h2><div id="myOrdersList"></div>`);
      loaded.orders.renderMyOrders(document.getElementById('myOrdersList'), result.orders);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => { bootSoukis(); }, { once: true });
