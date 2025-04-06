import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Configuração do Supabase (usando service role key)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const databaseUrl = process.env.DATABASE_URL || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('⛔ As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são necessárias');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('⛔ A variável de ambiente DATABASE_URL é necessária');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Conexão direta com o banco de dados PostgreSQL
const pool = new Pool({ connectionString: databaseUrl });

async function updateTables() {
  try {
    console.log('🔍 Conectando ao banco de dados PostgreSQL...');
    
    // Verificar conexão
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    try {
      // 1. Consultar tabelas existentes
      console.log('📋 Verificando tabelas existentes...');
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      
      const tables = tablesResult.rows.map(row => row.table_name);
      console.log(`📊 Tabelas encontradas (${tables.length}): ${tables.join(', ')}`);
      
      // 2. Verificar se a tabela de usuários existe
      if (tables.includes('users')) {
        console.log('👤 Verificando tabela de usuários...');
        
        // Obter usuários do Supabase Auth
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error('❌ Erro ao obter usuários do Supabase Auth:', authError);
        } else {
          console.log(`🧑‍🤝‍🧑 Usuários encontrados em auth.users: ${authUsers.users.length}`);
          
          for (const user of authUsers.users) {
            console.log(`👤 Verificando usuário ${user.email} (ID: ${user.id})...`);
            
            // Verificar se o usuário existe na tabela users
            const userCheck = await client.query(
              `SELECT * FROM users WHERE email = $1`, 
              [user.email]
            );
            
            if (userCheck.rowCount === 0) {
              console.log(`➕ Criando usuário ${user.email} na tabela users...`);
              
              // Inserir usuário na tabela users
              await client.query(`
                INSERT INTO users (id, name, email, role, organization_id)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                user.id, 
                user.user_metadata?.name || user.email, 
                user.email, 
                user.user_metadata?.role || 'agent',
                user.user_metadata?.organization_id || 1
              ]);
              
              console.log(`✅ Usuário ${user.email} criado com sucesso!`);
            } else {
              console.log(`✅ Usuário ${user.email} já existe na tabela users`);
              
              // Verificar se o ID corresponde ao UUID do Supabase
              const dbUser = userCheck.rows[0];
              
              if (dbUser.id !== user.id) {
                console.log(`🔄 Atualizando ID do usuário ${user.email} para ${user.id}...`);
                
                try {
                  // Tentativa de atualizar o ID do usuário
                  await client.query(`
                    UPDATE users SET id = $1 WHERE email = $2
                  `, [user.id, user.email]);
                  
                  console.log(`✅ ID do usuário ${user.email} atualizado com sucesso!`);
                } catch (updateError) {
                  console.error(`❌ Não foi possível atualizar o ID do usuário: ${updateError.message}`);
                  console.log('⚠️ Problema de restrição de chave primária, tentando recriar o usuário...');
                  
                  // Excluir usuário atual 
                  await client.query(`DELETE FROM users WHERE email = $1`, [user.email]);
                  
                  // Recriar usuário com ID correto
                  await client.query(`
                    INSERT INTO users (id, name, email, role, organization_id)
                    VALUES ($1, $2, $3, $4, $5)
                  `, [
                    user.id, 
                    dbUser.name || user.user_metadata?.name || user.email, 
                    user.email, 
                    dbUser.role || user.user_metadata?.role || 'agent',
                    dbUser.organization_id || user.user_metadata?.organization_id || 1
                  ]);
                  
                  console.log(`✅ Usuário ${user.email} recriado com sucesso!`);
                }
              }
            }
          }
        }
      }
      
      console.log('✅ Verificação e atualização concluídas com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao executar operações no banco de dados:', error);
    } finally {
      client.release();
      console.log('🔌 Conexão com o banco de dados fechada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
  } finally {
    await pool.end();
  }
}

// Executar a função principal
updateTables()
  .then(() => {
    console.log('✨ Processo concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });