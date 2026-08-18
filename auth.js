import { db } from './supabase.js';
import { t } from './i18n.js';

export async function initAuth({ openModal, closeModal } = {}) {
  const authBtn = document.getElementById('authBtn');
  const sessionEl = document.getElementById('session');
  if (!authBtn) return;

  const render = async () => {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      authBtn.textContent = t('logout');
      authBtn.dataset.loggedIn = 'true';
      if (sessionEl) {
        sessionEl.textContent = user.email || t('loggedIn');
        sessionEl.dataset.loggedIn = 'true';
      }
    } else {
      authBtn.textContent = t('login');
      delete authBtn.dataset.loggedIn;
      if (sessionEl) {
        sessionEl.textContent = t('notLogged');
        delete sessionEl.dataset.loggedIn;
      }
    }
  };

  // cart-bridge.js owns auth interactions on the main marketplace page.
  // Avoid registering a second click handler that would open two auth flows.
  if (document.documentElement.dataset.soukisCartBridgeInstalled === 'true') {
    await render();
    return;
  }

  authBtn.addEventListener('click', async () => {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      await db.auth.signOut();
      await render();
      return;
    }
    if (!openModal) return;
    openModal(`<h2>${t('login')}</h2><form id="authForm" class="form"><input id="authEmail" type="email" autocomplete="email" placeholder="${t('email')}" required><input id="authPassword" type="password" autocomplete="current-password" placeholder="${t('password')}" minlength="6" required><button class="blue" type="submit">${t('login')}</button><button type="button" id="signupMode">${t('signup')}</button><div id="authMsg" class="msg" aria-live="polite"></div></form>`);
    const form = document.getElementById('authForm');
    const msg = document.getElementById('authMsg');
    document.getElementById('signupMode')?.addEventListener('click', async () => {
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      if (!email || password.length < 6) {
        msg.textContent = t('invalidCredentials');
        return;
      }
      const { error } = await db.auth.signUp({ email, password });
      msg.textContent = error ? error.message : t('signupSuccess');
      if (!error) closeModal?.();
      await render();
    });
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) { msg.textContent = error.message; return; }
      await render();
      closeModal?.();
    });
  });

  db.auth.onAuthStateChange(() => { render(); });
  window.addEventListener('soukis:language-changed', () => { render(); });
  await render();
}
