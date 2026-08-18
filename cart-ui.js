import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

async function getUserCart(userId) {
  const { data: cart, error } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return { cart, error };
}

export async function addToCart(listingId, quantity = 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required' };

  const safeQuantity = Number(quantity);
  if (!Number.isInteger(safeQuantity) || safeQuantity < 1) {
    return { ok: false, reason: 'invalid_quantity' };
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .maybeSingle();
  if (listingError) return { ok: false, error: listingError };
  if (!listing) return { ok: false, reason: 'listing_not_found' };

  const { error: cartError } = await supabase
    .from('carts')
    .upsert({ user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (cartError) return { ok: false, error: cartError };

  const { cart, error: cartReadError } = await getUserCart(user.id);
  if (cartReadError || !cart) return { ok: false, error: cartReadError || new Error('Cart not found') };

  const { data: existing, error: readError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cart.id)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError };

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: Number(existing.quantity) + safeQuantity })
      .eq('id', existing.id)
      .eq('cart_id', cart.id);
    return error ? { ok: false, error } : { ok: true };
  }

  const { error } = await supabase
    .from('cart_items')
    .insert({ cart_id: cart.id, listing_id: listingId, quantity: safeQuantity });
  return error ? { ok: false, error } : { ok: true };
}

export async function getCart() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required', items: [] };

  const { cart, error: cartError } = await getUserCart(user.id);
  if (cartError) return { ok: false, error: cartError, items: [] };
  if (!cart) return { ok: true, items: [] };

  const { data, error } = await supabase
    .from('cart_items')
    .select('id, listing_id, quantity, listings(*)')
    .eq('cart_id', cart.id)
    .order('created_at', { ascending: false });

  return error ? { ok: false, error, items: [] } : { ok: true, items: data || [] };
}
