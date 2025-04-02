-- Script para criar tabelas no Supabase/PostgreSQL
-- Este script deve ser executado direto no PostgreSQL por meio do SQL Editor do Supabase

-- Tabela de organizações
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

-- Tabela de usuários
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

-- Tabela de convênios
CREATE TABLE IF NOT EXISTS public.convenios (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT
);

-- Tabela de bancos
CREATE TABLE IF NOT EXISTS public.banks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT
);

-- Tabela de clientes
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

-- Tabela de propostas
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

-- Tabela de kanban
CREATE TABLE IF NOT EXISTS public.kanban (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id),
  "column" TEXT NOT NULL,
  position INTEGER NOT NULL
);

-- Inserir dados iniciais
-- Organização padrão
INSERT INTO public.organizations (name, address, phone, email, description, cnpj, website)
VALUES ('Empresa Teste', 'Av. Principal, 1000', '(71)99999-9999', 'contato@empresa.com', 'Organização padrão do sistema', '12.345.678/0001-90', 'www.empresa.com');

-- Usuário admin padrão (senha: senha123)
INSERT INTO public.users (name, email, role, organization_id, password, sector)
VALUES ('Administrador', 'admin@empresa.com', 'superadmin', 1, 'senha123', 'Administração');

-- Produtos padrão
INSERT INTO public.products (name, price) VALUES
('Novo empréstimo', 'R$ 1.000,00'),
('Refinanciamento', 'R$ 5.000,00'),
('Portabilidade', 'R$ 2.000,00'),
('Cartão de Crédito', 'R$ 500,00'),
('Saque FGTS', 'R$ 1.200,00');

-- Convênios padrão
INSERT INTO public.convenios (name, price) VALUES
('Beneficiário do INSS', 'R$ 3.000,00'),
('Servidor Público', 'R$ 5.000,00'),
('LOAS/BPC', 'R$ 1.500,00'),
('Carteira assinada CLT', 'R$ 4.000,00');

-- Bancos padrão
INSERT INTO public.banks (name, price) VALUES
('BANRISUL', 'R$ 2.500,00'),
('BMG', 'R$ 3.000,00'),
('C6 BANK', 'R$ 1.800,00'),
('DAYCOVAL', 'R$ 2.200,00'),
('ITAÚ', 'R$ 4.500,00'),
('SAFRA', 'R$ 2.800,00');

-- Cliente de teste
INSERT INTO public.clients (name, cpf, phone, birth_date, contact, email, company, organization_id, created_by_id, convenio_id)
VALUES ('Cliente Teste', '123.456.789-00', '(71)98765-4321', '1980-01-01', 'Contato do cliente', 'cliente@teste.com', 'Empresa do cliente', 1, 1, 1);

-- Proposta de teste
INSERT INTO public.proposals (client_id, product_id, convenio_id, bank_id, value, comments, status, created_by_id, organization_id)
VALUES (1, 1, 1, 2, 'R$ 10.000,00', 'Proposta de teste', 'Em análise', 1, 1);

-- Entrada de kanban para o cliente
INSERT INTO public.kanban (client_id, "column", position)
VALUES (1, 'Prospecção', 1);