import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function claimFirstAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required' };
  const { data, error } = await supabase.rpc('claim_admin');
  return error ? { ok: false, error } : { ok: Boolean(data) };
}

export async function isCurrentUserAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  return !error && Boolean(data);
}
