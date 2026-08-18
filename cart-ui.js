import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

async function getOrCreateCart(userId) {
  const { data: existing, error: readError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError };
  if (existing) return { ok: true, cartId: existing.id };

  const { data: created, error: createError } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();
  return createError ? { ok: false, error: createError } : { ok: true, cartId: created.id };
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

  const cart = await getOrCreateCart(user.id);
  if (!cart.ok) return cart;

  const { data: existing, error: readError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cart.cartId)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError };

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: Number(existing.quantity) + safeQuantity })
      .eq('id', existing.id)
      .eq('cart_id', cart.cartId);
    return error ? { ok: false, error } : { ok: true };
  }

  const { error } = await supabase
    .from('cart_items')
    .insert({ cart_id: cart.cartId, listing_id: listingId, quantity: safeQuantity });
  return error ? { ok: false, error } : { ok: true };
}

export async function getCart() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required', items: [] };

  const cart = await getOrCreateCart(user.id);
  if (!cart.ok) return { ...cart, items: [] };

  const { data, error } = await supabase
    .from('cart_items')
    .select('id, listing_id, quantity, listings(*)')
    .eq('cart_id', cart.cartId)
    .order('created_at', { ascending: false });

  return error ? { ok: false, error, items: [] } : { ok: true, items: data || [] };
}
