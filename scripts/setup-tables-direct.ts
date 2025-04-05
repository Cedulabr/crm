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
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Configurar tabelas diretamente no Supabase
 */
async function setupSupabaseTables() {
  try {
    console.log('Iniciando configuração das tabelas no Supabase...');
    
    // Criação de tabelas é feita apenas no console do Supabase ou via migração de banco
    // O cliente REST não permite criar tabelas diretamente
    console.log('⚠️ AVISO: As tabelas a seguir precisam ser criadas no console do Supabase:');
    console.log(`
1. organizations:
   - id: serial primary key
   - name: text not null
   - cnpj: text
   - address: text
   - phone: text
   - email: text
   - website: text
   - logo_url: text
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()

2. users:
   - id: uuid primary key references auth.users(id) on delete cascade
   - name: text
   - email: text unique
   - role: text check (role in ('superadmin', 'manager', 'agent'))
   - sector: text
   - organization_id: integer references organizations(id)
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()

3. clients:
   - id: serial primary key
   - name: text not null
   - email: text
   - phone: text
   - cpf: text
   - birth_date: text
   - contact: text
   - company: text
   - convenio_id: integer
   - created_by_id: uuid references users(id)
   - organization_id: integer references organizations(id)
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()

4. products:
   - id: serial primary key
   - name: text not null
   - price: text
   - description: text
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()

5. convenios:
   - id: serial primary key
   - name: text not null
   - price: text
   - description: text
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()

6. banks:
   - id: serial primary key
   - name: text not null
   - price: text
   - description: text
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()

7. proposals:
   - id: serial primary key
   - client_id: integer references clients(id)
   - product_id: integer references products(id)
   - convenio_id: integer references convenios(id)
   - bank_id: integer references banks(id)
   - value: text
   - installments: integer
   - status: text
   - notes: text
   - created_by_id: uuid references users(id)
   - organization_id: integer references organizations(id)
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()

8. form_templates:
   - id: serial primary key
   - name: text not null
   - description: text
   - fields: jsonb
   - is_active: boolean default true
   - created_by_id: uuid references users(id)
   - organization_id: integer references organizations(id)
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()

9. form_submissions:
   - id: serial primary key
   - template_id: integer references form_templates(id)
   - form_data: jsonb
   - client_id: integer references clients(id)
   - status: text
   - processed_by_id: uuid references users(id)
   - processed_at: timestamp with time zone
   - organization_id: integer references organizations(id)
   - created_at: timestamp with time zone default now()
   - updated_at: timestamp with time zone default now()
    `);
    
    // Verificar quais tabelas existem
    console.log('Verificando tabelas existentes...');
    const { data: tables, error: tablesError } = await supabase
      .from('_tables')
      .select('*');
      
    if (tablesError) {
      console.error('Erro ao verificar tabelas:', tablesError);
    } else {
      console.log('Tabelas encontradas:', tables);
    }
    
    // Verificar se a tabela organizations existe e se podemos inserir dados
    const { count, error: orgCountError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    
    if (orgCountError) {
      console.error('Erro ao verificar tabela organizations:', orgCountError);
      console.log('A tabela organizations provavelmente não existe ainda. Por favor, crie as tabelas manualmente no console do Supabase.');
    } else {
      console.log(`A tabela organizations existe e contém ${count} registros.`);
      
      // Se a tabela existe, podemos prosseguir com a criação de dados iniciais
      if (count === 0) {
        // Criar organização padrão
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
          console.log('Organização padrão criada com sucesso:', newOrg.name);
          await createTestData();
        }
      } else {
        console.log('Organizações já existem, verificando dados de teste...');
        await createTestData();
      }
    }
    
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

// Executar a função principal
async function main() {
  try {
    await setupSupabaseTables();
    console.log('Script concluído com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('Erro na execução do script:', error);
    process.exit(1);
  }
}

main();