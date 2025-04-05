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
    
    console.log('1. Verificando tabela de perfis de usuário...');
    
    // Verificar se a tabela de perfis já existe
    const { data: existingProfiles, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log('A tabela de perfis não existe ou não pode ser acessada.');
      console.log('Erro:', checkError.message);
      
      console.log('\nVocê precisará criar a tabela manualmente no console do Supabase.');
      console.log('Use o seguinte SQL:');
      console.log(`
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
      `);
    } else {
      console.log('✅ Tabela de perfis já existe!');
    }
    
    // Agora vamos testar a inserção de um perfil
    console.log('2. Testando inserção na tabela de perfis...');
    const testData = {
      id: '00000000-0000-0000-0000-000000000000', // UUID inválido para teste
      name: 'Test User',
      role: 'agent',
      sector: 'Comercial',
      organization_id: 1
    };
    
    const { error: insertError } = await supabase
      .from('user_profiles')
      .upsert(testData)
      .select();
      
    if (insertError) {
      console.log('Não foi possível inserir dados de teste na tabela.');
      console.log('Erro:', insertError.message);
      console.log('Este erro pode ocorrer devido a referências de chave estrangeira (id -> auth.users).');
    } else {
      console.log('✅ Inserção de teste bem-sucedida!');
      
      // Remover dados de teste
      await supabase
        .from('user_profiles')
        .delete()
        .eq('id', testData.id);
    }
    
    console.log('\n✅ Verificação concluída!');
    console.log('\nPróximos passos:');
    console.log('1. Se a tabela ainda não existir, crie-a manualmente no console do Supabase');
    console.log('2. Registre novos usuários através da interface do aplicativo');
    console.log('3. Use o script de migração para transferir usuários existentes para o Supabase');
    
  } catch (error) {
    console.error('⚠️ Erro ao configurar tabelas no Supabase:', error);
    process.exit(1);
  }
}

setupSupabaseTables();