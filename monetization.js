import { SOUKIS_PRICING } from './pricing.js';

const plans = {
  boost: {
    ar: { title: '🚀 Boost', text: 'ارفع منتجك إلى موضع أكثر بروزًا ليشاهده عدد أكبر من المشترين.', duration: '7 أيام' },
    fr: { title: '🚀 Boost', text: 'Mettez votre produit davantage en avant pour toucher plus d’acheteurs.', duration: '7 jours' },
    en: { title: '🚀 Boost', text: 'Give your product more visibility so more buyers can discover it.', duration: '7 days' }
  },
  premium: {
    ar: { title: '⭐ Premium', text: 'مزايا متقدمة للبائعين: إبراز المنتجات وأدوات إضافية للنمو.', duration: '15 يومًا' },
    fr: { title: '⭐ Premium', text: 'Des avantages avancés pour les vendeurs : mise en avant et outils supplémentaires.', duration: '15 jours' },
    en: { title: '⭐ Premium', text: 'Advanced seller benefits: featured listings and additional growth tools.', duration: '15 days' }
  },
  max: {
    ar: { title: '🔥 Max', text: 'باقة متقدمة للبائعين النشطين مع مزايا ظهور وأدوات نمو إضافية.', duration: '21 يومًا' },
    fr: { title: '🔥 Max', text: 'Une formule avancée pour les vendeurs actifs, avec plus de visibilité et d’outils.', duration: '21 jours' },
    en: { title: '🔥 Max', text: 'An advanced plan for active sellers with more visibility and growth tools.', duration: '21 days' }
  },
  max_pro: {
    ar: { title: '👑 Max Pro', text: 'أعلى باقة للبائعين المحترفين مع أقصى مستوى من الظهور والمزايا.', duration: '30 يومًا' },
    fr: { title: '👑 Max Pro', text: 'La formule premium pour les vendeurs professionnels, avec le maximum de visibilité et d’avantages.', duration: '30 jours' },
    en: { title: '👑 Max Pro', text: 'The top plan for professional sellers, with maximum visibility and benefits.', duration: '30 days' }
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
  const price = money.format(pricing.price);
  const duration = copy.duration;
  if (lang === 'fr') return `${price} · ${duration}`;
  if (lang === 'en') return `${price} · ${duration}`;
  return `${price} · ${duration}`;
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
      const duration = copy.duration;
      const paymentMessage = lang === 'fr'
        ? 'Le paiement sera activé après connexion d’un fournisseur de paiement officiel.'
        : lang === 'en'
          ? 'Payment will be enabled after an official payment provider is connected.'
          : 'سيتم تفعيل الدفع بعد ربط مزود دفع رسمي.';
      openModal(`<h2>${copy.title}</h2><p class="msg">${copy.text}</p><div style="margin-top:14px;font-weight:900;font-size:20px">${price}</div><p style="margin-top:4px;color:var(--muted)">${duration}</p><p style="margin-top:12px;color:var(--muted)">${paymentMessage}</p>`);
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
