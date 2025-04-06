import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuração do Supabase (usando service role key)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('⛔ As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateUserSchema() {
  try {
    console.log('🔧 Atualizando schema de usuário no Supabase...');

    // Verificar se existe tabela de usuários
    const { data: tableExists, error: checkError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Erro ao verificar tabela de usuários:', checkError);
      return;
    }

    if (!tableExists || tableExists.length === 0) {
      console.log('⚠️ Tabela de usuários não encontrada ou vazia');
      return;
    }

    // Atualizar tipos de coluna
    console.log('🔄 Executando SQL para atualizar schema...');

    // Lista de SQLs a serem executados
    const sqlCommands = [
      // 1. Atualizar a coluna ID da tabela users
      `
      ALTER TABLE IF EXISTS users
      ALTER COLUMN id TYPE TEXT;
      `,
      
      // 2. Atualizar as colunas referentes a UUID em outras tabelas
      `
      ALTER TABLE IF EXISTS clients
      ALTER COLUMN created_by_id TYPE TEXT;
      `,
      
      `
      ALTER TABLE IF EXISTS proposals
      ALTER COLUMN created_by_id TYPE TEXT;
      `,
      
      `
      ALTER TABLE IF EXISTS form_templates
      ALTER COLUMN created_by_id TYPE TEXT;
      `,
      
      `
      ALTER TABLE IF EXISTS form_submissions
      ALTER COLUMN processed_by_id TYPE TEXT;
      `
    ];

    // Executar cada comando SQL
    for (const sql of sqlCommands) {
      console.log('Executando:', sql.trim());
      const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
      
      if (error) {
        console.error('❌ Erro ao executar SQL:', error);
      } else {
        console.log('✅ SQL executado com sucesso');
      }
    }

    console.log('✅ Schema atualizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao atualizar schema:', error);
  }
}

// Executar a função
updateUserSchema()
  .then(() => {
    console.log('✨ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });