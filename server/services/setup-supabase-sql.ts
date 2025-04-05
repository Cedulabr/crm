import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@shared/schema';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são necessárias');
  process.exit(1);
}

// Cliente do Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para executar consultas SQL diretamente
async function executeSQL(query: string): Promise<any> {
  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  
  if (error) {
    console.error('Erro ao executar SQL:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
}

/**
 * Configurar tabelas no Supabase
 */
export async function setupSupabaseTables() {
  try {
    console.log('Iniciando configuração das tabelas no Supabase...');
    
    // 1. Criar tabela de organizações
    console.log('Criando tabela organizations...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        cnpj TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 2. Criar tabela de usuários com referência à autenticação do Supabase
    console.log('Criando tabela users...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT,
        email TEXT UNIQUE,
        role TEXT CHECK (role IN ('superadmin', 'manager', 'agent')),
        sector TEXT,
        organization_id INTEGER REFERENCES organizations(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 3. Criar tabela de clientes
    console.log('Criando tabela clients...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        cpf TEXT,
        birth_date TEXT,
        contact TEXT,
        company TEXT,
        convenio_id INTEGER,
        created_by_id UUID REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 4. Criar tabela de produtos
    console.log('Criando tabela products...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 5. Criar tabela de convênios
    console.log('Criando tabela convenios...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS convenios (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 6. Criar tabela de bancos
    console.log('Criando tabela banks...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS banks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 7. Criar tabela de propostas
    console.log('Criando tabela proposals...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS proposals (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        product_id INTEGER REFERENCES products(id),
        convenio_id INTEGER REFERENCES convenios(id),
        bank_id INTEGER REFERENCES banks(id),
        value TEXT,
        installments INTEGER,
        status TEXT,
        notes TEXT,
        created_by_id UUID REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 8. Criar tabela de templates de formulários
    console.log('Criando tabela form_templates...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS form_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        fields JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_by_id UUID REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 9. Criar tabela de submissões de formulários
    console.log('Criando tabela form_submissions...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES form_templates(id),
        form_data JSONB,
        client_id INTEGER REFERENCES clients(id),
        status TEXT,
        processed_by_id UUID REFERENCES users(id),
        processed_at TIMESTAMP WITH TIME ZONE,
        organization_id INTEGER REFERENCES organizations(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    console.log('Configuração das tabelas no Supabase concluída com sucesso.');
    
    // Criar organização padrão se não existir
    console.log('Verificando se existe organização padrão...');
    const { data: orgs, error: orgCheckError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
      
    if (orgCheckError) {
      console.error('Erro ao verificar organizações:', orgCheckError);
    } else if (!orgs || orgs.length === 0) {
      console.log('Criando organização padrão...');
      const { data: newOrg, error: newOrgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Organização Padrão',
          cnpj: '12.345.678/0001-90',
          address: 'Avenida Presidente Vargas, 1000',
          phone: '(71) 3333-4444',
          email: 'contato@organizacaopadrao.com',
          website: 'www.organizacaopadrao.com',
          logo_url: 'https://placehold.co/100x100'
        })
        .select()
        .single();
        
      if (newOrgError) {
        console.error('Erro ao criar organização padrão:', newOrgError);
      } else {
        console.log('Organização padrão criada com sucesso:', newOrg?.name);
      }
    } else {
      console.log('Organização padrão já existe.');
    }
    
    // Criar dados de teste
    await createTestData();
    
  } catch (error) {
    console.error('Erro na configuração das tabelas:', error);
  }
}

/**
 * Criar dados de teste no Supabase
 */
async function createTestData() {
  try {
    console.log('Criando dados de teste...');
    
    // 1. Verificar se já existem bancos
    const { data: banks, error: banksError } = await supabase
      .from('banks')
      .select('*')
      .limit(1);
      
    if (banksError) {
      console.error('Erro ao verificar bancos:', banksError);
    } else if (!banks || banks.length === 0) {
      console.log('Criando bancos de teste...');
      
      const bankData = [
        { name: 'BANRISUL', price: 'R$ 2.500,00' },
        { name: 'BMG', price: 'R$ 3.000,00' },
        { name: 'C6 BANK', price: 'R$ 1.800,00' },
        { name: 'CAIXA ECONÔMICA FEDERAL', price: 'R$ 2.000,00' },
        { name: 'ITAÚ', price: 'R$ 4.500,00' },
        { name: 'SAFRA', price: 'R$ 2.800,00' },
        { name: 'SANTANDER', price: 'R$ 3.200,00' },
        { name: 'BRADESCO', price: 'R$ 3.500,00' },
        { name: 'BANCO DO BRASIL', price: 'R$ 3.000,00' },
        { name: 'NUBANK', price: 'R$ 1.500,00' }
      ];
      
      const { data: newBanks, error: newBanksError } = await supabase
        .from('banks')
        .insert(bankData)
        .select();
        
      if (newBanksError) {
        console.error('Erro ao criar bancos de teste:', newBanksError);
      } else {
        console.log(`${newBanks?.length || 0} bancos de teste criados.`);
      }
    } else {
      console.log('Bancos já existem, pulando criação.');
    }
    
    // 2. Verificar se já existem convênios
    const { data: convenios, error: conveniosError } = await supabase
      .from('convenios')
      .select('*')
      .limit(1);
      
    if (conveniosError) {
      console.error('Erro ao verificar convênios:', conveniosError);
    } else if (!convenios || convenios.length === 0) {
      console.log('Criando convênios de teste...');
      
      const convenioData = [
        { name: 'Beneficiário do INSS', price: 'R$ 3.000,00' },
        { name: 'Servidor Público', price: 'R$ 5.000,00' },
        { name: 'LOAS/BPC', price: 'R$ 1.500,00' },
        { name: 'Carteira assinada CLT', price: 'R$ 4.000,00' }
      ];
      
      const { data: newConvenios, error: newConveniosError } = await supabase
        .from('convenios')
        .insert(convenioData)
        .select();
        
      if (newConveniosError) {
        console.error('Erro ao criar convênios de teste:', newConveniosError);
      } else {
        console.log(`${newConvenios?.length || 0} convênios de teste criados.`);
      }
    } else {
      console.log('Convênios já existem, pulando criação.');
    }
    
    // 3. Verificar se já existem produtos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
      
    if (productsError) {
      console.error('Erro ao verificar produtos:', productsError);
    } else if (!products || products.length === 0) {
      console.log('Criando produtos de teste...');
      
      const productData = [
        { name: 'Novo empréstimo', price: 'R$ 1.000,00' },
        { name: 'Refinanciamento', price: 'R$ 5.000,00' },
        { name: 'Portabilidade', price: 'R$ 2.000,00' },
        { name: 'Cartão de Crédito', price: 'R$ 500,00' },
        { name: 'Saque FGTS', price: 'R$ 1.200,00' }
      ];
      
      const { data: newProducts, error: newProductsError } = await supabase
        .from('products')
        .insert(productData)
        .select();
        
      if (newProductsError) {
        console.error('Erro ao criar produtos de teste:', newProductsError);
      } else {
        console.log(`${newProducts?.length || 0} produtos de teste criados.`);
      }
    } else {
      console.log('Produtos já existem, pulando criação.');
    }
    
    // Verificar usuário administrador
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();
      
    if (orgError) {
      console.error('Erro ao buscar organização:', orgError);
      return;
    }
    
    // Verificar se já existe um usuário admin
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', UserRole.SUPERADMIN)
      .limit(1);
      
    if (usersError) {
      console.error('Erro ao verificar usuários:', usersError);
    } else if (!users || users.length === 0) {
      console.log('Criando usuário administrador de teste...');
      
      try {
        // Criar usuário na autenticação do Supabase
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: 'admin@example.com',
          password: 'Admin@123',
          email_confirm: true,
          user_metadata: {
            name: 'Administrador',
            role: UserRole.SUPERADMIN,
            organization_id: orgData.id
          }
        });
        
        if (authError) {
          console.error('Erro ao criar usuário na autenticação do Supabase:', authError);
        } else if (authUser?.user) {
          // Criar perfil do usuário
          const { data: newUser, error: newUserError } = await supabase
            .from('users')
            .insert({
              id: authUser.user.id,
              name: 'Administrador',
              email: 'admin@example.com',
              role: UserRole.SUPERADMIN,
              sector: 'Administração',
              organization_id: orgData.id
            })
            .select()
            .single();
            
          if (newUserError) {
            console.error('Erro ao criar perfil do usuário administrador:', newUserError);
          } else {
            console.log('Usuário administrador criado com sucesso:', newUser.email);
          }
        }
      } catch (err) {
        console.error('Erro ao criar usuário administrador:', err);
      }
    } else {
      console.log('Usuário administrador já existe, pulando criação.');
    }
    
    console.log('Criação de dados de teste concluída.');
  } catch (error) {
    console.error('Erro na criação de dados de teste:', error);
  }
}

// Função para executar o script diretamente
export async function main() {
  try {
    await setupSupabaseTables();
    console.log('Script concluído com sucesso.');
    return { success: true };
  } catch (error) {
    console.error('Erro na execução do script:', error);
    return { success: false, error };
  }
}