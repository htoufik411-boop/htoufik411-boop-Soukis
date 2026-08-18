import { openMyOrders } from './user-orders-panel.js';
import { openSellModal } from './sell-ui.js';
import { getCurrentLanguage } from './i18n.js';

const text=(ar,fr,en)=>getCurrentLanguage()==='ar'?ar:getCurrentLanguage()==='fr'?fr:en;

export function installSoukisIntegration({openModal,closeModal}){
  if(document.documentElement.dataset.soukisIntegrationInstalled==='true')return;
  document.documentElement.dataset.soukisIntegrationInstalled='true';
  document.addEventListener('click',async event=>{
    const actionButton=event.target.closest('[data-soukis-action]');
    const sellButton=event.target.closest('#sellBtn,#heroSell');
    const button=actionButton||sellButton;
    if(!button)return;
    const action=actionButton?button.dataset.soukisAction:'sell';
    event.preventDefault();event.stopImmediatePropagation();
    if(action==='my-orders')await openMyOrders(openModal);
    if(action==='sell')await openSellModal(openModal,closeModal);
  });
}
