import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import readline from 'readline';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || '';

// Helper para verificação da senha usando scrypt (mesmo método usado no servidor)
const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Interface para o usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function migrateUsersToSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('⚠️ Credenciais do Supabase não configuradas corretamente!');
    process.exit(1);
  }

  console.log('Iniciando migração de usuários para o Supabase...');
  
  try {
    // Criar cliente do Supabase com chave de service_role (admin)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Buscar todos os usuários do banco de dados
    console.log('Buscando usuários existentes no banco de dados...');
    const dbUsers = await db.select().from(users);
    
    if (dbUsers.length === 0) {
      console.log('Nenhum usuário encontrado no banco de dados.');
      process.exit(0);
    }
    
    console.log(`Encontrados ${dbUsers.length} usuários para migração.`);
    
    // Confirmar com o usuário se deseja prosseguir
    const confirm = await question(`Deseja migrar todos os ${dbUsers.length} usuários para o Supabase? (S/N): `);
    
    if (confirm.toLowerCase() !== 's') {
      console.log('Migração cancelada pelo usuário.');
      process.exit(0);
    }
    
    // Definir senha padrão para todos os usuários migrados
    const defaultPassword = await question('Definir senha padrão para todos os usuários migrados: ');
    
    if (defaultPassword.length < 6) {
      console.error('A senha deve ter pelo menos 6 caracteres.');
      process.exit(1);
    }
    
    console.log('\nIniciando migração de usuários...');
    
    const results = {
      success: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{id: number, email: string, status: string, message?: string}>
    };
    
    // Para cada usuário no banco
    for (const user of dbUsers) {
      console.log(`Migrando usuário ${user.email}...`);
      
      try {
        // 1. Verificar se o usuário já existe no Supabase
        const { data: existingUsers, error: checkError } = await supabase
          .auth.admin.listUsers();
        
        if (checkError) {
          console.error(`Erro ao verificar usuário ${user.email}:`, checkError.message);
          results.failed++;
          results.details.push({
            id: user.id,
            email: user.email,
            status: 'falha',
            message: checkError.message
          });
          continue;
        }
        
        const existingUser = existingUsers.users.find(u => u.email === user.email);
        
        if (existingUser) {
          console.log(`Usuário ${user.email} já existe no Supabase, atualizando perfil...`);
          
          // Atualizar o perfil do usuário
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: existingUser.id,
              name: user.name,
              role: user.role,
              sector: user.sector,
              organization_id: user.organizationId,
              updated_at: new Date().toISOString()
            });
            
          if (profileError) {
            console.error(`Erro ao atualizar perfil para ${user.email}:`, profileError.message);
            results.failed++;
            results.details.push({
              id: user.id,
              email: user.email,
              status: 'falha',
              message: profileError.message
            });
          } else {
            console.log(`Perfil atualizado para ${user.email}`);
            results.success++;
            results.details.push({
              id: user.id,
              email: user.email,
              status: 'atualizado'
            });
          }
        } else {
          // 2. Criar o usuário no Supabase
          const { data: authData, error: createError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
              name: user.name
            }
          });
          
          if (createError) {
            console.error(`Erro ao criar usuário ${user.email}:`, createError.message);
            results.failed++;
            results.details.push({
              id: user.id,
              email: user.email,
              status: 'falha',
              message: createError.message
            });
            continue;
          }
          
          // 3. Adicionar dados do perfil
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: authData.user.id,
              name: user.name,
              role: user.role,
              sector: user.sector,
              organization_id: user.organizationId
            });
            
          if (profileError) {
            console.error(`Erro ao criar perfil para ${user.email}:`, profileError.message);
            // Não vamos contar como falha total, pois o usuário foi criado
            results.details.push({
              id: user.id,
              email: user.email,
              status: 'parcial',
              message: `Usuário criado, mas perfil falhou: ${profileError.message}`
            });
          } else {
            console.log(`Usuário ${user.email} migrado com sucesso!`);
            results.success++;
            results.details.push({
              id: user.id,
              email: user.email,
              status: 'sucesso'
            });
          }
        }
      } catch (error: any) {
        console.error(`Erro ao migrar usuário ${user.email}:`, error.message);
        results.failed++;
        results.details.push({
          id: user.id,
          email: user.email,
          status: 'falha',
          message: error.message
        });
      }
    }
    
    // Resumo da migração
    console.log('\n📋 Resumo da migração:');
    console.log(`✅ Sucesso: ${results.success}`);
    console.log(`⚠️ Pulados: ${results.skipped}`);
    console.log(`❌ Falhas: ${results.failed}`);
    
    // Mostrar detalhes das falhas
    if (results.failed > 0) {
      console.log('\nDetalhes das falhas:');
      results.details
        .filter(d => d.status === 'falha')
        .forEach(d => {
          console.log(`- ${d.email}: ${d.message}`);
        });
    }
    
    console.log('\n✅ Migração concluída!');
    console.log('Os usuários estão agora disponíveis no Supabase.');
    console.log('Importante: Os usuários migrados têm a senha padrão definida durante a migração.');
    console.log('Recomenda-se que eles alterem suas senhas após o primeiro login.');
    
  } catch (error: any) {
    console.error('⚠️ Erro durante a migração:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

migrateUsersToSupabase();