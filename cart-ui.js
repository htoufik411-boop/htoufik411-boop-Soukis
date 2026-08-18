import { db } from './supabase.js';

async function currentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user || null;
}

export async function addToCart(listingId, quantity = 1) {
  const user = await currentUser();
  if (!user) return { ok: false, reason: 'auth_required' };
  const safeQuantity = Number(quantity);
  if (!Number.isInteger(safeQuantity) || safeQuantity < 1) return { ok: false, reason: 'invalid_quantity' };

  const { data: listing, error: listingError } = await db.from('listings').select('id').eq('id', listingId).maybeSingle();
  if (listingError) return { ok: false, error: listingError };
  if (!listing) return { ok: false, reason: 'listing_not_found' };

  const { data: existing, error: readError } = await db
    .from('cart_items').select('id, quantity').eq('user_id', user.id).eq('listing_id', listingId).maybeSingle();
  if (readError) return { ok: false, error: readError };

  if (existing) {
    const { error } = await db.from('cart_items').update({ quantity: Number(existing.quantity) + safeQuantity }).eq('id', existing.id).eq('user_id', user.id);
    return error ? { ok: false, error } : { ok: true };
  }
  const { error } = await db.from('cart_items').insert({ user_id: user.id, listing_id: listingId, quantity: safeQuantity });
  return error ? { ok: false, error } : { ok: true };
}

export async function updateCartItem(itemId, quantity) {
  const user = await currentUser();
  if (!user) return { ok: false, reason: 'auth_required' };
  const safeQuantity = Number(quantity);
  if (!Number.isInteger(safeQuantity) || safeQuantity < 0) return { ok: false, reason: 'invalid_quantity' };
  if (safeQuantity === 0) return removeCartItem(itemId);
  const { error } = await db.from('cart_items').update({ quantity: safeQuantity }).eq('id', itemId).eq('user_id', user.id);
  return error ? { ok: false, error } : { ok: true };
}

export async function removeCartItem(itemId) {
  const user = await currentUser();
  if (!user) return { ok: false, reason: 'auth_required' };
  const { error } = await db.from('cart_items').delete().eq('id', itemId).eq('user_id', user.id);
  return error ? { ok: false, error } : { ok: true };
}

export async function clearCart() {
  const user = await currentUser();
  if (!user) return { ok: false, reason: 'auth_required' };
  const { error } = await db.from('cart_items').delete().eq('user_id', user.id);
  return error ? { ok: false, error } : { ok: true };
}

export async function getCart() {
  const user = await currentUser();
  if (!user) return { ok: false, reason: 'auth_required', items: [] };
  const { data, error } = await db.from('cart_items')
    .select('id, listing_id, quantity, listings(*)')
    .eq('user_id', user.id).order('created_at', { ascending: false });
  return error ? { ok: false, error, items: [] } : { ok: true, items: data || [] };
}
