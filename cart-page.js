import { getCart } from './cart-ui.js';
import { getCurrentLanguage } from './i18n.js';

const TEXT = {
  ar: { loading: 'جاري تحميل السلة…', login: 'يرجى تسجيل الدخول لعرض السلة.', empty: 'السلة فارغة.', fallback: 'منتج' },
  fr: { loading: 'Chargement du panier…', login: 'Veuillez vous connecter pour afficher votre panier.', empty: 'Votre panier est vide.', fallback: 'Produit' },
  en: { loading: 'Loading cart…', login: 'Please sign in to view your cart.', empty: 'Your cart is empty.', fallback: 'Product' }
};

export async function renderCart(container) {
  if (!container) return;
  const lang = getCurrentLanguage();
  const t = TEXT[lang] || TEXT.ar;
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
  container.innerHTML = `<p>${t.loading}</p>`;

  const result = await getCart();
  if (!result.ok) {
    container.innerHTML = `<p>${t.login}</p>`;
    return;
  }

  if (!result.items.length) {
    container.innerHTML = `<p>${t.empty}</p>`;
    return;
  }

  const rows = result.items.map(({ listing, quantity }) => {
    const product = Array.isArray(listing) ? listing[0] : listing;
    const title = product?.title || product?.name || t.fallback;
    const price = Number(product?.price || 0);
    const currency = product?.currency || 'DA';
    return `<article class="cart-item" data-listing-id="${escapeHtml(product?.id || '')}"><strong>${escapeHtml(title)}</strong><span>${price.toLocaleString(locale)} ${escapeHtml(currency)} × ${quantity}</span></article>`;
  }).join('');

  container.innerHTML = `<section class="cart-list">${rows}</section>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}
