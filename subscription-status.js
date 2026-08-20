import { db } from './supabase.js';

const copy = {
  ar: { free: 'الحساب المجاني', active: '👑 {plan} فعّال', expires: 'ينتهي في {date}', days: '{n} يوم متبقٍ', locked: '🔒 ميزة Max للمشتركين' },
  fr: { free: 'Compte gratuit', active: '👑 {plan} actif', expires: 'Expire le {date}', days: '{n} jours restants', locked: '🔒 Fonction Max réservée aux abonnés' },
  en: { free: 'Free account', active: '👑 {plan} active', expires: 'Expires {date}', days: '{n} days left', locked: '🔒 Max feature for subscribers' }
};

const planNames = { boost: 'Boost', premium: 'Premium', max: 'Max', max_pro: 'Max Pro' };
const lang = () => document.getElementById('lang')?.value || document.documentElement.lang || 'ar';
const fmtDate = value => new Intl.DateTimeFormat(lang() === 'ar' ? 'ar-DZ' : lang() === 'fr' ? 'fr-DZ' : 'en-US', { dateStyle: 'medium' }).format(new Date(value));

export async function installSubscriptionStatus() {
  const bar = document.querySelector('.userbar');
  if (!bar || document.getElementById('subscriptionStatus')) return;
  const badge = document.createElement('span');
  badge.id = 'subscriptionStatus';
  badge.className = 'pill subscription-status';
  badge.setAttribute('aria-live', 'polite');
  bar.appendChild(badge);

  const render = async () => {
    const L = copy[lang()] || copy.ar;
    const { data: { user } } = await db.auth.getUser();
    if (!user) { badge.textContent = L.free; badge.title = L.locked; return; }
    const { data, error } = await db.from('seller_subscriptions').select('plan,status,ends_at').eq('user_id', user.id).order('ends_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !data || data.status !== 'active' || !data.ends_at || new Date(data.ends_at) <= new Date()) {
      badge.textContent = L.free;
      badge.title = L.locked;
      return;
    }
    const days = Math.max(0, Math.ceil((new Date(data.ends_at) - new Date()) / 86400000));
    const plan = planNames[data.plan] || data.plan || 'Max';
    badge.textContent = L.active.replace('{plan}', plan);
    badge.title = `${L.expires.replace('{date}', fmtDate(data.ends_at))} · ${L.days.replace('{n}', days)}`;
  };

  await render();
  document.getElementById('lang')?.addEventListener('change', render);
  window.addEventListener('soukis:language-changed', render);
  window.addEventListener('soukis:auth-changed', render);
}
