/**
 * SQL para criar as tabelas no Supabase
 * Este script gera o SQL necessário para criar as tabelas no banco de dados Supabase
 */

export const setupTablesSQL = `
-- Organizações
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

-- Usuários
-- Nota: Tabela users depende da tabela auth.users do Supabase que já existe
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

-- Convênios
CREATE TABLE IF NOT EXISTS convenios (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bancos
CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  birth_date TEXT,
  contact TEXT,
  company TEXT,
  convenio_id INTEGER REFERENCES convenios(id),
  created_by_id UUID REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Propostas
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

-- Modelos de Formulários
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

-- Submissões de Formulários
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

-- Adicionar políticas de segurança RLS (Row Level Security)
-- Apenas ative estas políticas após criar e entender bem o impacto delas

-- Política para organizações: apenas superadmins podem gerenciar
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_organizations ON organizations
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY insert_organizations ON organizations
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'superadmin'
  );

CREATE POLICY update_organizations ON organizations
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'superadmin'
  );

CREATE POLICY delete_organizations ON organizations
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'superadmin'
  );

-- Política para usuários: cada usuário vê apenas sua organização
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_organization_users ON users
  FOR SELECT USING (
    -- Superadmin vê todos
    (auth.jwt() ->> 'role' = 'superadmin') OR
    -- Manager vê apenas usuários da sua organização
    (auth.jwt() ->> 'role' = 'manager' AND organization_id = (auth.jwt() ->> 'organization_id')::integer) OR
    -- Agente vê apenas ele mesmo
    (id = auth.uid())
  );

-- E assim por diante para cada tabela...
`;

/**
 * SQL para consultar tabelas e colunas existentes
 */
export const checkTablesSQL = `
SELECT
  t.table_name,
  ARRAY_AGG(
    c.column_name || ' ' || 
    c.data_type || 
    CASE 
      WHEN c.character_maximum_length IS NOT NULL THEN '(' || c.character_maximum_length || ')'
      ELSE ''
    END ||
    CASE 
      WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
      ELSE ''
    END
  ) AS columns
FROM
  information_schema.tables t
JOIN
  information_schema.columns c ON t.table_name = c.table_name
WHERE
  t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN (
    'organizations', 'users', 'clients', 'products', 
    'convenios', 'banks', 'proposals', 
    'form_templates', 'form_submissions'
  )
GROUP BY
  t.table_name
ORDER BY
  t.table_name;
`;

/**
 * SQL para criar uma organização padrão
 */
export const createDefaultOrganizationSQL = `
INSERT INTO organizations (name, cnpj, address, phone, email, website, logo_url)
VALUES (
  'Organização Padrão',
  '12.345.678/0001-90',
  'Avenida Principal, 1000',
  '(71) 3333-4444',
  'contato@organizacaopadrao.com',
  'www.organizacaopadrao.com',
  'https://placehold.co/100x100'
)
RETURNING id;
`;

/**
 * SQL para criar produtos padrão
 */
export const createDefaultProductsSQL = `
INSERT INTO products (name, price, description)
VALUES 
  ('Novo empréstimo', 'R$ 50.000,00', 'Empréstimo para novos clientes'),
  ('Refinanciamento', 'R$ 20.000,00', 'Refinanciamento de dívidas existentes'),
  ('Portabilidade', 'R$ 100.000,00', 'Transferência de dívidas de outras instituições'),
  ('Cartão de Crédito', 'R$ 10.000,00', 'Limite de cartão de crédito'),
  ('Saque FGTS', 'R$ 5.000,00', 'Antecipação do saque aniversário do FGTS')
RETURNING id;
`;

/**
 * SQL para criar convênios padrão
 */
export const createDefaultConveniosSQL = `
INSERT INTO convenios (name, price, description)
VALUES 
  ('Beneficiário do INSS', 'R$ 3.000,00', 'Aposentados e pensionistas do INSS'),
  ('Servidor Público', 'R$ 5.000,00', 'Funcionários públicos federais, estaduais e municipais'),
  ('LOAS/BPC', 'R$ 1.500,00', 'Beneficiários de prestação continuada'),
  ('Carteira assinada CLT', 'R$ 4.000,00', 'Trabalhadores com carteira assinada')
RETURNING id;
`;

/**
 * SQL para criar bancos padrão
 */
export const createDefaultBanksSQL = `
INSERT INTO banks (name, price, description)
VALUES 
  ('BANRISUL', 'R$ 2.500,00', 'Banco do Estado do Rio Grande do Sul'),
  ('BMG', 'R$ 3.000,00', 'Banco de Minas Gerais'),
  ('C6 BANK', 'R$ 1.800,00', 'Banco digital'),
  ('CAIXA ECONÔMICA FEDERAL', 'R$ 2.000,00', 'Banco federal'),
  ('ITAÚ', 'R$ 4.500,00', 'Banco privado'),
  ('SAFRA', 'R$ 2.800,00', 'Banco privado'),
  ('SANTANDER', 'R$ 3.200,00', 'Banco internacional'),
  ('BRADESCO', 'R$ 3.500,00', 'Banco privado'),
  ('BANCO DO BRASIL', 'R$ 3.000,00', 'Banco federal'),
  ('NUBANK', 'R$ 1.500,00', 'Banco digital')
RETURNING id;
`;

/**
 * SQL para criar a função que permite consultar as colunas de uma tabela
 */
export const createGetTableColumnsSQL = `
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE (column_name TEXT, data_type TEXT, is_nullable BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.column_name::TEXT, c.data_type::TEXT, (c.is_nullable = 'YES')::BOOLEAN
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  AND c.table_name = p_table_name;
END;
$$;
`;