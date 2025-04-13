// server/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Check for environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ ERROR: Missing Supabase configuration');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Configured' : 'NOT CONFIGURED');
  console.error('SUPABASE_KEY:', supabaseKey ? 'Configured' : 'NOT CONFIGURED');
  throw new Error('Supabase configuration required. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
}

// Cria o cliente Supabase mesmo com credenciais vazias para evitar erros de inicialização
// As operações individuais verificarão a conectividade antes de executar
const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função auxiliar para verificar se o Supabase está configurado corretamente
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseKey);
};

export default supabase;