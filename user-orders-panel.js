import { getMyOrders, renderMyOrders } from './my-orders.js';
import { getCurrentLanguage } from './i18n.js';

const text=(ar,fr,en)=>getCurrentLanguage()==='ar'?ar:getCurrentLanguage()==='fr'?fr:en;

export async function openMyOrders(openModal){
  openModal(`<h2>${text('طلباتي','Mes commandes','My orders')}</h2><div id="myOrdersContent" class="form"><p>${text('جاري التحميل…','Chargement…','Loading…')}</p></div>`);
  const container=document.getElementById('myOrdersContent');const result=await getMyOrders();
  if(!result.ok){container.innerHTML=`<div class="msg">${text('يرجى تسجيل الدخول لعرض طلباتك.','Connectez-vous pour voir vos commandes.','Please sign in to view your orders.')}</div>`;return;}
  renderMyOrders(container,result.orders);
}
