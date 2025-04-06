import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Configuração do banco de dados
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.error('⛔ A variável de ambiente DATABASE_URL é necessária');
  process.exit(1);
}

// Conexão direta com o banco de dados PostgreSQL
const pool = new Pool({ connectionString: databaseUrl });

async function recreateUserTables() {
  try {
    console.log('🔍 Conectando ao banco de dados PostgreSQL...');
    
    // Verificar conexão
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    try {
      // Iniciar uma transação para garantir consistência
      await client.query('BEGIN');
      
      try {
        console.log('📊 Fazendo backup dos dados existentes...');
        
        // 1. Verificar se as tabelas existem
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `);
        
        const tables = tablesResult.rows.map(row => row.table_name);
        console.log(`Tabelas encontradas: ${tables.join(', ')}`);
        
        // 2. Backup da tabela de usuários
        if (tables.includes('users')) {
          const usersResult = await client.query('SELECT * FROM users');
          const users = usersResult.rows;
          console.log(`👥 Dados de ${users.length} usuários salvos em memória`);
          
          // 3. Criar tabela temporária para os usuários
          await client.query(`
            CREATE TEMPORARY TABLE temp_users AS 
            SELECT * FROM users WITH NO DATA;
            
            INSERT INTO temp_users SELECT * FROM users;
          `);
          console.log('📋 Tabela temporária de usuários criada e dados copiados');
          
          // 4. Remover restrições de chave estrangeira relacionadas ao ID de usuário
          // Esta é uma operação potencialmente arriscada, mas necessária para recriar a tabela
          console.log('🔄 Modificando as restrições de chave estrangeira...');
          
          // 4.1 Obter todas as restrições de chave estrangeira relacionadas a users.id
          const fkResult = await client.query(`
            SELECT
              tc.constraint_name,
              tc.table_name,
              kcu.column_name,
              ccu.table_name AS foreign_table_name
            FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_name='users'
              AND ccu.column_name='id';
          `);
          
          const foreignKeys = fkResult.rows;
          console.log(`Encontradas ${foreignKeys.length} restrições de chave estrangeira`);
          
          // 4.2 Criar backup das tabelas afetadas e remover as restrições de chave estrangeira
          for (const fk of foreignKeys) {
            console.log(`Processando tabela ${fk.table_name}, coluna ${fk.column_name}...`);
            
            // Criar tabela temporária para backup
            await client.query(`
              CREATE TEMPORARY TABLE temp_${fk.table_name} AS 
              SELECT * FROM ${fk.table_name} WITH NO DATA;
              
              INSERT INTO temp_${fk.table_name} SELECT * FROM ${fk.table_name};
            `);
            
            // Remover a restrição de chave estrangeira
            await client.query(`
              ALTER TABLE ${fk.table_name} 
              DROP CONSTRAINT ${fk.constraint_name};
            `);
            
            console.log(`✅ Restrição ${fk.constraint_name} removida da tabela ${fk.table_name}`);
          }
          
          // 5. Recriar a tabela users com id como TEXT
          console.log('🔄 Recriando a tabela users com ID como TEXT...');
          
          await client.query('DROP TABLE users CASCADE');
          
          await client.query(`
            CREATE TABLE users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              role TEXT NOT NULL DEFAULT 'agent',
              sector TEXT,
              organization_id INTEGER,
              password TEXT,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            );
          `);
          
          console.log('✅ Tabela users recriada com sucesso');
          
          // 6. Restaurar dados de usuários
          console.log('🔄 Restaurando dados dos usuários...');
          
          for (const user of users) {
            // Inserir usuário com ID como texto
            await client.query(`
              INSERT INTO users (
                id, name, email, role, sector, organization_id, password, 
                created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9
              )
            `, [
              user.id.toString(), // Converte ID para string
              user.name,
              user.email,
              user.role,
              user.sector,
              user.organization_id,
              user.password,
              user.created_at,
              user.updated_at
            ]);
          }
          
          // 7. Criar o usuário administrador do Supabase
          console.log('👤 Adicionando usuário admin do Supabase...');
          
          try {
            await client.query(`
              INSERT INTO users (
                id, name, email, role, organization_id
              ) VALUES (
                '4fd63751-d7f7-47b0-a002-dc2ad8b32e70', 
                'Admin', 
                'contato@werkonnect.com', 
                'superadmin', 
                1
              )
              ON CONFLICT (id) DO UPDATE SET
                name = 'Admin',
                email = 'contato@werkonnect.com',
                role = 'superadmin',
                organization_id = 1;
            `);
            console.log('✅ Usuário admin do Supabase criado/atualizado com sucesso');
          } catch (adminError) {
            console.error('❌ Erro ao adicionar usuário admin:', adminError.message);
          }
          
          // 8. Recriar tabelas relacionadas com restrições de chave estrangeira para TEXT
          console.log('🔄 Recriando tabelas relacionadas...');
          
          for (const fk of foreignKeys) {
            console.log(`Recriando tabela ${fk.table_name}...`);
            
            // Primeira, remover a tabela
            await client.query(`DROP TABLE IF EXISTS ${fk.table_name} CASCADE`);
            
            // Agora recriar a tabela com a definição apropriada
            // Esta parte depende do conhecimento da estrutura de cada tabela
            if (fk.table_name === 'clients') {
              await client.query(`
                CREATE TABLE clients (
                  id SERIAL PRIMARY KEY,
                  name TEXT NOT NULL,
                  cpf TEXT,
                  phone TEXT,
                  convenio_id INTEGER REFERENCES convenios(id),
                  birth_date TEXT,
                  contact TEXT,
                  email TEXT,
                  company TEXT,
                  created_by_id TEXT REFERENCES users(id),
                  organization_id INTEGER REFERENCES organizations(id),
                  created_at TIMESTAMP DEFAULT NOW()
                );
              `);
            } else if (fk.table_name === 'proposals') {
              await client.query(`
                CREATE TABLE proposals (
                  id SERIAL PRIMARY KEY,
                  client_id INTEGER REFERENCES clients(id),
                  product_id INTEGER REFERENCES products(id),
                  convenio_id INTEGER REFERENCES convenios(id),
                  bank_id INTEGER REFERENCES banks(id),
                  value TEXT,
                  comments TEXT,
                  status TEXT NOT NULL,
                  created_by_id TEXT REFERENCES users(id),
                  organization_id INTEGER REFERENCES organizations(id),
                  created_at TIMESTAMP DEFAULT NOW()
                );
              `);
            } else if (fk.table_name === 'form_templates') {
              await client.query(`
                CREATE TABLE form_templates (
                  id SERIAL PRIMARY KEY,
                  name TEXT NOT NULL,
                  description TEXT,
                  kanban_column TEXT NOT NULL DEFAULT 'lead',
                  fields JSON DEFAULT '[]',
                  active BOOLEAN NOT NULL DEFAULT TRUE,
                  created_by_id TEXT REFERENCES users(id),
                  organization_id INTEGER REFERENCES organizations(id),
                  created_at TIMESTAMP DEFAULT NOW(),
                  updated_at TIMESTAMP DEFAULT NOW()
                );
              `);
            } else if (fk.table_name === 'form_submissions') {
              await client.query(`
                CREATE TABLE form_submissions (
                  id SERIAL PRIMARY KEY,
                  form_template_id INTEGER REFERENCES form_templates(id),
                  data JSONB NOT NULL,
                  client_id INTEGER REFERENCES clients(id),
                  status TEXT NOT NULL DEFAULT 'novo',
                  processed_by_id TEXT REFERENCES users(id),
                  organization_id INTEGER REFERENCES organizations(id),
                  created_at TIMESTAMP DEFAULT NOW(),
                  updated_at TIMESTAMP DEFAULT NOW()
                );
              `);
            }
            
            console.log(`✅ Tabela ${fk.table_name} recriada com sucesso`);
            
            // Restaurar dados da tabela temporária
            try {
              const columnResult = await client.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = '${fk.table_name}'
                ORDER BY ordinal_position;
              `);
              
              const columns = columnResult.rows.map(row => row.column_name);
              const columnsString = columns.join(', ');
              
              // Recuperar dados da tabela temporária
              const tempData = await client.query(`SELECT * FROM temp_${fk.table_name}`);
              console.log(`Restaurando ${tempData.rows.length} registros em ${fk.table_name}...`);
              
              // Inserir cada registro de volta na tabela
              for (const row of tempData.rows) {
                const values = columns.map(col => {
                  if (col === fk.column_name && row[col] !== null) {
                    return row[col].toString(); // Converter ID para string
                  }
                  return row[col];
                });
                
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                
                await client.query(`
                  INSERT INTO ${fk.table_name} (${columnsString})
                  VALUES (${placeholders})
                `, values);
              }
              
              console.log(`✅ Dados restaurados para a tabela ${fk.table_name}`);
            } catch (restoreError) {
              console.error(`❌ Erro ao restaurar dados para ${fk.table_name}:`, restoreError.message);
            }
          }
        } else {
          console.log('⚠️ Tabela users não encontrada, criando do zero...');
          
          // Criar tabela users do zero com id como TEXT
          await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              role TEXT NOT NULL DEFAULT 'agent',
              sector TEXT,
              organization_id INTEGER,
              password TEXT,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            );
          `);
          
          // Adicionar usuário admin
          await client.query(`
            INSERT INTO users (
              id, name, email, role, organization_id
            ) VALUES (
              '4fd63751-d7f7-47b0-a002-dc2ad8b32e70', 
              'Admin', 
              'contato@werkonnect.com', 
              'superadmin', 
              1
            )
            ON CONFLICT (id) DO NOTHING;
          `);
          
          console.log('✅ Tabela users criada e usuário admin adicionado');
        }
        
        // Confirmar a transação
        await client.query('COMMIT');
        console.log('✅ Transação confirmada com sucesso');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro durante a recriação das tabelas, transação revertida:', error);
        throw error;
      }
      
    } finally {
      client.release();
      console.log('🔌 Conexão com o cliente do banco de dados fechada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ou processar no banco de dados:', error);
  } finally {
    await pool.end();
    console.log('🔌 Pool de conexões encerrado');
  }
}

// Executar a função principal
recreateUserTables()
  .then(() => {
    console.log('✨ Processo concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });