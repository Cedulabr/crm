-- Criação da tabela de organizações
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

-- Criação da tabela de usuários linkada ao auth
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

-- Criação da tabela de clientes
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

-- Criação da tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de convênios
CREATE TABLE IF NOT EXISTS convenios (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de bancos
CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de propostas
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

-- Criação da tabela de templates de formulários
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

-- Criação da tabela de submissões de formulários
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
