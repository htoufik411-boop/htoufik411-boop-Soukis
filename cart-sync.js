import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://cqkhzzkcffhanyanavvw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7rdabmz_vTemmUxme-XHBg_cVdnWzOS';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function syncCartItem(listingId, quantity = 1) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { ok: false, reason: 'auth_required' };

  const userId = session.user.id;
  const { error: cartError } = await supabase
    .from('carts')
    .upsert({ user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (cartError) return { ok: false, error: cartError };

  const { data: existing, error: readError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError };

  const result = existing
    ? await supabase.from('cart_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id)
    : await supabase.from('cart_items').insert({ user_id: userId, listing_id: listingId, quantity });

  return result.error ? { ok: false, error: result.error } : { ok: true };
}

export async function loadRemoteCart() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, listing_id, quantity, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });
  return error ? [] : (data || []);
}
