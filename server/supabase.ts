import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
} else {
  console.log('Iniciando cliente Supabase com URL:', supabaseUrl);
}

// Create a single supabase client for the entire app
console.log('Criando cliente Supabase...');
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Validar conexão com uma consulta simples
supabase.from('users').select('count').then(({ data, error }) => {
  if (error) {
    console.error('Erro ao validar conexão com Supabase:', error);
  } else {
    console.log('Conexão com Supabase validada com sucesso!');
  }
}).catch(error => {
  console.error('Erro ao tentar validar conexão com Supabase:', error);
});