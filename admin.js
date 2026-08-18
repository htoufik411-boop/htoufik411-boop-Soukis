import { db } from './supabase.js';
import { t } from './i18n.js';

export function initAdmin() {
  const button = document.getElementById('admin');
  if (!button) return;

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return showAdminMessage(t('adminLoginRequired'));

    const { data, error } = await db.rpc('is_admin');
    if (error || data !== true) return showAdminMessage(t('adminDenied'));

    window.location.href = 'admin.html';
  });
}

function showAdminMessage(message) {
  const target = document.getElementById('admin-status');
  if (target) {
    target.textContent = message;
    target.className = 'admin-status msg';
    return;
  }
  console.warn(message);
}
