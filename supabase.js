import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SOUKIS_CONFIG } from './app-config.js';

export const db = createClient(
  SOUKIS_CONFIG.supabaseUrl,
  SOUKIS_CONFIG.supabasePublishableKey,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
