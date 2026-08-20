const modules = [
  ['i18n', () => import('./i18n.js?v=20260819-stability2')],
  ['cart', () => import('./cart-bridge.js')],
  ['products', () => import('./products-ui.js')],
  ['integration', () => import('./soukis-integration.js')],
  ['monetization', () => import('./monetization.js?v=20260820-payment3')],
  ['corporate-ads', () => import('./corporate-ads.js')],
  ['corporate-ads-display', () => import('./corporate-ads-display.js?v=20260820-ads1')],
  ['my-products', () => import('./my-products.js')],
  ['orders', () => import('./my-orders.js')],
  ['admin', () => import('./admin.js')],
  ['auth', () => import('./auth.js')],
  ['subscription-status', () => import('./subscription-status.js?v=20260820-status1')]
];

const load = async (name, loader) => { try { return await loader(); } catch (error) { console.error(`[Soukis] ${name} failed to load`, error); return null; } };
const init = (name, fn) => { try { fn(); } catch (error) { console.error(`[Soukis] ${name} failed to initialize`, error); } };
export async function bootSoukis() {
  if (window.__soukisBooted) return; window.__soukisBooted = true;
  const modal=document.getElementById('modal'),body=document.getElementById('modalBody');
  const openModal=html=>{if(body&&modal){body.innerHTML=html;modal.hidden=false;}};
  const closeModal=()=>{if(modal)modal.hidden=true;}; document.getElementById('close')?.addEventListener('click',closeModal);
  const i18n=await load('i18n',modules[0][1]); if(!i18n?.installI18n){openModal('<h2>Soukis</h2><p class="msg">تعذر تشغيل الواجهة. أعد تحميل الصفحة.</p>');return;} init('i18n',()=>i18n.installI18n());
  const handlePaymentReturn=()=>{const params=new URLSearchParams(location.search),payment=params.get('payment');if(!payment||!['success','failed'].includes(payment))return;const key=payment==='success'?'paymentSuccess':'paymentFailed';openModal(`<h2>Soukis</h2><p class="msg">${i18n.t?.(key)||(payment==='success'?'Returned from the payment gateway. Payment status is being verified.':'The payment was not completed. You can try again.')}</p>`);history.replaceState({},document.title,`${location.pathname}${location.hash}`);}; handlePaymentReturn();
  const coreEntries=await Promise.all(modules.slice(1,4).map(async([name,loader])=>[name,await load(name,loader)])),core=Object.fromEntries(coreEntries);
  init('cart',()=>core.cart?.installCartBridge?.()); init('products',()=>core.products?.installProductsUI?.()); init('integration',()=>core.integration?.installSoukisIntegration?.({openModal,closeModal}));
  const optionalEntries=await Promise.all(modules.slice(4).map(async([name,loader])=>[name,await load(name,loader)])),optional=Object.fromEntries(optionalEntries);
  init('monetization',()=>optional.monetization?.installMonetization?.({openModal})); init('corporate-ads',()=>optional['corporate-ads']?.installCorporateAds?.({openModal})); init('corporate-ads-display',()=>optional['corporate-ads-display']?.installCorporateAdsDisplay?.());
  init('my-products',()=>{if(!optional['my-products']?.openMyProducts)return;document.getElementById('myProductsBtn')?.addEventListener('click',()=>optional['my-products'].openMyProducts(openModal,closeModal));});
  init('admin',()=>optional.admin?.initAdmin?.()); init('auth',()=>optional.auth?.initAuth?.({openModal,closeModal}));
  init('orders',()=>{const orders=optional.orders;if(!orders?.getMyOrders||!orders?.renderMyOrders||document.getElementById('myOrdersBtn'))return;const t=i18n.t||(k=>k),button=document.createElement('button');button.id='myOrdersBtn';button.className='pill';button.dataset.i18n='myOrders';button.textContent=t('myOrders');document.querySelector('.userbar')?.appendChild(button);button.addEventListener('click',async()=>{try{const result=await orders.getMyOrders();if(!result.ok){openModal(`<h2>${t('myOrders')}</h2><p class="msg">${t('adminLoginRequired')}</p>`);return;}openModal(`<h2>${t('myOrders')}</h2><div id="myOrdersList"></div>`);orders.renderMyOrders(document.getElementById('myOrdersList'),result.orders);}catch(error){console.error('[Soukis] Orders UI failed',error);openModal(`<h2>${t('myOrders')}</h2><p class="msg">${t('ordersLoadError')}</p>`);}});});
  init('subscription-status',()=>optional['subscription-status']?.installSubscriptionStatus?.());
  window.addEventListener('soukis:language-changed',()=>{const lang=i18n.getCurrentLanguage?.()||document.documentElement.lang||'ar';document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(key&&i18n.t)el.textContent=i18n.t(key);});document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const key=el.dataset.i18nPlaceholder;if(key&&i18n.t)el.placeholder=i18n.t(key);});document.documentElement.dir=lang==='ar'?'rtl':'ltr';});
}
window.addEventListener('DOMContentLoaded',()=>bootSoukis().catch(error=>{console.error('[Soukis] fatal bootstrap error',error);const modal=document.getElementById('modal'),body=document.getElementById('modalBody');if(modal&&body){body.innerHTML='<h2>Soukis</h2><p class="msg">تعذر تشغيل الواجهة. أعد تحميل الصفحة.</p>';modal.hidden=false;}}),{once:true});
