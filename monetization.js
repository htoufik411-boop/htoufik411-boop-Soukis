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

  bar.append(makeButton('boostBtn', 'boost'), makeButton('premiumBtn', 'premium'));

  document.getElementById('lang')?.addEventListener('change', () => {
    const lang = document.getElementById('lang')?.value || 'ar';
    document.querySelector('#boostBtn').textContent = plans.boost[lang]?.title || plans.boost.ar.title;
    document.querySelector('#premiumBtn').textContent = plans.premium[lang]?.title || plans.premium.ar.title;
  });
}
