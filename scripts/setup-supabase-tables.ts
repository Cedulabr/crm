import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function setupSupabaseTables() {
  console.log('Configurando tabelas no Supabase...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: SUPABASE_URL ou SUPABASE_KEY não estão configurados no arquivo .env');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Criar tabela user_profiles (se não existir)
    console.log('Criando tabela user_profiles...');
    
    const { error: createTableError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.user_profiles (
          id UUID PRIMARY KEY,
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
        DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.user_profiles;
        CREATE POLICY "Allow users to read their own profile"
          ON public.user_profiles
          FOR SELECT
          TO authenticated
          USING (auth.uid() = id);

        -- Política para permitir que um usuário atualize seu próprio perfil
        DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.user_profiles;
        CREATE POLICY "Allow users to update their own profile"
          ON public.user_profiles
          FOR UPDATE
          TO authenticated
          USING (auth.uid() = id);

        -- Política para permitir que um usuário insira seu próprio perfil
        DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.user_profiles;
        CREATE POLICY "Allow users to insert their own profile"
          ON public.user_profiles
          FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = id);

        -- Política para permitir que gerentes vejam os perfis de sua organização
        DROP POLICY IF EXISTS "Allow managers to read organization profiles" ON public.user_profiles;
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
        DROP POLICY IF EXISTS "Allow superadmins to manage all profiles" ON public.user_profiles;
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
      `
    });
    
    if (createTableError) {
      console.error('Erro ao criar tabela:', createTableError.message);
      
      // Veremos se podemos fazer algo mais simples
      console.log('Tentando criação mais simples da tabela...');
      
      const { error: simpleCreateError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (simpleCreateError && simpleCreateError.code === '42P01') {
        // Tabela não existe, vamos criar de forma mais simples
        const { error: createError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS public.user_profiles (
              id UUID PRIMARY KEY,
              name TEXT NOT NULL,
              role TEXT NOT NULL,
              sector TEXT NOT NULL, 
              organization_id INTEGER NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
          `
        });
        
        if (createError) {
          console.error('Erro na criação simplificada:', createError.message);
          console.log('\nIMPORTANTE: Você precisa executar o seguinte SQL no painel do Supabase:');
          console.log(`
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  sector TEXT NOT NULL, 
  organization_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Habilitar acesso básico
CREATE POLICY "Allow authenticated access" ON public.user_profiles
  FOR ALL TO authenticated USING (true);
          `);
        } else {
          console.log('Tabela user_profiles criada com configuração simplificada.');
        }
      } else {
        console.log('A tabela user_profiles já existe.');
      }
    } else {
      console.log('Tabela user_profiles configurada com sucesso!');
    }
    
    // Verificar se a tabela foi criada corretamente
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Erro ao acessar tabela:', testError.message);
    } else {
      console.log('Tabela user_profiles está acessível, contém', testData.length, 'registros.');
    }
    
  } catch (error) {
    console.error('Erro ao configurar tabelas do Supabase:', error);
  }
}

setupSupabaseTables();