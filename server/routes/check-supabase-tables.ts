import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Lista de tabelas esperadas no Supabase
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

/**
 * Verifica se todas as tabelas necessárias estão presentes no Supabase
 * e retorna instruções para criar as que estão faltando
 */
export async function checkSupabaseTables(req: Request, res: Response) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      return res.status(500).json({
        message: 'Configuração do Supabase incompleta',
        error: 'SUPABASE_URL e SUPABASE_KEY são necessários',
        setup: {
          required: ['SUPABASE_URL', 'SUPABASE_KEY'],
          instructions: 'Adicione as variáveis de ambiente SUPABASE_URL e SUPABASE_KEY no arquivo .env'
        }
      });
    }

    // Conectar ao Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Obter lista de tabelas existentes
    // Primeiro método: tentar consultar diretamente as tabelas do sistema pg_tables
    let tablesData;
    let error;
    
    try {
      const result = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
        
      tablesData = result.data;
      error = result.error;
      
      // Se esse método falhar, vamos usar um método alternativo
      if (error) {
        console.log('Método primário falhou, tentando método alternativo para listar tabelas');
        
        // Método alternativo: tentar consultar cada tabela individualmente
        tablesData = [];
        
        for (const tableName of EXPECTED_TABLES) {
          try {
            // Tentar obter um registro da tabela para ver se ela existe
            const { error: tableError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            // Se não houver erro, a tabela existe
            if (!tableError || tableError.code !== 'PGRST116') {
              tablesData.push({ tablename: tableName });
            }
          } catch (e) {
            // Tabela não existe ou não é acessível
            console.log(`Tabela ${tableName} não existe ou não é acessível`);
          }
        }
        
        // Limpar o erro, pois usamos um método alternativo
        error = null;
      }
    } catch (e) {
      console.error('Erro ao verificar tabelas:', e);
      error = {
        message: 'Erro ao verificar tabelas no Supabase',
        details: e instanceof Error ? e.message : String(e)
      };
    }

    if (error) {
      console.error('Erro ao verificar tabelas:', error);
      return res.status(500).json({
        message: 'Erro ao verificar tabelas no Supabase',
        error: error.message,
        setup: {
          instructions: 'Verifique se você está usando as credenciais corretas do Supabase e tem permissão para acessar informações sobre tabelas.'
        }
      });
    }

    // Extrair nomes das tabelas
    const existingTables = tablesData?.map(t => t.tablename) || [];
    
    // Encontrar tabelas que estão faltando
    const missingTables = EXPECTED_TABLES.filter(t => !existingTables.includes(t));

    // Se todas as tabelas existirem, retorne OK
    if (missingTables.length === 0) {
      return res.status(200).json({
        message: 'Todas as tabelas necessárias estão presentes no Supabase',
        status: 'OK',
        tables: EXPECTED_TABLES
      });
    }

    // Se faltarem tabelas, retorne instruções para criá-las
    const sqlStatements = generateCreateTablesSql(missingTables);

    res.status(200).json({
      message: 'Algumas tabelas necessárias estão faltando no Supabase',
      status: 'INCOMPLETE',
      missingTables,
      setup: {
        instructions: 'Acesse o console do Supabase, vá para a seção SQL Editor e execute os seguintes comandos SQL para criar as tabelas faltantes:',
        sqlStatements
      }
    });
  } catch (error) {
    console.error('Erro ao verificar tabelas do Supabase:', error);
    res.status(500).json({
      message: 'Erro ao verificar tabelas do Supabase',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Gera comandos SQL para criar as tabelas faltantes
 */
function generateCreateTablesSql(missingTables: string[]): { [key: string]: string } {
  const sqlCommands: { [key: string]: string } = {};
  
  // SQL para criar cada tabela faltante
  for (const table of missingTables) {
    switch (table) {
      case 'organizations':
        sqlCommands.organizations = `-- Criar tabela de organizações
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
        break;
        
      case 'users':
        sqlCommands.users = `-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('agent', 'manager', 'superadmin')) NOT NULL DEFAULT 'agent',
  sector TEXT CHECK (sector IN ('Comercial', 'Operacional', 'Financeiro')),
  active BOOLEAN DEFAULT TRUE,
  "profilePicture" TEXT,
  "organizationId" INTEGER REFERENCES organizations(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
        break;
        
      case 'clients':
        sqlCommands.clients = `-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  "birthDate" DATE,
  contact TEXT,
  company TEXT,
  "convenioId" INTEGER,
  "createdById" INTEGER REFERENCES users(id),
  "organizationId" INTEGER REFERENCES organizations(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
        break;
        
      case 'products':
        sqlCommands.products = `-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "maxValue" DECIMAL(10,2)
);

-- Inserir produtos padrão
INSERT INTO products (name, description, "maxValue")
VALUES 
  ('Novo empréstimo', 'Empréstimo para novos clientes', 50000),
  ('Refinanciamento', 'Refinanciamento de empréstimos existentes', 20000),
  ('Portabilidade', 'Transferência de empréstimo de outra instituição', 100000),
  ('Cartão de Crédito', 'Cartão de crédito com limite pré-aprovado', 10000),
  ('Saque FGTS', 'Antecipação do saque-aniversário do FGTS', 5000)
ON CONFLICT (id) DO NOTHING;`;
        break;
        
      case 'convenios':
        sqlCommands.convenios = `-- Criar tabela de convênios
CREATE TABLE IF NOT EXISTS convenios (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Inserir convênios padrão
INSERT INTO convenios (name, description)
VALUES 
  ('Beneficiário do INSS', 'Aposentados e pensionistas do INSS'),
  ('Servidor Público', 'Funcionários públicos federais, estaduais e municipais'),
  ('LOAS/BPC', 'Beneficiários de programas assistenciais'),
  ('Carteira assinada CLT', 'Trabalhadores com carteira assinada')
ON CONFLICT (id) DO NOTHING;`;
        break;
        
      case 'banks':
        sqlCommands.banks = `-- Criar tabela de bancos
CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT
);

-- Inserir bancos padrão
INSERT INTO banks (name, code)
VALUES 
  ('BANRISUL', '041'),
  ('BMG', '318'),
  ('C6 BANK', '336'),
  ('CAIXA ECONÔMICA FEDERAL', '104'),
  ('DAYCOVAL', '707'),
  ('FACTA', '370'),
  ('ITAU', '341'),
  ('MERCANTIL', '389'),
  ('OLÉ CONSIGNADO', '169'),
  ('PAN', '623'),
  ('SAFRA', '422')
ON CONFLICT (id) DO NOTHING;`;
        break;
        
      case 'proposals':
        sqlCommands.proposals = `-- Criar tabela de propostas
CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  "clientId" INTEGER REFERENCES clients(id) NOT NULL,
  "productId" INTEGER REFERENCES products(id) NOT NULL,
  "convenioId" INTEGER REFERENCES convenios(id),
  "bankId" INTEGER REFERENCES banks(id),
  value DECIMAL(10,2) NOT NULL,
  installments INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  "createdById" INTEGER REFERENCES users(id),
  "organizationId" INTEGER REFERENCES organizations(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
        break;
        
      case 'form_templates':
        sqlCommands.form_templates = `-- Criar tabela de modelos de formulário
CREATE TABLE IF NOT EXISTS form_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,
  "organizationId" INTEGER REFERENCES organizations(id),
  "createdById" INTEGER REFERENCES users(id),
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
        break;
        
      case 'form_submissions':
        sqlCommands.form_submissions = `-- Criar tabela de submissões de formulário
CREATE TABLE IF NOT EXISTS form_submissions (
  id SERIAL PRIMARY KEY,
  "templateId" INTEGER REFERENCES form_templates(id) NOT NULL,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  "processedById" INTEGER REFERENCES users(id),
  "organizationId" INTEGER REFERENCES organizations(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
        break;
    }
  }
  
  return sqlCommands;
}