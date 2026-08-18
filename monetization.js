import { SOUKIS_PRICING } from './pricing.js';

const plans = {
  boost: {
    ar: { title: '🚀 Boost', text: 'ارفع منتجك إلى موضع أكثر بروزًا ليشاهده عدد أكبر من المشترين.', duration: '7 أيام', benefits: ['رفع ظهور إعلان واحد', 'تفعيل الترويج لمدة 7 أيام'] },
    fr: { title: '🚀 Boost', text: 'Mettez votre produit davantage en avant pour toucher plus d’acheteurs.', duration: '7 jours', benefits: ['Mise en avant d’une annonce', 'Promotion pendant 7 jours'] },
    en: { title: '🚀 Boost', text: 'Give your product more visibility so more buyers can discover it.', duration: '7 days', benefits: ['Boost one listing', 'Promotion for 7 days'] }
  },
  premium: {
    ar: { title: '⭐ Premium', text: 'مزايا متقدمة للبائعين مع ظهور أفضل وأدوات إضافية للنمو.', duration: '15 يومًا', benefits: ['ظهور أفضل للإعلانات', 'إبراز المنتجات', 'أدوات نمو إضافية'] },
    fr: { title: '⭐ Premium', text: 'Des avantages avancés pour les vendeurs avec plus de visibilité et des outils de croissance.', duration: '15 jours', benefits: ['Meilleure visibilité', 'Annonces mises en avant', 'Outils de croissance supplémentaires'] },
    en: { title: '⭐ Premium', text: 'Advanced seller benefits with better visibility and extra growth tools.', duration: '15 days', benefits: ['Better listing visibility', 'Featured listings', 'Additional growth tools'] }
  },
  max: {
    ar: { title: '🔥 Max', text: 'باقة أقوى للبائعين النشطين مع ظهور أعلى ومزايا نمو متقدمة.', duration: '21 يومًا', benefits: ['ظهور أعلى من Premium', 'إبراز أقوى للمنتجات', 'أدوات بائع متقدمة'] },
    fr: { title: '🔥 Max', text: 'Une formule plus puissante pour les vendeurs actifs avec davantage de visibilité et d’outils.', duration: '21 jours', benefits: ['Visibilité supérieure à Premium', 'Mise en avant renforcée', 'Outils vendeur avancés'] },
    en: { title: '🔥 Max', text: 'A stronger plan for active sellers with higher visibility and advanced seller tools.', duration: '21 days', benefits: ['Higher visibility than Premium', 'Stronger featured placement', 'Advanced seller tools'] }
  },
  max_pro: {
    ar: { title: '👑 Max Pro', text: 'أعلى باقة للبائعين المحترفين مع أقصى مستوى من الظهور والمزايا.', duration: '30 يومًا', benefits: ['أقصى مستوى من الظهور', 'أولوية في إبراز المنتجات', 'جميع مزايا الباقات الأدنى'] },
    fr: { title: '👑 Max Pro', text: 'La formule la plus complète pour les vendeurs professionnels avec le maximum de visibilité et d’avantages.', duration: '30 jours', benefits: ['Visibilité maximale', 'Priorité de mise en avant', 'Tous les avantages des formules inférieures'] },
    en: { title: '👑 Max Pro', text: 'The most complete plan for professional sellers with maximum visibility and benefits.', duration: '30 days', benefits: ['Maximum visibility', 'Priority featured placement', 'All lower-tier benefits'] }
  }
};

const money = new Intl.NumberFormat('fr-DZ', {
  style: 'currency',
  currency: SOUKIS_PRICING.currency,
  maximumFractionDigits: 0
});

function getPlanSummary(key, lang) {
  const copy = plans[key][lang] || plans[key].ar;
  const pricing = SOUKIS_PRICING.plans[key];
  return `${money.format(pricing.price)} · ${copy.duration}`;
}

function getBenefitsMarkup(benefits) {
  return `<ul style="margin:14px 0 0;padding-inline-start:22px;display:grid;gap:7px">${benefits.map(item => `<li>${item}</li>`).join('')}</ul>`;
}

export function installMonetization({ openModal }) {
  const bar = document.querySelector('.userbar');
  if (!bar || bar.querySelector('#boostBtn')) return;

  const makeButton = (id, key) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'pill';
    btn.dataset.monetization = key;
    btn.textContent = `${plans[key].ar.title} · ${getPlanSummary(key, 'ar')}`;
    btn.addEventListener('click', () => {
      const lang = document.getElementById('lang')?.value || 'ar';
      const copy = plans[key][lang] || plans[key].ar;
      const pricing = SOUKIS_PRICING.plans[key];
      const price = money.format(pricing.price);
      const paymentMessage = lang === 'fr'
        ? 'Le paiement sera activé après connexion d’un fournisseur de paiement officiel.'
        : lang === 'en'
          ? 'Payment will be enabled after an official payment provider is connected.'
          : 'سيتم تفعيل الدفع بعد ربط مزود دفع رسمي.';
      const benefitsTitle = lang === 'fr' ? 'Avantages inclus' : lang === 'en' ? 'Included benefits' : 'المزايا المشمولة';
      openModal(`<h2>${copy.title}</h2><p class="msg">${copy.text}</p><div style="margin-top:14px;font-weight:900;font-size:20px">${price}</div><p style="margin-top:4px;color:var(--muted)">${copy.duration}</p><h3 style="margin-top:18px">${benefitsTitle}</h3>${getBenefitsMarkup(copy.benefits)}<p style="margin-top:16px;color:var(--muted)">${paymentMessage}</p>`);
    });
    return btn;
  };

  bar.append(
    makeButton('boostBtn', 'boost'),
    makeButton('premiumBtn', 'premium'),
    makeButton('maxBtn', 'max'),
    makeButton('maxProBtn', 'max_pro')
  );

  const updateLabels = () => {
    const lang = document.getElementById('lang')?.value || 'ar';
    for (const [id, key] of [['boostBtn','boost'],['premiumBtn','premium'],['maxBtn','max'],['maxProBtn','max_pro']]) {
      const button = document.getElementById(id);
      if (button) button.textContent = `${plans[key][lang]?.title || plans[key].ar.title} · ${getPlanSummary(key, lang)}`;
    }
  };

  document.getElementById('lang')?.addEventListener('change', updateLabels);
  window.addEventListener('soukis:language-changed', updateLabels);
}
