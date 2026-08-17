import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';

const supabase = createClient(SOUKIS_CONFIG.supabaseUrl, SOUKIS_CONFIG.supabasePublishableKey);

export async function bootstrapFirstAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'auth_required' };
  const { data, error } = await supabase.rpc('claim_admin');
  if (error) return { ok: false, error };
  return { ok: data === true, claimed: data === true };
}

export async function isCurrentUserAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

export function installAdminAuthUI({ openModal, closeModal }) {
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-soukis-admin-bootstrap]');
    if (!button) return;
    button.disabled = true;
    const result = await bootstrapFirstAdmin();
    button.disabled = false;
    if (result.ok) {
      openModal('<h2>تم تفعيل حساب الإدارة</h2><p class="msg">أصبح هذا الحساب هو Admin الرئيسي في Soukis.</p>');
    } else {
      openModal('<h2>تعذر التفعيل</h2><p class="msg">أنشئ حسابًا وسجّل الدخول أولًا، أو يوجد Admin بالفعل.</p>');
    }
  });
}
