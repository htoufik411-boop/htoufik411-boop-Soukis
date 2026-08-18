const plans = {
  boost: {
    ar: { title: '🚀 Boost', text: 'ارفع منتجك إلى موضع أكثر بروزًا ليشاهده عدد أكبر من المشترين.' },
    fr: { title: '🚀 Boost', text: 'Mettez votre produit davantage en avant pour toucher plus d’acheteurs.' },
    en: { title: '🚀 Boost', text: 'Give your product more visibility so more buyers can discover it.' }
  },
  premium: {
    ar: { title: '⭐ Premium', text: 'مزايا متقدمة للبائعين: إبراز المنتجات وأدوات إضافية للنمو.' },
    fr: { title: '⭐ Premium', text: 'Des avantages avancés pour les vendeurs : mise en avant et outils supplémentaires.' },
    en: { title: '⭐ Premium', text: 'Advanced seller benefits: featured listings and additional growth tools.' }
  },
  max: {
    ar: { title: '👑 Max', text: 'باقة متقدمة للبائعين النشطين مع مزايا ظهور وأدوات نمو إضافية.' },
    fr: { title: '👑 Max', text: 'Une formule avancée pour les vendeurs actifs, avec plus de visibilité et d’outils.' },
    en: { title: '👑 Max', text: 'An advanced plan for active sellers with more visibility and growth tools.' }
  },
  maxPro: {
    ar: { title: '💎 Max Pro', text: 'أعلى باقة للبائعين المحترفين مع أقصى مستوى من الظهور والمزايا.' },
    fr: { title: '💎 Max Pro', text: 'La formule premium pour les vendeurs professionnels, avec le maximum de visibilité et d’avantages.' },
    en: { title: '💎 Max Pro', text: 'The top plan for professional sellers, with maximum visibility and benefits.' }
  }
};

export function installMonetization({ openModal }) {
  const bar = document.querySelector('.userbar');
  if (!bar || bar.querySelector('#boostBtn')) return;

  const makeButton = (id, key) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'pill';
    btn.dataset.monetization = key;
    btn.textContent = plans[key].ar.title;
    btn.addEventListener('click', () => {
      const lang = document.getElementById('lang')?.value || 'ar';
      const copy = plans[key][lang] || plans[key].ar;
      openModal(`<h2>${copy.title}</h2><p class="msg">${copy.text}</p><p style="margin-top:12px;color:var(--muted)">${lang === 'fr' ? 'Le paiement et l’activation seront disponibles prochainement.' : lang === 'en' ? 'Payment and activation will be available soon.' : 'الدفع والتفعيل سيكونان متاحين قريبًا.'}</p>`);
    });
    return btn;
  };

  bar.append(
    makeButton('boostBtn', 'boost'),
    makeButton('premiumBtn', 'premium'),
    makeButton('maxBtn', 'max'),
    makeButton('maxProBtn', 'maxPro')
  );

  document.getElementById('lang')?.addEventListener('change', () => {
    const lang = document.getElementById('lang')?.value || 'ar';
    for (const [id, key] of [['boostBtn','boost'],['premiumBtn','premium'],['maxBtn','max'],['maxProBtn','maxPro']]) {
      const button = document.getElementById(id);
      if (button) button.textContent = plans[key][lang]?.title || plans[key].ar.title;
    }
  });
}
