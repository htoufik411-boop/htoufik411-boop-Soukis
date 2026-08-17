import { openCheckout } from './order-checkout.js';
import { openMyOrders } from './user-orders-panel.js';
import { renderAdminPanel } from './admin-panel.js';

export function installSoukisIntegration({ openModal, closeModal }) {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-soukis-action]');
    if (!button) return;
    const action = button.dataset.soukisAction;
    if (action === 'checkout') await openCheckout(openModal, closeModal);
    if (action === 'my-orders') await openMyOrders(openModal);
    if (action === 'admin') {
      openModal('<h2>Admin</h2><div id="adminPanel" class="form"></div>');
      await renderAdminPanel(document.getElementById('adminPanel'));
    }
  });
}
