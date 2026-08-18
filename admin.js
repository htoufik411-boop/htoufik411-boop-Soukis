import { db } from './supabase.js';

export async function initAdmin() {
  const button = document.querySelector('[data-admin]');
  if (!button) return;

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return showAdminMessage('Login required');

    const { data, error } = await db.rpc('is_admin');
    if (error || data !== true) return showAdminMessage('Admin access denied');

    window.location.href = 'admin.html';
  });
}

function showAdminMessage(message) {
  const target = document.querySelector('[data-admin-status]');
  if (target) target.textContent = message;
  else console.warn(message);
}
