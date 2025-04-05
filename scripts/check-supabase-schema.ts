/**
 * Script para verificar o schema real das tabelas no Supabase
 * Este script consulta todas as tabelas e exibe suas colunas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar se as variáveis de ambiente foram carregadas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("❌ Erro: SUPABASE_URL e SUPABASE_KEY são necessários no arquivo .env");
  process.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Lista de tabelas esperadas
const EXPECTED_TABLES = [
  'organizations',
  'users',
  'clients',
  'products',
  'convenios',
  'banks',
  'proposals',
  'form_templates',
  'form_submissions'
];

async function checkSupabaseSchema() {
  console.log("🔍 Verificando schema das tabelas no Supabase...");
  
  // Para cada tabela, fazer uma consulta para obter uma linha e verificar as colunas disponíveis
  for (const tableName of EXPECTED_TABLES) {
    try {
      console.log(`\n📋 Verificando tabela ${tableName}...`);
      
      // Tentar obter o primeiro registro
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Erro ao acessar tabela ${tableName}:`, error.message);
        continue;
      }
      
      // Verificar o schema com base no primeiro registro ou criar um query vazio
      try {
        // Tentar obter o schema através de uma consulta vazia
        const { error: schemaError } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (schemaError) {
          console.error(`❌ Erro ao verificar schema da tabela ${tableName}:`, schemaError.message);
          continue;
        }
        
        // Tentar inserir um registro com uma coluna que não existe para obter informações sobre o esquema
        const testData: any = { __test_column: 'test' };
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(testData);
        
        // Analisar o erro para extrair as colunas válidas
        if (insertError && insertError.message) {
          const match = insertError.message.match(/Requested keys: \[(.*?)\]/);
          if (match && match[1]) {
            const invalidColumns = match[1].split(',').map(col => col.trim().replace(/"/g, ''));
            console.log(`✅ Colunas inválidas identificadas para ${tableName}:`, invalidColumns);
          }
        }
        
        // Obter uma descrição da tabela usando uma consulta RPC personalizada (avançado)
        const { data: columns, error: rpcError } = await supabase.rpc('get_table_columns', {
          table_name: tableName
        });
        
        if (rpcError) {
          console.log(`⚠️ Não foi possível obter informações de coluna via RPC:`, rpcError.message);
        } else if (columns) {
          console.log(`✅ Colunas da tabela ${tableName}:`, columns);
        }
        
        // Fallback: se tivermos dados, mostrar as chaves
        if (data && data.length > 0) {
          console.log(`✅ Colunas detectadas para ${tableName} (baseado em dados):`, Object.keys(data[0]));
        } else {
          console.log(`⚠️ Nenhum dado encontrado na tabela ${tableName}, não é possível inferir colunas.`);
        }
        
      } catch (schemaCheckError) {
        console.error(`❌ Erro ao verificar schema de ${tableName}:`, schemaCheckError);
      }
      
    } catch (tableError) {
      console.error(`❌ Erro geral ao verificar tabela ${tableName}:`, tableError);
    }
  }
  
  // Método alternativo: tentar obter as informações do schema diretamente
  try {
    console.log("\n\n📋 Tentando obter informações do schema diretamente...");
    
    // Consultar as colunas do sistema PostgreSQL (pode exigir permissões especiais)
    const { data: columnData, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable')
      .in('table_name', EXPECTED_TABLES);
    
    if (columnError) {
      console.error('❌ Erro ao consultar schema do PostgreSQL:', columnError.message);
    } else if (columnData) {
      // Agrupar colunas por tabela
      const tableColumns: Record<string, any[]> = {};
      
      columnData.forEach(col => {
        if (!tableColumns[col.table_name]) {
          tableColumns[col.table_name] = [];
        }
        tableColumns[col.table_name].push({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES'
        });
      });
      
      // Exibir informações do schema
      for (const tableName in tableColumns) {
        console.log(`\n✅ Schema da tabela ${tableName}:`);
        tableColumns[tableName].forEach(col => {
          console.log(`   - ${col.name} (${col.type})${col.nullable ? ' NULL' : ' NOT NULL'}`);
        });
      }
    }
    
  } catch (schemaError) {
    console.error('❌ Erro ao consultar schema diretamente:', schemaError);
  }
  
  console.log("\n🏁 Verificação de schema concluída!");
}

// Função personalizada que o Supabase pode não ter
async function createGetTableColumnsFunction() {
  try {
    const { error } = await supabase.rpc('get_table_columns', { table_name: 'users' });
    
    // Se a função já existe, não precisamos criá-la novamente
    if (!error || error.message !== 'function get_table_columns(character varying) does not exist') {
      return;
    }
    
    // Criar a função através de SQL
    const { error: createError } = await supabase.rpc('create_get_table_columns_function');
    
    if (createError) {
      console.error('❌ Erro ao criar função auxiliar:', createError);
      
      // Tentar criar diretamente com SQL
      const sqlCreateFunction = `
      CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
      RETURNS TABLE (column_name text, data_type text, is_nullable boolean)
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT c.column_name::text, c.data_type::text, (c.is_nullable = 'YES')::boolean
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND c.table_name = table_name;
      END;
      $$;
      `;
      
      const { error: sqlError } = await supabase.rpc('sql', { query: sqlCreateFunction });
      
      if (sqlError) {
        console.error('❌ Não foi possível criar função auxiliar:', sqlError);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar/criar função auxiliar:', error);
  }
}

// Executar a verificação
async function main() {
  try {
    // Tentar criar a função auxiliar (pode falhar sem permissões adequadas)
    await createGetTableColumnsFunction();
    
    // Verificar o schema
    await checkSupabaseSchema();
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Erro não tratado:', error);
    process.exit(1);
  });