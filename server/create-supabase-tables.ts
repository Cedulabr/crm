import { supabase } from './supabase';
import fs from 'fs';
import path from 'path';

async function executarScriptSQL() {
  console.log('Iniciando criação de tabelas no Supabase...');
  
  try {
    // Ler o arquivo SQL
    const scriptPath = path.join(__dirname, '..', 'scripts', 'create_supabase_tables.sql');
    const sqlScript = fs.readFileSync(scriptPath, 'utf8');
    
    // Executar o script SQL
    const { error } = await supabase.rpc('exec_sql', { sql_commands: sqlScript });
    
    if (error) {
      console.error('Erro ao executar o script SQL:', error);
      return false;
    }
    
    console.log('Tabelas criadas com sucesso no Supabase!');
    return true;
  } catch (error) {
    console.error('Erro ao criar tabelas no Supabase:', error);
    return false;
  }
}

// Criar tabelas individualmente, caso o método acima falhe
async function criarTabelas() {
  console.log('Iniciando criação de tabelas individuais no Supabase...');
  
  try {
    // 1. Criar tabela organizations
    console.log('Criando tabela organizations...');
    const { error: errorOrgs } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        cnpj TEXT,
        email TEXT,
        website TEXT,
        description TEXT,
        logo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (errorOrgs) {
      console.error('Erro ao criar tabela organizations:', errorOrgs);
      return false;
    }
    
    // 2. Criar tabela users
    console.log('Criando tabela users...');
    const { error: errorUsers } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'agent',
        sector TEXT,
        organization_id INTEGER REFERENCES public.organizations(id),
        password TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (errorUsers) {
      console.error('Erro ao criar tabela users:', errorUsers);
      return false;
    }
    
    // 3. Criar tabela convenios
    console.log('Criando tabela convenios...');
    const { error: errorConvenios } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.convenios (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT
      );
    `);
    
    if (errorConvenios) {
      console.error('Erro ao criar tabela convenios:', errorConvenios);
      return false;
    }
    
    // 4. Criar tabela products
    console.log('Criando tabela products...');
    const { error: errorProducts } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT
      );
    `);
    
    if (errorProducts) {
      console.error('Erro ao criar tabela products:', errorProducts);
      return false;
    }
    
    // 5. Criar tabela banks
    console.log('Criando tabela banks...');
    const { error: errorBanks } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.banks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT
      );
    `);
    
    if (errorBanks) {
      console.error('Erro ao criar tabela banks:', errorBanks);
      return false;
    }
    
    // 6. Criar tabela clients
    console.log('Criando tabela clients...');
    const { error: errorClients } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        cpf TEXT,
        phone TEXT,
        convenio_id INTEGER REFERENCES public.convenios(id),
        birth_date TEXT,
        contact TEXT,
        email TEXT,
        company TEXT,
        created_by_id INTEGER REFERENCES public.users(id),
        organization_id INTEGER REFERENCES public.organizations(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (errorClients) {
      console.error('Erro ao criar tabela clients:', errorClients);
      return false;
    }
    
    // 7. Criar tabela proposals
    console.log('Criando tabela proposals...');
    const { error: errorProposals } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.proposals (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES public.clients(id),
        product_id INTEGER REFERENCES public.products(id),
        convenio_id INTEGER REFERENCES public.convenios(id),
        bank_id INTEGER REFERENCES public.banks(id),
        value TEXT,
        comments TEXT,
        status TEXT NOT NULL,
        created_by_id INTEGER REFERENCES public.users(id),
        organization_id INTEGER REFERENCES public.organizations(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (errorProposals) {
      console.error('Erro ao criar tabela proposals:', errorProposals);
      return false;
    }
    
    // 8. Criar tabela kanban
    console.log('Criando tabela kanban...');
    const { error: errorKanban } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.kanban (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES public.clients(id),
        column TEXT NOT NULL,
        position INTEGER NOT NULL
      );
    `);
    
    if (errorKanban) {
      console.error('Erro ao criar tabela kanban:', errorKanban);
      return false;
    }
    
    // Inserir dados iniciais
    console.log('Inserindo dados iniciais...');
    
    // Inserir organização padrão
    const { error: errorInsertOrg } = await supabase
      .from('organizations')
      .insert({
        name: 'Empresa Padrão',
        address: 'Av. Principal, 1000',
        phone: '(71) 99999-9999',
        email: 'contato@empresa.com',
        description: 'Organização padrão do sistema'
      });
    
    if (errorInsertOrg) {
      console.error('Erro ao inserir organização padrão:', errorInsertOrg);
    }
    
    // Inserir usuário admin padrão
    const { error: errorInsertUser } = await supabase
      .from('users')
      .insert({
        name: 'Administrador',
        email: 'admin@empresa.com',
        role: 'superadmin',
        organization_id: 1,
        password: 'f7fed5c7c97ac4f1c65ca9a9c4ea17d0ca05e2cca40d27bc88cd1ab82c64d47b.a0dbbe07cf3ffc1c62b7d49d43bc98d9'
      });
    
    if (errorInsertUser) {
      console.error('Erro ao inserir usuário admin padrão:', errorInsertUser);
    }
    
    // Inserir produtos padrão
    const { error: errorInsertProducts } = await supabase
      .from('products')
      .insert([
        { name: 'Novo empréstimo', price: 'R$ 1.000,00' },
        { name: 'Refinanciamento', price: 'R$ 5.000,00' },
        { name: 'Portabilidade', price: 'R$ 2.000,00' },
        { name: 'Cartão de Crédito', price: 'R$ 500,00' },
        { name: 'Saque FGTS', price: 'R$ 1.200,00' }
      ]);
    
    if (errorInsertProducts) {
      console.error('Erro ao inserir produtos padrão:', errorInsertProducts);
    }
    
    // Inserir convênios padrão
    const { error: errorInsertConvenios } = await supabase
      .from('convenios')
      .insert([
        { name: 'Beneficiário do INSS', price: 'R$ 3.000,00' },
        { name: 'Servidor Público', price: 'R$ 5.000,00' },
        { name: 'LOAS/BPC', price: 'R$ 1.500,00' },
        { name: 'Carteira assinada CLT', price: 'R$ 4.000,00' }
      ]);
    
    if (errorInsertConvenios) {
      console.error('Erro ao inserir convênios padrão:', errorInsertConvenios);
    }
    
    // Inserir bancos padrão
    const { error: errorInsertBanks } = await supabase
      .from('banks')
      .insert([
        { name: 'BANRISUL', price: 'R$ 2.500,00' },
        { name: 'BMG', price: 'R$ 3.000,00' },
        { name: 'C6 BANK', price: 'R$ 1.800,00' },
        { name: 'DAYCOVAL', price: 'R$ 2.200,00' },
        { name: 'ITAÚ', price: 'R$ 4.500,00' },
        { name: 'SAFRA', price: 'R$ 2.800,00' }
      ]);
    
    if (errorInsertBanks) {
      console.error('Erro ao inserir bancos padrão:', errorInsertBanks);
    }
    
    console.log('Tabelas e dados iniciais criados com sucesso no Supabase!');
    return true;
  } catch (error) {
    console.error('Erro ao criar tabelas no Supabase:', error);
    return false;
  }
}

