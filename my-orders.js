import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';
import { getCurrentLanguage } from './i18n.js';

const supabase=createClient(SOUKIS_CONFIG.supabaseUrl,SOUKIS_CONFIG.supabasePublishableKey);
const text=(ar,fr,en)=>getCurrentLanguage()==='ar'?ar:getCurrentLanguage()==='fr'?fr:en;
const locale=()=>getCurrentLanguage()==='ar'?'ar-DZ':getCurrentLanguage()==='fr'?'fr-FR':'en-US';
const statusLabel=s=>({pending:text('قيد الانتظار','En attente','Pending'),confirmed:text('مؤكد','Confirmée','Confirmed'),shipped:text('تم الشحن','Expédiée','Shipped'),completed:text('مكتمل','Terminée','Completed'),cancelled:text('ملغى','Annulée','Cancelled')}[s]||s||text('قيد الانتظار','En attente','Pending'));

export async function getMyOrders(){const {data:{user}}=await supabase.auth.getUser();if(!user)return{ok:false,reason:'auth_required',orders:[]};const{data,error}=await supabase.from('orders').select('id,status,total,currency,shipping_name,shipping_phone,shipping_address,created_at,order_items(id,listing_id,title,quantity,unit_price,listings(title,name))').eq('user_id',user.id).order('created_at',{ascending:false});return error?{ok:false,error,orders:[]}:{ok:true,orders:data||[]};}

export function renderMyOrders(container,orders){if(!container)return;if(!orders.length){container.innerHTML=`<div class="msg">${text('لا توجد طلبات بعد.','Aucune commande pour le moment.','No orders yet.')}</div>`;return;}container.innerHTML=orders.map(order=>`<article class="msg" style="margin-bottom:10px"><strong>${text('طلب','Commande','Order')} #${escapeHtml(order.id)}</strong><div>${text('الحالة','Statut','Status')}: ${escapeHtml(statusLabel(order.status))}</div><div>${text('الإجمالي','Total','Total')}: ${Number(order.total||0).toLocaleString(locale())} ${escapeHtml(order.currency||'DA')}</div><div>${text('العنوان','Adresse','Address')}: ${escapeHtml(order.shipping_address||'')}</div></article>`).join('');}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
