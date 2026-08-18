import { addToCart, getCart } from './cart-ui.js';

async function addListingToRemoteCart(listingId) {
  const result = await addToCart(listingId, 1);
  if (!result.ok) {
    if (result.reason === 'auth_required') {
      window.dispatchEvent(new CustomEvent('soukis:auth-required'));
    }
    return false;
  }

  const cart = await getCart();
  if (cart.ok) {
    const total = cart.items.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const badge = document.querySelector('#cartCount');
    if (badge) badge.textContent = String(total);
  }
  return true;
}

// Capture the existing .cart click before index.html's localStorage handler runs.
document.addEventListener('click', async event => {
  const button = event.target.closest('.cart');
  if (!button) return;
  const card = button.closest('.product');
  const listingId = card?.dataset?.id || button.dataset.listingId;
  if (!listingId) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  button.disabled = true;
  try {
    const ok = await addListingToRemoteCart(listingId);
    if (ok) {
      const old = button.textContent;
      button.textContent = '✓ تمت الإضافة';
      setTimeout(() => { button.textContent = old; }, 1400);
    }
  } catch (error) {
    console.error('Soukis cart error:', error);
    window.dispatchEvent(new CustomEvent('soukis:cart-error', { detail: error }));
  } finally {
    button.disabled = false;
  }
}, true);
