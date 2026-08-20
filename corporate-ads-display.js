import { db } from './supabase.js';
import { getCurrentLanguage } from './i18n.js';

const copy = {
  ar: { sponsored: 'إعلان مدفوع', visit: 'زيارة الإعلان' },
  fr: { sponsored: 'Publicité sponsorisée', visit: 'Voir l’annonce' },
  en: { sponsored: 'Sponsored ad', visit: 'View ad' }
};
const lang = () => getCurrentLanguage?.() || 'ar';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function card(ad) {
  const c = copy[lang()] || copy.ar;
  const title = esc(ad.ad_title || ad.company_name || 'Soukis');
  const description = esc(ad.ad_description || '');
  const image = esc(ad.creative_url || '');
  const url = esc(ad.destination_url || '#');
  return `<article class="corporate-ad-card"><div class="corporate-ad-label">${c.sponsored}</div>${image ? `<img src="${image}" alt="${title}" loading="lazy" onerror="this.remove()">` : ''}<div class="corporate-ad-content"><small>${esc(ad.company_name || 'Soukis')}</small><h3>${title}</h3>${description ? `<p>${description}</p>` : ''}${url !== '#' ? `<a class="blue corporate-ad-link" href="${url}" target="_blank" rel="noopener noreferrer sponsored">${c.visit}</a>` : ''}</div></article>`;
}

function mount(id, ads) {
  const host = document.getElementById(id);
  if (!host) return;
  host.innerHTML = ads.length ? `<div class="corporate-ads-grid">${ads.map(card).join('')}</div>` : '';
  host.hidden = !ads.length;
}

export async function installCorporateAdsDisplay() {
  if (window.__soukisCorporateAdsDisplay) return;
  window.__soukisCorporateAdsDisplay = true;
  const load = async () => {
    try {
      const [home, top, feed] = await Promise.all([
        db.rpc('get_active_corporate_ads', { p_placement: 'homepage' }),
        db.rpc('get_active_corporate_ads', { p_placement: 'top_banner' }),
        db.rpc('get_active_corporate_ads', { p_placement: 'listing_feed' })
      ]);
      if (home.error) console.error('[Soukis] homepage ads failed', home.error);
      if (top.error) console.error('[Soukis] top banner ads failed', top.error);
      if (feed.error) console.error('[Soukis] feed ads failed', feed.error);
      mount('corporateAdsHomepage', home.data || []);
      mount('corporateAdsTop', top.data || []);
      mount('corporateAdsFeed', feed.data || []);
    } catch (error) { console.error('[Soukis] corporate ads display failed', error); }
  };
  await load();
  window.addEventListener('soukis:language-changed', load);
}
