import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';
import { getCurrentLanguage } from './i18n.js';

const supabase=createClient(SOUKIS_CONFIG.supabaseUrl,SOUKIS_CONFIG.supabasePublishableKey);
const text=(ar,fr,en)=>getCurrentLanguage()==='ar'?ar:getCurrentLanguage()==='fr'?fr:en;

export async function openMyProducts(openModal,closeModal){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){openModal(`<h2>${text('منتجاتي','Mes produits','My products')}</h2><p class="msg">${text('سجّل الدخول أولًا.','Connectez-vous d’abord.','Please sign in first.')}</p>`);return;}
  openModal(`<h2>${text('منتجاتي','Mes produits','My products')}</h2><p class="msg">${text('جاري التحميل…','Chargement…','Loading…')}</p>`);
  const {data,error}=await supabase.from('listings').select('id,title,price,currency,category,location,image_url,description,created_at,status').eq('user_id',user.id).order('created_at',{ascending:false});
  if(error){openModal(`<h2>${text('منتجاتي','Mes produits','My products')}</h2><p class="msg">${text('تعذر تحميل منتجاتك.','Impossible de charger vos produits.','Could not load your products.')}</p>`);return;}
  if(!data?.length){openModal(`<h2>${text('منتجاتي','Mes produits','My products')}</h2><div class="empty">${text('لم تنشر أي منتج بعد.','Vous n’avez encore publié aucun produit.','You have not published any products yet.')}</div>`);return;}
  const locale=getCurrentLanguage()==='ar'?'ar-DZ':getCurrentLanguage()==='fr'?'fr-FR':'en-US';
  const cards=data.map(p=>`<article class="msg my-product" data-id="${esc(p.id)}" style="margin-top:10px"><div style="display:flex;gap:12px;align-items:center"><div style="width:72px;height:72px;border-radius:12px;overflow:hidden;background:#f1f5f9;display:grid;place-items:center;flex:none">${p.image_url?`<img src="${esc(p.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover">`:'🛍️'}</div><div style="min-width:0;flex:1"><strong>${esc(p.title)}</strong><div>${Number(p.price||0).toLocaleString(locale)} ${esc(p.currency||'DA')}</div><small>${esc(p.category||'')} ${p.location?'· '+esc(p.location):''}</small></div></div><button class="dark my-delete" style="margin-top:10px;width:100%">${text('حذف المنتج','Supprimer le produit','Delete product')}</button></article>`).join('');
  openModal(`<h2>${text('منتجاتي','Mes produits','My products')}</h2>${cards}`);
  document.querySelectorAll('.my-delete').forEach(btn=>btn.addEventListener('click',async()=>{const card=btn.closest('.my-product');const id=card?.dataset.id;if(!id||!confirm(text('هل تريد حذف هذا المنتج؟','Supprimer ce produit ?','Delete this product?')))return;btn.disabled=true;const {error}=await supabase.from('listings').delete().eq('id',id).eq('user_id',user.id);if(error){btn.disabled=false;alert(text('تعذر حذف المنتج.','Impossible de supprimer le produit.','Could not delete the product.'));return;}card.remove();if(!document.querySelector('.my-product'))openModal(`<h2>${text('منتجاتي','Mes produits','My products')}</h2><div class="empty">${text('لم تنشر أي منتج بعد.','Vous n’avez encore publié aucun produit.','You have not published any products yet.')}</div>`);window.dispatchEvent(new CustomEvent('soukis:listings-changed'));}));
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