// Função para iniciar o processo de criação de tabelas
export async function iniciarCriacaoTabelas() {
  console.log('Verificando se tabelas já existem no Supabase...');
  
  try {
    // Verificar se a tabela organizations já existe
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // Tabela não existe
        console.log('Tabelas não existem. Iniciando criação...');
        
        // Tentar executar o script SQL completo
        const resultadoScript = await executarScriptSQL();
        
        // Se falhar, tentar criar tabelas individualmente
        if (!resultadoScript) {
          console.log('Tentando criar tabelas individualmente...');
          return await criarTabelas();
        }
        
        return resultadoScript;
      } else {
        console.error('Erro ao verificar tabelas no Supabase:', error);
        return false;
      }
    } else {
      console.log('Tabelas já existem no Supabase.');
      return true;
    }
  } catch (error) {
    console.error('Erro ao verificar tabelas no Supabase:', error);
    return false;
  }
}

// Executar a verificação e criação das tabelas
iniciarCriacaoTabelas()
  .then(resultado => {
    if (resultado) {
      console.log('Processo de criação de tabelas concluído com sucesso!');
    } else {
      console.error('Houve erros no processo de criação de tabelas.');
    }
  })
  .catch(error => {
    console.error('Erro durante o processo de criação de tabelas:', error);
  });