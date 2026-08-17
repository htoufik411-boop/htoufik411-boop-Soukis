import { openMyOrders } from './user-orders-panel.js';
import { renderAdminPanel } from './admin-panel.js';
import { openSellModal } from './sell-ui.js';

export function installSoukisIntegration({ openModal, closeModal }) {
  if (document.documentElement.dataset.soukisIntegrationInstalled === 'true') return;
  document.documentElement.dataset.soukisIntegrationInstalled = 'true';

  document.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-soukis-action]');
    const adminButton = event.target.closest('#admin');
    const sellButton = event.target.closest('#sellBtn, #heroSell');
    const button = actionButton || adminButton || sellButton;
    if (!button) return;

    const action = actionButton ? button.dataset.soukisAction
      : adminButton ? 'admin'
      : 'sell';

    event.preventDefault();
    event.stopImmediatePropagation();

    if (action === 'my-orders') await openMyOrders(openModal);
    if (action === 'sell') await openSellModal(openModal, closeModal);
    if (action === 'admin') {
      openModal('<h2>Admin</h2><div id="adminPanel" class="form"></div>');
      const panel = document.getElementById('adminPanel');
      if (panel) await renderAdminPanel(panel);
    }
  });
}
