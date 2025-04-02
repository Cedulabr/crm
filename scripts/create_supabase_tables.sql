-- Script SQL para criar as tabelas no Supabase

-- Tabela de Organizações
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

-- Tabela de Usuários
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

-- Tabela de Convênios
CREATE TABLE IF NOT EXISTS public.convenios (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT
);

-- Tabela de Bancos
CREATE TABLE IF NOT EXISTS public.banks (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT
);

-- Tabela de Clientes
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

-- Tabela de Propostas
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

-- Tabela de Kanban
CREATE TABLE IF NOT EXISTS public.kanban (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES public.clients(id),
    column TEXT NOT NULL,
    position INTEGER NOT NULL
);

-- Inserir dados de produtos padrão
INSERT INTO public.products (name, price)
VALUES 
    ('Novo empréstimo', 'R$ 1.000,00'),
    ('Refinanciamento', 'R$ 5.000,00'),
    ('Portabilidade', 'R$ 2.000,00'),
    ('Cartão de Crédito', 'R$ 500,00'),
    ('Saque FGTS', 'R$ 1.200,00')
ON CONFLICT (id) DO NOTHING;

-- Inserir dados de convênios padrão
INSERT INTO public.convenios (name, price)
VALUES 
    ('Beneficiário do INSS', 'R$ 3.000,00'),
    ('Servidor Público', 'R$ 5.000,00'),
    ('LOAS/BPC', 'R$ 1.500,00'),
    ('Carteira assinada CLT', 'R$ 4.000,00')
ON CONFLICT (id) DO NOTHING;

-- Inserir dados de bancos padrão
INSERT INTO public.banks (name, price)
VALUES 
    ('BANRISUL', 'R$ 2.500,00'),
    ('BMG', 'R$ 3.000,00'),
    ('C6 BANK', 'R$ 1.800,00'),
    ('DAYCOVAL', 'R$ 2.200,00'),
    ('ITAÚ', 'R$ 4.500,00'),
    ('SAFRA', 'R$ 2.800,00')
ON CONFLICT (id) DO NOTHING;

-- Inserir organização padrão
INSERT INTO public.organizations (name, address, phone, email, description)
VALUES ('Empresa Padrão', 'Av. Principal, 1000', '(71) 99999-9999', 'contato@empresa.com', 'Organização padrão do sistema')
ON CONFLICT (id) DO NOTHING;

-- Inserir usuário admin padrão (senha: senha123)
INSERT INTO public.users (name, email, role, organization_id, password)
VALUES ('Administrador', 'admin@empresa.com', 'superadmin', 1, 'f7fed5c7c97ac4f1c65ca9a9c4ea17d0ca05e2cca40d27bc88cd1ab82c64d47b.a0dbbe07cf3ffc1c62b7d49d43bc98d9')
ON CONFLICT (id) DO NOTHING;