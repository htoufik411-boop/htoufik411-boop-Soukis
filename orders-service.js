import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function createOrderFromCart({ shippingName, shippingPhone, shippingAddress } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required' };

  const { data: items, error: itemsError } = await supabase
    .from('cart_items')
    .select('id, listing_id, quantity, listings(id, title, name, price)')
    .eq('user_id', user.id);
  if (itemsError) return { ok: false, error: itemsError };
  if (!items?.length) return { ok: false, reason: 'empty_cart' };

  const total = items.reduce((sum, item) => sum + Number(item.listings?.price || 0) * Number(item.quantity || 0), 0);
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ user_id: user.id, total_amount: total, status: 'pending', shipping_name: shippingName || null, shipping_phone: shippingPhone || null, shipping_address: shippingAddress || null })
    .select('*')
    .single();
  if (orderError) return { ok: false, error: orderError };

  const orderItems = items.map(item => ({ order_id: order.id, listing_id: item.listing_id, quantity: item.quantity, unit_price: Number(item.listings?.price || 0) }));
  const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems);
  if (orderItemsError) {
    await supabase.from('orders').delete().eq('id', order.id).eq('user_id', user.id);
    return { ok: false, error: orderItemsError };
  }

  const { error: clearError } = await supabase.from('cart_items').delete().eq('user_id', user.id);
  if (clearError) return { ok: false, error: clearError, order };
  return { ok: true, order };
}
