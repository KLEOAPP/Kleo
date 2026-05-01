import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '⚠️ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env. ' +
    'Crea el archivo .env (copia .env.example) y reinicia el dev server.'
  );
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const isConfigured = Boolean(url && anonKey);
