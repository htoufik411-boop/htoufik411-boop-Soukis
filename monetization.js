import { SOUKIS_PRICING } from './pricing.js';
import { db } from './supabase.js';

const plans = {
  boost: { ar: { title: '🚀 Boost', text: 'ارفع منتجك إلى موضع أكثر بروزًا ليشاهده عدد أكبر من المشترين.', duration: '7 أيام', benefits: ['رفع ظهور إعلان واحد', 'تفعيل الترويج لمدة 7 أيام'] }, fr: { title: '🚀 Boost', text: 'Mettez votre produit davantage en avant pour toucher plus d’acheteurs.', duration: '7 jours', benefits: ['Mise en avant d’une annonce', 'Promotion pendant 7 jours'] }, en: { title: '🚀 Boost', text: 'Give your product more visibility so more buyers can discover it.', duration: '7 days', benefits: ['Boost one listing', 'Promotion for 7 days'] } },
  premium: { ar: { title: '⭐ Premium', text: 'مزايا متقدمة للبائعين مع ظهور أفضل وأدوات إضافية للنمو.', duration: '15 يومًا', benefits: ['ظهور أفضل للإعلانات', 'إبراز المنتجات', 'أدوات نمو إضافية'] }, fr: { title: '⭐ Premium', text: 'Des avantages avancés pour les vendeurs avec plus de visibilité et des outils de croissance.', duration: '15 jours', benefits: ['Meilleure visibilité', 'Annonces mises en avant', 'Outils de croissance supplémentaires'] }, en: { title: '⭐ Premium', text: 'Advanced seller benefits with better visibility and extra growth tools.', duration: '15 days', benefits: ['Better listing visibility', 'Featured listings', 'Additional growth tools'] } },
  max: { ar: { title: '🔥 Max', text: 'باقة أقوى للبائعين النشطين مع ظهور أعلى ومزايا نمو متقدمة.', duration: '21 يومًا', benefits: ['ظهور أعلى من Premium', 'إبراز أقوى للمنتجات', 'أدوات بائع متقدمة'] }, fr: { title: '🔥 Max', text: 'Une formule plus puissante pour les vendeurs actifs avec davantage de visibilité et d’outils.', duration: '21 jours', benefits: ['Visibilité supérieure à Premium', 'Mise en avant renforcée', 'Outils vendeur avancés'] }, en: { title: '🔥 Max', text: 'A stronger plan for active sellers with higher visibility and advanced seller tools.', duration: '21 days', benefits: ['Higher visibility than Premium', 'Stronger featured placement', 'Advanced seller tools'] } },
  max_pro: { ar: { title: '👑 Max Pro', text: 'أعلى باقة للبائعين المحترفين مع أقصى مستوى من الظهور والمزايا.', duration: '30 يومًا', benefits: ['أقصى مستوى من الظهور', 'أولوية في إبراز المنتجات', 'جميع مزايا الباقات الأدنى'] }, fr: { title: '👑 Max Pro', text: 'La formule la plus complète pour les vendeurs professionnels avec le maximum de visibilité et d’avantages.', duration: '30 jours', benefits: ['Visibilité maximale', 'Priorité de mise en avant', 'Tous les avantages des formules inférieures'] }, en: { title: '👑 Max Pro', text: 'The most complete plan for professional sellers with maximum visibility and benefits.', duration: '30 days', benefits: ['Maximum visibility', 'Priority featured placement', 'All lower-tier benefits'] } }
};

const money = new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: SOUKIS_PRICING.currency, maximumFractionDigits: 0 });
const getLang = () => document.getElementById('lang')?.value || 'ar';
const benefitsMarkup = benefits => `<ul style="margin:14px 0 0;padding-inline-start:22px;display:grid;gap:7px">${benefits.map(item => `<li>${item}</li>`).join('')}</ul>`;

async function startCheckout(plan, openModal) {
  const lang = getLang();
  const copy = plans[plan][lang] || plans[plan].ar;
  const ui = lang === 'fr' ? { pay:'Paiement', loading:'Création du paiement…', failed:'Impossible de créer le paiement.' } : lang === 'en' ? { pay:'Payment', loading:'Creating payment…', failed:'Could not create the payment.' } : { pay:'الدفع', loading:'جارٍ إنشاء عملية الدفع…', failed:'تعذر إنشاء عملية الدفع.' };
  const { data: { user } } = await db.auth.getUser();
  if (!user) { openModal(`<h2>${copy.title}</h2><p class="msg">${lang === 'fr' ? 'Connectez-vous d’abord.' : lang === 'en' ? 'Please sign in first.' : 'سجّل الدخول أولًا.'}</p>`); return; }
  openModal(`<h2>${ui.pay}</h2><p class="msg">${ui.loading}</p>`);
  const { data: paymentId, error } = await db.rpc('create_seller_pending_payment', { p_plan: plan });
  if (error || !paymentId) { openModal(`<h2>${ui.pay}</h2><p class="msg">${ui.failed}</p>`); return; }
  const { data, error: checkoutError } = await db.functions.invoke('seller-chargily-checkout-v2', { body: { payment_id: paymentId, payment_method: 'edahabia' } });
  if (checkoutError || !data?.checkout_url) { openModal(`<h2>${ui.pay}</h2><p class="msg">${ui.failed}</p>`); return; }
  window.location.href = data.checkout_url;
}

export function installMonetization({ openModal }) {
  const bar = document.querySelector('.userbar');
  if (!bar || bar.querySelector('#boostBtn')) return;
  const makeButton = (id, key) => { const btn = document.createElement('button'); btn.id=id; btn.className='pill'; btn.dataset.monetization=key; const render=()=>{const lang=getLang(),copy=plans[key][lang]||plans[key].ar,pricing=SOUKIS_PRICING.plans[key];btn.textContent=`${copy.title} · ${money.format(pricing.price)}`;}; render(); btn.addEventListener('click',()=>{const lang=getLang(),copy=plans[key][lang]||plans[key].ar,pricing=SOUKIS_PRICING.plans[key];const title=lang==='fr'?'Avantages inclus':lang==='en'?'Included benefits':'المزايا المشمولة';openModal(`<h2>${copy.title}</h2><p class="msg">${copy.text}</p><div style="margin-top:14px;font-weight:900;font-size:20px">${money.format(pricing.price)}</div><p style="margin-top:4px;color:var(--muted)">${copy.duration}</p><h3 style="margin-top:18px">${title}</h3>${benefitsMarkup(copy.benefits)}<button type="button" class="blue" id="sellerPlanPay" style="margin-top:18px">${lang==='fr'?'Payer avec Chargily':lang==='en'?'Pay with Chargily':'الدفع عبر Chargily'}</button>`); document.getElementById('sellerPlanPay')?.addEventListener('click',()=>startCheckout(key,openModal));}); return btn; };
  bar.append(makeButton('boostBtn','boost'),makeButton('premiumBtn','premium'),makeButton('maxBtn','max'),makeButton('maxProBtn','max_pro'));
  const updateLabels=()=>{bar.querySelectorAll('[data-monetization]').forEach(btn=>{const key=btn.dataset.monetization,lang=getLang(),copy=plans[key][lang]||plans[key].ar,pricing=SOUKIS_PRICING.plans[key];btn.textContent=`${copy.title} · ${money.format(pricing.price)}`;});};
  document.getElementById('lang')?.addEventListener('change',updateLabels); window.addEventListener('soukis:language-changed',updateLabels);
}
