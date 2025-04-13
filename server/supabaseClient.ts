// server/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Inicializa as variáveis como let para permitir valores de fallback
// Prioridade: 1) SUPABASE_URL/KEY (servidor), 2) VITE_SUPABASE_URL/KEY (cliente)
let supabaseUrl = process.env.SUPABASE_URL || '';
let supabaseKey = process.env.SUPABASE_KEY || '';

console.log('📦 Inicializando SupabaseStorage');

// Verifica se as variáveis estão configuradas
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ AVISO: Variáveis de ambiente do Supabase não configuradas');
  console.warn('SUPABASE_URL:', supabaseUrl ? 'Configurado' : 'NÃO CONFIGURADO');
  console.warn('SUPABASE_KEY:', supabaseKey ? 'Configurado' : 'NÃO CONFIGURADO');
  
  // Usar valores vazios, mas continuar a execução
  // O middleware de autenticação vai verificar isSupabaseConfigured() antes de tentar autenticar
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