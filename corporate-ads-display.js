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
      const placements = ['homepage', 'top_banner', 'listing_feed', 'multi_placement'];
      const results = await Promise.all(
        placements.map(p_placement => db.rpc('get_active_corporate_ads', { p_placement }))
      );
      results.forEach((result, index) => {
        if (result.error) console.error(`[Soukis] ${placements[index]} ads failed`, result.error);
      });
      const [home, top, feed, multi] = results;
      mount('corporateAdsHomepage', [...(home.data || []), ...(multi.data || [])]);
      mount('corporateAdsTop', [...(top.data || []), ...(multi.data || [])]);
      mount('corporateAdsFeed', [...(feed.data || []), ...(multi.data || [])]);
    } catch (error) { console.error('[Soukis] corporate ads display failed', error); }
  };
  await load();
  window.addEventListener('soukis:language-changed', load);
}
