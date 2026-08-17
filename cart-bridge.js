import { addToCart, getCart } from './cart-ui.js';
import { installSoukisIntegration } from './sou kis-integration.js';
import { installAdminAuthUI } from './auth-admin-ui.js';

export function installCartBridge({ buttonSelector = '.cart', listingIdAttribute = 'data-listing-id' } = {}) {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest(buttonSelector);
    if (!button) return;
    const listingId = button.getAttribute(listingIdAttribute) || button.dataset.id;
    if (!listingId) return;
    button.disabled = true;
    try {
      const result = await addToCart(listingId, 1);
      if (result.ok) {
        const cart = await getCart();
        const count = cart.ok ? cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0;
        const counter = document.querySelector('#cartCount');
        if (counter) counter.textContent = String(count);
        button.dataset.added = 'true';
        button.setAttribute('aria-label', 'Added to cart');
      } else if (result.reason === 'auth_required') {
        window.dispatchEvent(new CustomEvent('sou kis:cart-auth-required'));
      }
    } finally { button.disabled = false; }
  });

  const install = () => {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    const openModal = html => { if (body) body.innerHTML = html; if (modal) modal.hidden = false; };
    const closeModal = () => { if (modal) modal.hidden = true; };
    installSoukisIntegration({ openModal, closeModal });
    installAdminAuthUI({ openModal, closeModal });

    const adminButton = document.getElementById('admin');
    if (adminButton) {
      adminButton.dataset.soukisAction = 'admin';
      adminButton.dataset.soukisAdminBootstrap = 'true';
    }

    const cartButton = document.getElementById('cartBtn');
    if (cartButton && !cartButton.dataset.soukisBound) {
      cartButton.dataset.soukisBound = 'true';
      cartButton.addEventListener('click', () => {
        setTimeout(() => {
          if (!body || modal?.hidden || document.getElementById('checkoutButton')) return;
          const checkout = document.createElement('button');
          checkout.className = 'blue';
          checkout.textContent = 'إتمام الطلب';
          checkout.id = 'checkoutButton';
          checkout.onclick = () => window.dispatchEvent(new CustomEvent('sou kis:checkout'));
          body.appendChild(checkout);
        }, 50);
      });
    }

    if (!document.getElementById('myOrdersBtn')) {
      const ordersButton = document.createElement('button');
      ordersButton.id = 'myOrdersBtn';
      ordersButton.className = 'dark';
      ordersButton.textContent = '📦 طلباتي';
      ordersButton.dataset.soukisAction = 'my-orders';
      const userbar = document.querySelector('.userbar');
      if (userbar) userbar.insertBefore(ordersButton, userbar.querySelector('#cartBtn'));
    }

    window.addEventListener('sou kis:checkout', () => {
      document.getElementById('checkoutButton')?.remove();
      import('./order-checkout.js').then(({ openCheckout }) => openCheckout(openModal, closeModal));
    }, { once: false });
  };

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
}
