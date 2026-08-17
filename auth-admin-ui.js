import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SOUKIS_CONFIG } from './app-config.js';
import { getCurrentLanguage } from './i18n.js';

const supabase=createClient(SOUKIS_CONFIG.supabaseUrl,SOUKIS_CONFIG.supabasePublishableKey);
const text=(ar,fr,en)=>getCurrentLanguage()==='ar'?ar:getCurrentLanguage()==='fr'?fr:en;

export async function bootstrapFirstAdmin(){const{data:{user}}=await supabase.auth.getUser();if(!user)return{ok:false,reason:'auth_required'};const{data,error}=await supabase.rpc('claim_admin');if(error)return{ok:false,error};return{ok:data===true,claimed:data===true};}
export async function isCurrentUserAdmin(){const{data:{user}}=await supabase.auth.getUser();if(!user)return false;const{data,error}=await supabase.rpc('is_admin');return!error&&data===true;}
export function installAdminAuthUI({openModal}){document.addEventListener('click',async event=>{const button=event.target.closest('[data-soukis-admin-bootstrap]');if(!button)return;button.disabled=true;const result=await bootstrapFirstAdmin();button.disabled=false;if(result.ok){openModal(`<h2>${text('تم تفعيل حساب الإدارة','Compte administrateur activé','Admin account activated')}</h2><p class="msg">${text('أصبح هذا الحساب هو Admin الرئيسي في Soukis.','Ce compte est maintenant l’administrateur principal de Soukis.','This account is now the primary Soukis admin.')}</p>`);}else{openModal(`<h2>${text('تعذر التفعيل','Activation impossible','Activation failed')}</h2><p class="msg">${text('أنشئ حسابًا وسجّل الدخول أولًا، أو يوجد Admin بالفعل.','Créez un compte et connectez-vous, ou un administrateur existe déjà.','Create an account and sign in first, or an admin already exists.')}</p>`);}});}
