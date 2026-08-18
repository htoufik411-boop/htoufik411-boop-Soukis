import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function createOrderFromCart({ shippingName, shippingPhone, shippingAddress } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required' };

  const { data: orderId, error } = await supabase.rpc('create_order_from_cart', {
    p_shipping_name: shippingName ?? null,
    p_shipping_phone: shippingPhone ?? null,
    p_shipping_address: shippingAddress ?? null
  });

  if (error) {
    if (error.code === 'P0002') return { ok: false, reason: 'empty_cart', error };
    if (error.code === 'P0001') return { ok: false, reason: 'listing_unavailable', error };
    if (error.code === '22023') return { ok: false, reason: 'invalid_checkout', error };
    return { ok: false, error };
  }

  // The current Supabase project uses UUID order IDs and buyer_id on orders.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('buyer_id', user.id)
    .single();

  if (orderError) return { ok: false, error: orderError };
  return { ok: true, order };
}
