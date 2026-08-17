import { createOrderFromCart } from './orders-service.js';
import { getCurrentLanguage } from './i18n.js';

const text=(ar,fr,en)=>getCurrentLanguage()==='ar'?ar:getCurrentLanguage()==='fr'?fr:en;

export function openCheckout(openModal, closeModal) {
  openModal(`<h2>${text('تأكيد الطلب','Confirmer la commande','Confirm order')}</h2><form id="checkoutForm" class="form"><input name="shippingName" required placeholder="${text('الاسم الكامل','Nom complet','Full name')}"><input name="shippingPhone" required placeholder="${text('رقم الهاتف','Téléphone','Phone number')}"><textarea name="shippingAddress" required placeholder="${text('عنوان التوصيل','Adresse de livraison','Delivery address')}"></textarea><button class="blue" type="submit">${text('تأكيد الطلب','Confirmer la commande','Confirm order')}</button><p id="checkoutMessage" class="msg" hidden></p></form>`);
  const form=document.getElementById('checkoutForm');
  form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type="submit"]');const message=document.getElementById('checkoutMessage');button.disabled=true;const values=Object.fromEntries(new FormData(form));const result=await createOrderFromCart(values);button.disabled=false;message.hidden=false;if(result.ok){message.textContent=`${text('تم إنشاء الطلب','Commande créée','Order created')} #${result.order.id}`;form.reset();window.dispatchEvent(new CustomEvent('soukis:order-created',{detail:result.order}));setTimeout(closeModal,900);}else{message.textContent=result.reason==='empty_cart'?text('السلة فارغة.','Le panier est vide.','Your cart is empty.'):text('تعذر إنشاء الطلب. حاول مرة أخرى.','Impossible de créer la commande. Réessayez.','Could not create the order. Please try again.');}});
}
