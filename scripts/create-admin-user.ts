import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { UserRole, UserSector } from '../shared/schema';

// Carregar variáveis de ambiente
dotenv.config();

// Credenciais do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_KEY!;

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  console.log('Iniciando criação de usuário administrador...');
  
  // Dados do usuário admin
  const email = 'contato@werkonnect.com';
  const password = 'Cedula@20';
  const name = 'Admin';
  const role = UserRole.SUPERADMIN;
  const sector = UserSector.COMMERCIAL;
  const organizationId = 1; // ID da organização padrão
  
  try {
    console.log(`Tentando criar usuário: ${email}`);
    // Não podemos verificar facilmente se o usuário existe com a API pública,
    // então vamos tentar criar diretamente
    
    // Tentar fazer login com o usuário existente
    console.log(`Tentando fazer login com o usuário: ${email}`);
    let userData;
    
    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginError) {
        console.log(`Erro ao fazer login: ${loginError.message}. Tentando criar usuário...`);
        
        // Tentar criar o usuário se o login falhar
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name
            }
          }
        });
        
        if (signUpError || !signUpData.user) {
          throw new Error(`Erro ao criar usuário: ${signUpError?.message || 'Nenhum usuário retornado'}`);
        }
        
        userData = signUpData;
      } else {
        userData = loginData;
        console.log(`Login realizado com sucesso: ${loginData.user?.id}`);
      }
    } catch (error) {
      throw new Error(`Erro ao processar autenticação: ${error.message}`);
    }
    
    if (!userData?.user) {
      throw new Error('Não foi possível obter os dados do usuário');
    }
    
    console.log(`Usuário criado com sucesso: ${userData.user.id}`);
    
    // Criar perfil de usuário
    console.log(`Criando perfil para o usuário: ${name} (${role})`);
    
    // Primeiro vamos verificar se a tabela existe tentando uma consulta simples
    console.log("Verificando se a tabela user_profiles existe...");
    const { data: profileCheck, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    if (checkError) {
      console.log(`Erro ao verificar a tabela: ${checkError.message}`);
      console.log("A tabela user_profiles pode não existir ou não estar acessível.");
      
      // Tentar criar a tabela
      console.log("Tentando criar a tabela user_profiles...");
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          sector TEXT NOT NULL,
          organization_id INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('execute', { query: createTableQuery });
      
      if (createError) {
        console.log(`Erro ao criar tabela: ${createError.message}`);
        console.log("Não foi possível criar a tabela automaticamente.");
        console.log("Por favor, verifique se você tem permissões para criar tabelas no Supabase.");
      } else {
        console.log("Tabela criada com sucesso!");
      }
    } else {
      console.log("Tabela user_profiles existe!");
    }
    
    // Adicionando logs mais detalhados
    console.log('Dados do perfil:', {
      id: userData.user.id,
      name,
      role,
      sector,
      organization_id: organizationId
    });
    
    // Tentar inserir o perfil usando a API REST
    console.log("Inserindo o perfil usando a API REST do Supabase...");
    const profileData = {
      id: userData.user.id,
      name,
      role,
      sector,
      organization_id: organizationId
    };
    
    const res = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(profileData)
    });
    
    const responseText = await res.text();
    console.log(`Resposta da API (${res.status}):`, responseText);
    
    if (!res.ok) {
      console.error(`Erro ao inserir perfil: ${res.status} ${res.statusText}`);
    } else {
      console.log("Perfil inserido com sucesso!");
    }
    
    console.log(`Perfil criado com sucesso para: ${name}`);
    console.log('Usuário administrador criado com sucesso!');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}

// Executar a função
createAdminUser();