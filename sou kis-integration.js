import { openCheckout } from './order-checkout.js';
import { openMyOrders } from './user-orders-panel.js';
import { renderAdminPanel } from './admin-panel.js';

export function installSoukisIntegration({ openModal, closeModal }) {
  const admin = document.getElementById('admin');
  const cart = document.getElementById('cartBtn');
  const userbar = document.querySelector('.userbar');

  if (admin && !admin.dataset.soukisBound) {
    admin.dataset.soukisBound = 'true';
    admin.addEventListener('click', async () => {
      openModal('<h2>Admin</h2><div id="adminPanel" class="form"></div>');
      await renderAdminPanel(document.getElementById('adminPanel'));
    });
  }

  if (cart && !cart.dataset.soukisBound) {
    cart.dataset.soukisBound = 'true';
    cart.addEventListener('click', () => {
      setTimeout(() => {
        const body = document.getElementById('modalBody');
        if (!body || body.querySelector('[data-soukis-checkout]')) return;
        const button = document.createElement('button');
        button.className = 'blue';
        button.textContent = 'تأكيد الطلب';
        button.dataset.soukisCheckout = 'true';
        button.onclick = () => openCheckout(openModal, closeModal);
        body.appendChild(button);
      }, 50);
    });
  }

  if (userbar && !userbar.querySelector('[data-soukis-orders]')) {
    const button = document.createElement('button');
    button.textContent = '📦 طلباتي';
    button.dataset.soukisOrders = 'true';
    button.onclick = () => openMyOrders(openModal);
    userbar.appendChild(button);
  }
}
