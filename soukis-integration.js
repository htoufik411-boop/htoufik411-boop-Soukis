import { openCheckout } from './order-checkout.js';
import { openMyOrders } from './user-orders-panel.js';
import { renderAdminPanel } from './admin-panel.js';
import { openSellModal } from './sell-ui.js';

export function installSoukisIntegration({ openModal, closeModal, refreshProducts }) {
  if (document.documentElement.dataset.soukisIntegrationInstalled === 'true') return;
  document.documentElement.dataset.soukisIntegrationInstalled = 'true';

  document.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-soukis-action]');
    const adminButton = event.target.closest('#admin');
    const sellButton = event.target.closest('#sellBtn, #heroSell');
    const cartButton = event.target.closest('#cartBtn');
    const button = actionButton || adminButton || sellButton || cartButton;
    if (!button) return;

    const action = actionButton ? button.dataset.soukisAction
      : adminButton ? 'admin'
      : sellButton ? 'sell'
      : 'cart';
    event.preventDefault();

    if (action === 'checkout') await openCheckout(openModal, closeModal);
    if (action === 'my-orders') await openMyOrders(openModal);
    if (action === 'sell') await openSellModal(openModal, closeModal, refreshProducts);
    if (action === 'cart') await openCheckout(openModal, closeModal);
    if (action === 'admin') {
      openModal('<h2>Admin</h2><div id="adminPanel" class="form"></div>');
      const panel = document.getElementById('adminPanel');
      if (panel) await renderAdminPanel(panel);
    }
  });
}
