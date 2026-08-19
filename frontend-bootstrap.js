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
const safe = async (name, loader) => { try { return await loader(); } catch (error) { console.error(`[Soukis] ${name} failed to initialize`, error); return null; } };
export async function bootSoukis() {
  if (window.__soukisBooted) return;
  window.__soukisBooted = true;
  const modal=document.getElementById('modal'), body=document.getElementById('modalBody');
  const openModal=html=>{if(body&&modal){body.innerHTML=html;modal.hidden=false;}};
  const closeModal=()=>{if(modal)modal.hidden=true;};
  document.getElementById('close')?.addEventListener('click',closeModal,{once:true});
  const loaded={};
  for(const [name,loader] of modules) loaded[name]=await safe(name,loader);
  loaded.i18n?.installI18n?.();
  loaded.cart?.installCartBridge?.();
  loaded.products?.installProductsUI?.();
  loaded.integration?.installSoukisIntegration?.({openModal,closeModal});
  loaded.monetization?.installMonetization?.({openModal});
  loaded['corporate-ads']?.installCorporateAds?.({openModal});
  if(loaded['my-products']?.openMyProducts) document.getElementById('myProductsBtn')?.addEventListener('click',()=>loaded['my-products'].openMyProducts(openModal,closeModal));
  loaded.admin?.initAdmin?.();
  loaded.auth?.initAuth?.({openModal,closeModal});
  if(loaded.orders?.getMyOrders&&loaded.orders?.renderMyOrders&&!document.getElementById('myOrdersBtn')){
    const button=document.createElement('button'); button.id='myOrdersBtn'; button.className='pill'; button.dataset.i18n='myOrders'; button.textContent=loaded.i18n?.t?.('myOrders')||'طلباتي'; document.querySelector('.userbar')?.appendChild(button);
    button.addEventListener('click',async()=>{const result=await loaded.orders.getMyOrders(); const t=loaded.i18n?.t||((key)=>key); if(!result.ok){openModal(`<h2>${t('myOrders')}</h2><p class="msg">${t('adminLoginRequired')}</p>`);return;} openModal(`<h2>${t('myOrders')}</h2><div id="myOrdersList"></div>`); loaded.orders.renderMyOrders(document.getElementById('myOrdersList'),result.orders);});
  }
}
window.addEventListener('DOMContentLoaded',bootSoukis,{once:true});
