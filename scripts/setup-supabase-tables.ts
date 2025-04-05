import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || '';

// No Supabase, vamos usar o serviço de autenticação embutido para gerenciar usuários
// e criar tabelas personalizadas para armazenar dados adicionais relacionados aos usuários

async function setupSupabaseTables() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('⚠️ Credenciais do Supabase não configuradas corretamente!');
    process.exit(1);
  }

  console.log('Configurando tabelas no Supabase...');
  
  try {
    // Criar cliente do Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('1. Criando tabela de perfis de usuário...');
    
    // Verificar se a tabela de perfis já existe
    const { data: existingProfiles, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('Erro ao verificar tabela de perfis:', checkError);
      process.exit(1);
    }
    
    // Se a tabela não existir, criá-la
    if (!existingProfiles) {
      // Nota: Normalmente, usaríamos migrations do Supabase, mas neste caso
      // estamos usando a API diretamente para fins de demonstração
      
      // No supabase, precisamos usar o SQL executor para criar tabelas
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS user_profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'agent',
            sector VARCHAR(50),
            organization_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Adicionar políticas RLS para a tabela de perfis
          ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
          
          -- Política para permitir que usuários vejam seus próprios perfis
          CREATE POLICY "Users can view their own profile"
            ON user_profiles
            FOR SELECT
            USING (auth.uid() = id);
          
          -- Política para permitir que usuários atualizem seus próprios perfis
          CREATE POLICY "Users can update their own profile"
            ON user_profiles
            FOR UPDATE
            USING (auth.uid() = id);
          
          -- Função de trigger para atualizar o timestamp 'updated_at'
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
          
          -- Trigger para atualizar o timestamp 'updated_at'
          CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `
      });
      
      if (createError) {
        console.error('Erro ao criar tabela de perfis:', createError);
        console.log('Nota: Se o erro for relacionado a permissões ou RLS, pode ser necessário configurar manualmente no console do Supabase.');
      } else {
        console.log('✅ Tabela de perfis criada com sucesso!');
      }
    } else {
      console.log('✅ Tabela de perfis já existe!');
    }
    
    console.log('\n✅ Configuração concluída!');
    console.log('As tabelas necessárias foram configuradas no Supabase.');
    console.log('\nAgora você pode:');
    console.log('1. Registrar novos usuários através da interface do aplicativo');
    console.log('2. Usar o script de migração para transferir usuários existentes para o Supabase');
    
  } catch (error) {
    console.error('⚠️ Erro ao configurar tabelas no Supabase:', error);
    process.exit(1);
  }
}

setupSupabaseTables();