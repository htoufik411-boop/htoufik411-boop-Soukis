import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);
let listings = [];

export function installProductsUI() {
  const grid = document.querySelector('#grid');
  if (!grid) return;
  const search = document.querySelector('#search');
  const category = document.querySelector('#category');
  const sort = document.querySelector('#sort');
  const count = document.querySelector('#count');

  const render = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let items = listings.filter(p => {
      const text = [p.title, p.name, p.category, p.description, p.location, p.city].filter(Boolean).join(' ').toLowerCase();
      return (!q || text.includes(q)) && (!category?.value || category.value === p.category);
    });
    if (sort?.value === 'price-asc') items.sort((a,b) => Number(a.price||0)-Number(b.price||0));
    if (sort?.value === 'price-desc') items.sort((a,b) => Number(b.price||0)-Number(a.price||0));
    if (sort?.value === 'oldest') items.sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
    else if (sort?.value !== 'price-asc' && sort?.value !== 'price-desc') items.sort((a,b) => new Date(b.created_at||0)-new Date(a.created_at||0));
    if (count) count.textContent = `${items.length} منتج`;
    grid.innerHTML = items.length ? items.map(card).join('') : '<div class="empty">لا توجد منتجات مطابقة حاليًا.</div>';
  };

  search?.addEventListener('input', render);
  category?.addEventListener('change', render);
  sort?.addEventListener('change', render);
  window.addEventListener('soukis:listing-created', () => load().then(render));
  load().then(render);

  async function load() {
    grid.innerHTML = '<div class="empty">جاري تحميل المنتجات…</div>';
    const { data, error } = await supabase.from('listings').select('*').order('created_at', { ascending: false });
    if (error) { grid.innerHTML = '<div class="empty">تعذر تحميل المنتجات. تحقق من صلاحيات جدول listings في Supabase.</div>'; return; }
    listings = data || [];
    fillFilters();
  }

  function fillFilters() {
    const categories = [...new Set(listings.map(p => p.category).filter(Boolean))].sort();
    if (category) category.innerHTML = '<option value="">كل الفئات</option>' + categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (sort) sort.innerHTML = '<option value="">الأحدث</option><option value="price-asc">السعر: من الأقل</option><option value="price-desc">السعر: من الأعلى</option><option value="oldest">الأقدم</option>';
    const cats = document.querySelector('#cats');
    if (cats) cats.innerHTML = categories.slice(0, 12).map(c => `<button class="cat" data-cat="${esc(c)}"><i>▦</i>${esc(c)}</button>`).join('');
    cats?.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { if (category) { category.value=b.dataset.cat; category.dispatchEvent(new Event('change')); document.querySelector('#products')?.scrollIntoView({behavior:'smooth'}); } }));
  }
}

function card(p) {
  const id = esc(p.id);
  const title = esc(p.title || p.name || 'منتج');
  const category = esc(p.category || 'عام');
  const location = esc(p.location || p.city || '');
  const price = Number(p.price || 0).toLocaleString('fr-DZ');
  const image = p.image_url || p.image || '';
  return `<article class="product"><div class="pic">${image ? `<img src="${esc(image)}" alt="${title}" loading="lazy">` : '<span class="emoji">🛍️</span>'}</div><div class="body"><small>${category}</small><h3>${title}</h3><div class="price">${price} DA</div><div class="loc">${location}</div><button class="cart" data-add-listing="${id}" data-listing-id="${id}">🛒 أضف إلى السلة</button></div></article>`;
}
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
