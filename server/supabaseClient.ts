// server/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('⚠️ ERRO: As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são obrigatórias');
  throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY não definidas');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;