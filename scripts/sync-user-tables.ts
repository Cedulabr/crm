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

async function syncUserTables() {
  try {
    console.log('🔍 Conectando ao banco de dados PostgreSQL...');
    
    // Verificar conexão
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    try {
      // 1. Executar SQL para alterar o tipo das colunas
      console.log('🔧 Alterando tipos de coluna para suportar UUIDs...');
      
      // Lista de comandos SQL a serem executados
      const sqlCommands = [
        // 1. Verificar o tipo de coluna atual da tabela users
        `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id';
        `,
        
        // 2. Alterar o tipo da coluna id na tabela users para TEXT se necessário
        `
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE users
            ALTER COLUMN id TYPE TEXT;
          EXCEPTION
            WHEN others THEN
              RAISE NOTICE 'Tipo de coluna já é TEXT ou não pode ser alterado diretamente.';
          END;
        END $$;
        `,

        // 3. Verificar se o usuário específico existe
        `
        SELECT * FROM users WHERE id = '4fd63751-d7f7-47b0-a002-dc2ad8b32e70';
        `,
        
        // 4. Tenta criar ou atualizar o usuário admin se necessário
        `
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM users WHERE id = '4fd63751-d7f7-47b0-a002-dc2ad8b32e70') THEN
            UPDATE users 
            SET name = 'Admin', 
                email = 'contato@werkonnect.com',
                role = 'superadmin',
                organization_id = 1
            WHERE id = '4fd63751-d7f7-47b0-a002-dc2ad8b32e70';
          ELSE
            BEGIN
              INSERT INTO users (id, name, email, role, organization_id)
              VALUES ('4fd63751-d7f7-47b0-a002-dc2ad8b32e70', 'Admin', 'contato@werkonnect.com', 'superadmin', 1);
            EXCEPTION
              WHEN others THEN
                RAISE NOTICE 'Não foi possível inserir o usuário: %', SQLERRM;
            END;
          END IF;
        END $$;
        `,
        
        // 5. Alterar os tipos das colunas em outras tabelas
        `
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE clients
            ALTER COLUMN created_by_id TYPE TEXT;
          EXCEPTION
            WHEN others THEN
              RAISE NOTICE 'Erro ao alterar created_by_id em clients: %', SQLERRM;
          END;
          
          BEGIN
            ALTER TABLE proposals
            ALTER COLUMN created_by_id TYPE TEXT;
          EXCEPTION
            WHEN others THEN
              RAISE NOTICE 'Erro ao alterar created_by_id em proposals: %', SQLERRM;
          END;
          
          BEGIN
            ALTER TABLE form_templates
            ALTER COLUMN created_by_id TYPE TEXT;
          EXCEPTION
            WHEN others THEN
              RAISE NOTICE 'Erro ao alterar created_by_id em form_templates: %', SQLERRM;
          END;
          
          BEGIN
            ALTER TABLE form_submissions
            ALTER COLUMN processed_by_id TYPE TEXT;
          EXCEPTION
            WHEN others THEN
              RAISE NOTICE 'Erro ao alterar processed_by_id em form_submissions: %', SQLERRM;
          END;
        END $$;
        `
      ];
      
      // Executar cada comando SQL
      for (let i = 0; i < sqlCommands.length; i++) {
        const sql = sqlCommands[i];
        console.log(`Executando comando SQL ${i + 1}/${sqlCommands.length}...`);
        
        try {
          const result = await client.query(sql);
          if (result.rows && result.rows.length > 0) {
            console.log(`Resultado: ${JSON.stringify(result.rows)}`);
          } else {
            console.log('Comando executado sem retorno de dados');
          }
        } catch (error) {
          console.error(`Erro ao executar comando SQL ${i + 1}: ${error.message}`);
        }
      }
      
      // Verificar usuário novamente
      try {
        console.log('Verificando usuário admin após as operações...');
        const userResult = await client.query(`
          SELECT * FROM users WHERE id = '4fd63751-d7f7-47b0-a002-dc2ad8b32e70'
        `);
        
        if (userResult.rows.length > 0) {
          console.log('✅ Usuário admin encontrado com sucesso:', userResult.rows[0]);
        } else {
          console.log('⚠️ Usuário admin não encontrado após as operações!');
        }
      } catch (error) {
        console.error('Erro ao verificar usuário admin:', error);
      }
      
      console.log('✅ Operações de sincronização concluídas!');
      
    } catch (error) {
      console.error('❌ Erro ao executar operações no banco de dados:', error);
    } finally {
      client.release();
      console.log('🔌 Conexão com o cliente do banco de dados fechada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
  } finally {
    await pool.end();
    console.log('🔌 Pool de conexões encerrado');
  }
}

// Executar a função principal
syncUserTables()
  .then(() => {
    console.log('✨ Processo concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });