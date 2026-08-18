import { db } from './supabase.js';

export async function initAuth({ openModal, closeModal } = {}) {
  const authBtn = document.getElementById('authBtn');
  const sessionEl = document.getElementById('session');
  if (!authBtn) return;

  const render = async () => {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      authBtn.textContent = 'تسجيل الخروج';
      sessionEl && (sessionEl.textContent = user.email || 'مسجل الدخول');
    } else {
      authBtn.textContent = 'تسجيل الدخول';
      sessionEl && (sessionEl.textContent = 'غير مسجل');
    }
  };

  authBtn.addEventListener('click', async () => {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      await db.auth.signOut();
      await render();
      return;
    }
    if (!openModal) return;
    openModal(`<h2>تسجيل الدخول</h2><form id="authForm" class="form"><input id="authEmail" type="email" autocomplete="email" placeholder="البريد الإلكتروني" required><input id="authPassword" type="password" autocomplete="current-password" placeholder="كلمة المرور" minlength="6" required><button class="blue" type="submit">تسجيل الدخول</button><button type="button" id="signupMode">إنشاء حساب</button><div id="authMsg" class="msg" aria-live="polite"></div></form>`);
    const form = document.getElementById('authForm');
    const msg = document.getElementById('authMsg');
    document.getElementById('signupMode')?.addEventListener('click', async () => {
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      if (!email || password.length < 6) { msg.textContent = 'أدخل بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل.'; return; }
      const { error } = await db.auth.signUp({ email, password });
      msg.textContent = error ? error.message : 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا طُلب منك ذلك.';
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
  await render();
}
