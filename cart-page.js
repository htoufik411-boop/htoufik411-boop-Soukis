import { getCart } from './cart-ui.js';

export async function renderCart(container) {
  if (!container) return;
  container.innerHTML = '<p>جاري تحميل السلة…</p>';

  const result = await getCart();
  if (!result.ok) {
    container.innerHTML = '<p>يرجى تسجيل الدخول لعرض السلة.</p>';
    return;
  }

  if (!result.items.length) {
    container.innerHTML = '<p>السلة فارغة.</p>';
    return;
  }

  const rows = result.items.map(({ listing, quantity }) => {
    const product = Array.isArray(listing) ? listing[0] : listing;
    const title = product?.title || product?.name || 'Produit';
    const price = Number(product?.price || 0);
    return `<article class="cart-item" data-listing-id="${product?.id || ''}"><strong>${escapeHtml(title)}</strong><span>${price.toLocaleString('fr-DZ')} DA × ${quantity}</span></article>`;
  }).join('');

  container.innerHTML = `<section class="cart-list">${rows}</section>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}
