// server/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Verifica se as variáveis de ambiente estão definidas
// No ambiente de produção, essas variáveis devem ser configuradas nas configurações do deploy
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ AVISO: As variáveis de ambiente SUPABASE_URL e/ou SUPABASE_KEY não estão definidas');
  console.warn('A aplicação pode funcionar com funcionalidade limitada');
  // Continuamos a execução para permitir o deploy, mesmo que com funcionalidade limitada
}

// Cria o cliente Supabase mesmo com credenciais vazias para evitar erros de inicialização
// As operações individuais verificarão a conectividade antes de executar
const supabase = createClient(supabaseUrl, supabaseKey, {
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