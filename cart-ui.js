import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function addToCart(listingId, quantity = 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required' };

  const { error: cartError } = await supabase
    .from('carts')
    .upsert({ user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (cartError) return { ok: false, error: cartError };

  const { data: existing, error: readError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError };

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    return error ? { ok: false, error } : { ok: true };
  }

  const { error } = await supabase
    .from('cart_items')
    .insert({ user_id: user.id, listing_id: listingId, quantity });
  return error ? { ok: false, error } : { ok: true };
}

export async function getCart() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required', items: [] };

  const { data, error } = await supabase
    .from('cart_items')
    .select('id, listing_id, quantity, listings(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return error ? { ok: false, error, items: [] } : { ok: true, items: data || [] };
}
