import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const db = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

async function addListingToRemoteCart(listingId) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    window.dispatchEvent(new CustomEvent('soukis:auth-required'));
    return false;
  }

  const { error: cartError } = await db
    .from('carts')
    .upsert({ user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (cartError) throw cartError;

  const { data: existing, error: readError } = await db
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (readError) throw readError;

  if (existing) {
    const { error } = await db.from('cart_items')
      .update({ quantity: Number(existing.quantity || 0) + 1 })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await db.from('cart_items')
      .insert({ user_id: user.id, listing_id: listingId, quantity: 1 });
    if (error) throw error;
  }

  const { count, error: countError } = await db
    .from('cart_items')
    .select('quantity', { count: 'exact', head: false })
    .eq('user_id', user.id);
  if (!countError) {
    const total = (count || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const badge = document.querySelector('#cartCount');
    if (badge) badge.textContent = String(total);
  }
  return true;
}

// Capture the existing .cart click before index.html's localStorage handler runs.
document.addEventListener('click', async event => {
  const button = event.target.closest('.cart');
  if (!button) return;
  const card = button.closest('.product');
  const listingId = card?.dataset?.id || button.dataset.listingId;
  if (!listingId) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  button.disabled = true;
  try {
    const ok = await addListingToRemoteCart(listingId);
    if (ok) {
      const old = button.textContent;
      button.textContent = '✓ تمت الإضافة';
      setTimeout(() => { button.textContent = old; }, 1400);
    }
  } catch (error) {
    console.error('Soukis cart error:', error);
    window.dispatchEvent(new CustomEvent('soukis:cart-error', { detail: error }));
  } finally {
    button.disabled = false;
  }
}, true);
