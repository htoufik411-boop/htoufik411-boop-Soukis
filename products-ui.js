import { db } from './supabase.js';
import { getCurrentLanguage } from './i18n.js';

let listings=[];let categories=[];let cities=[];
const text=(ar,fr,en)=>getCurrentLanguage()==='ar'?ar:getCurrentLanguage()==='fr'?fr:en;
const locale=()=>getCurrentLanguage()==='ar'?'ar-DZ':getCurrentLanguage()==='fr'?'fr-FR':'en-US';
const currencyLabel=()=>getCurrentLanguage()==='ar'?'دج':'DZD';
const label=row=>{const lang=getCurrentLanguage();return lang==='ar'?(row?.name_ar||row?.name_en||''):lang==='fr'?(row?.name_fr||row?.name_en||''):(row?.name_en||'');};
const categoryLabel=p=>p.category_id?(label(categories.find(c=>String(c.id)===String(p.category_id)))||p.category||''):p.category||'';
const cityLabel=p=>p.city_id?(label(cities.find(c=>String(c.id)===String(p.city_id)))||p.city||''):p.city||p.location||'';
const isActivePromotion=p=>p.featured===true&&p.promoted_until&&new Date(p.promoted_until)>new Date();
const promoRank=p=>{if(!isActivePromotion(p))return 0;return({boost:1,premium:2,max:3,max_pro:4}[p.promotion_type]||1);};
const promoText=p=>({boost:'🚀 Boost',premium:'⭐ Premium',max:'👑 Max',max_pro:'💎 Max Pro'}[p.promotion_type]||'');
let installed=false;
let loadGeneration=0;

export function installProductsUI(){
 if(installed)return;
 const grid=document.querySelector('#grid');if(!grid)return;
 installed=true;
 const search=document.querySelector('#search'),category=document.querySelector('#category'),sort=document.querySelector('#sort'),count=document.querySelector('#count');
 const render=()=>{
  const q=(search?.value||'').trim().toLowerCase();
  let items=listings.filter(p=>{const cat=categoryLabel(p),city=cityLabel(p);const value=[p.title,p.name,cat,p.description,city,p.location].filter(Boolean).join(' ').toLowerCase();return(!q||value.includes(q))&&(!category?.value||category.value===String(p.category_id||p.category||''));});
  if(sort?.value==='price-asc')items.sort((a,b)=>Number(a.price||0)-Number(b.price||0));
  else if(sort?.value==='price-desc')items.sort((a,b)=>Number(b.price||0)-Number(a.price||0));
  else if(sort?.value==='oldest')items.sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
  else items.sort((a,b)=>promoRank(b)-promoRank(a)||new Date(b.created_at||0)-new Date(a.created_at||0));
  if(count)count.textContent=text(`${items.length} منتج`,`${items.length} produit${items.length>1?'s':''}`,`${items.length} product${items.length===1?'':'s'}`);
  grid.innerHTML=items.length?items.map(card).join(''):`<div class="empty">${text('لا توجد منتجات مطابقة حاليًا.','Aucun produit correspondant.','No matching products found.')}</div>`;
 };
 search?.addEventListener('input',render);category?.addEventListener('change',render);sort?.addEventListener('change',render);
 window.addEventListener('soukis:listing-created',()=>load().then(render));window.addEventListener('soukis:listings-changed',()=>load().then(render));window.addEventListener('soukis:promotion-changed',()=>load().then(render));window.addEventListener('soukis:language-changed',()=>{fillFilters(true);render();});
 load().then(render);
 async function load(){
  const generation=++loadGeneration;
  grid.innerHTML=`<div class="empty">${text('جاري تحميل المنتجات…','Chargement des produits…','Loading products…')}</div>`;
  const [listingResult,catResult,cityResult]=await Promise.all([db.from('listings').select('*').order('created_at',{ascending:false}),db.from('categories').select('id,name_ar,name_fr,name_en').order('name_en'),db.from('cities').select('id,name_ar,name_fr,name_en').order('name_en')]);
  if(generation!==loadGeneration)return;
  if(listingResult.error){console.error('Soukis listings load failed:',listingResult.error);grid.innerHTML=`<div class="empty">${text('تعذر تحميل المنتجات. تحقق من إعدادات Supabase.','Impossible de charger les produits. Vérifiez Supabase.','Could not load products. Check Supabase settings.')}`;return;}
  listings=listingResult.data||[];categories=catResult.data||[];cities=cityResult.data||[];fillFilters(false);
 }
 function fillFilters(preserve){
  const oldCategory=category?.value||'',oldSort=sort?.value||'';
  if(category)category.innerHTML=`<option value="">${text('كل الفئات','Toutes les catégories','All categories')}</option>`+categories.map(c=>`<option value="${esc(c.id)}">${esc(label(c))}</option>`).join('');
  if(sort)sort.innerHTML=`<option value="">${text('الأحدث','Les plus récents','Newest')}</option><option value="price-asc">${text('السعر: من الأقل','Prix : croissant','Price: low to high')}</option><option value="price-desc">${text('السعر: من الأعلى','Prix : décroissant','Price: high to low')}</option><option value="oldest">${text('الأقدم','Les plus anciens','Oldest')}</option>`;
  if(preserve){if(category)category.value=oldCategory;if(sort&&['','price-asc','price-desc','oldest'].includes(oldSort))sort.value=oldSort;}
  const cats=document.querySelector('#cats');
  if(cats){cats.innerHTML=categories.slice(0,12).map(c=>`<button class="cat" data-cat="${esc(c.id)}"><i>▦</i>${esc(label(c))}</button>`).join('');cats.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{if(category){category.value=b.dataset.cat;category.dispatchEvent(new Event('change'));document.querySelector('#products')?.scrollIntoView({behavior:'smooth'});}}));}
 }
}
function card(p){const id=esc(p.id),title=esc(p.title||p.name||text('منتج','Produit','Product')),cat=esc(categoryLabel(p)||text('عام','Général','General')),location=esc(cityLabel(p)),price=Number(p.price||0).toLocaleString(locale()),currency=esc(currencyLabel()),image=esc(p.image_url||p.image||''),active=isActivePromotion(p),badge=active?`<span class="promo-badge" title="${esc(promoText(p))}">${esc(promoText(p))}</span>`:'';return `<article class="product${active?' promoted promoted-'+esc(p.promotion_type):''}"><div class="pic">${badge}${image?`<img src="${image}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.closest('.pic').innerHTML='<span class=\"emoji\">🛍️</span>'">`:'<span class="emoji">🛍️</span>'}</div><div class="body"><small>${cat}</small><h3>${title}</h3><div class="price">${price} ${currency}</div><div class="loc">${location}</div><button type="button" class="cart" data-add-listing="${id}" data-listing-id="${id}">🛒 ${text('أضف إلى السلة','Ajouter au panier','Add to cart')}</button></div></article>`;}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
