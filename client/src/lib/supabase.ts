import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variáveis de ambiente para configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

// Variável para armazenar a instância do cliente Supabase
let supabaseInstance: SupabaseClient | null = null;

// Instância exportada diretamente (para compatibilidade com código existente)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Inicializa o cliente Supabase
 * @returns Cliente Supabase
 */
export function initializeSupabase(): SupabaseClient {
  // Verificar se as variáveis de ambiente estão definidas
  if (!supabaseUrl || !supabaseKey) {
    console.error('Variáveis de ambiente do Supabase não estão configuradas');
    console.log('Frontend - Supabase URL:', supabaseUrl ? 'Configurado' : 'Não configurado');
    console.log('Frontend - Supabase KEY:', supabaseKey ? 'Configurado' : 'Não configurado');
    throw new Error('Variáveis de ambiente do Supabase não estão configuradas');
  }

  // Criar e armazenar a instância do cliente Supabase
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseInstance;
}

/**
 * Obtém o cliente Supabase
 * @returns Cliente Supabase ou null se não estiver inicializado
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance) {
    try {
      return initializeSupabase();
    } catch (error) {
      console.error('Erro ao inicializar cliente Supabase:', error);
      return null;
    }
  }
  return supabaseInstance;
}

/**
 * Retorna as informações de configuração do Supabase
 * Útil para depuração
 */
export function getSupabaseConfig() {
  return {
    url: supabaseUrl,
    keyConfigured: !!supabaseKey,
    clientInitialized: !!supabaseInstance,
  };
}

// Inicializar o cliente Supabase na importação do módulo
try {
  initializeSupabase();
  console.log('Supabase URL:', supabaseUrl ? 'Configurado' : 'Não configurado');
  console.log('Supabase KEY:', supabaseKey ? 'Configurado' : 'Não configurado');
} catch (error) {
  console.error('Erro ao inicializar Supabase:', error);
}