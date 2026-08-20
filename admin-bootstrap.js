import { db } from './supabase.js';

export async function claimFirstAdmin() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required' };
  const { data, error } = await db.rpc('claim_admin');
  return error ? { ok: false, error } : { ok: Boolean(data) };
}

export async function isCurrentUserAdmin() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return false;
  const { data, error } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  return !error && Boolean(data);
}
