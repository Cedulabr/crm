-- Script para criação das tabelas necessárias no Supabase
-- Este script configura a tabela de perfis de usuário e políticas de segurança

-- Criar a tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('agent', 'manager', 'superadmin')),
  sector TEXT NOT NULL CHECK (sector IN ('Comercial', 'Financeiro', 'Operacional')),
  organization_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar o RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso
-- Política para permitir que um usuário veja seu próprio perfil
CREATE POLICY "Allow users to read their own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política para permitir que um usuário atualize seu próprio perfil
CREATE POLICY "Allow users to update their own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Política para permitir que um usuário insira seu próprio perfil
CREATE POLICY "Allow users to insert their own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Política para permitir que gerentes vejam os perfis de sua organização
CREATE POLICY "Allow managers to read organization profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('manager', 'superadmin')
    )
    AND
    (
      organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
      OR
      (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'superadmin'
    )
  );

-- Política para permitir que superadmins gerenciem todos os perfis
CREATE POLICY "Allow superadmins to manage all profiles"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_modified_column();