import { addToCart, getCart } from './cart-ui.js';

export function installCartBridge({ buttonSelector = '.cart', listingIdAttribute = 'data-listing-id' } = {}) {
  if (document.documentElement.dataset.soukisCartBridgeInstalled === 'true') return;
  document.documentElement.dataset.soukisCartBridgeInstalled = 'true';

  const refreshCartCount = async () => {
    const cart = await getCart();
    const count = cart.ok
      ? cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      : 0;
    const counter = document.querySelector('#cartCount');
    if (counter) counter.textContent = String(count);
  };

  document.addEventListener('click', async (event) => {
    const button = event.target.closest(buttonSelector);
    if (!button) return;
    const listingId = button.getAttribute(listingIdAttribute) || button.dataset.id;
    if (!listingId) return;

    button.disabled = true;
    try {
      const result = await addToCart(listingId, 1);
      if (result.ok) {
        await refreshCartCount();
        button.dataset.added = 'true';
        button.setAttribute('aria-label', 'Added to cart');
      } else if (result.reason === 'auth_required') {
        window.dispatchEvent(new CustomEvent('soukis:cart-auth-required'));
      }
    } finally {
      button.disabled = false;
    }
  });

  window.addEventListener('soukis:order-created', refreshCartCount);
  refreshCartCount();
}
