import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || '';

async function checkSupabaseConfig() {
  console.log('Verificando configuração do Supabase...');
  console.log('SUPABASE_URL:', SUPABASE_URL);
  console.log('SUPABASE_KEY:', SUPABASE_KEY ? SUPABASE_KEY.substring(0, 10) + '...' : 'Não configurado');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('⚠️ Credenciais do Supabase não configuradas corretamente!');
    process.exit(1);
  }

  try {
    // Criar cliente do Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Verificar conexão
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('⚠️ Erro ao conectar com Supabase:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    
    // Verificar configuração de autenticação (tentar criar um usuário de teste)
    console.log('Testando criação de usuário (isso falhará se o email não for válido)...');
    
    // Usando um email de teste - este é apenas para verificar a resposta da API
    const testEmail = 'teste@exemplo.org';
    const testPassword = 'Test@123456';
    
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (userError) {
      if (userError.message.includes('Email address is invalid')) {
        console.log('⚠️ O Supabase está rejeitando registros de email. Isso pode ocorrer por:');
        console.log('   1. O provedor Email/Password não está habilitado no Supabase');
        console.log('   2. Há restrições de domínio de email configuradas');
        console.log('   3. A verificação de email está configurada para ser necessária');
        console.log('\nVerifique as configurações no painel do Supabase em Authentication > Providers > Email');
      } else {
        console.log('⚠️ Erro ao testar criação de usuário:', userError.message);
      }
    } else {
      console.log('✅ API de criação de usuário está funcionando!');
      console.log('Resposta:', userData);
      
      // Se o usuário foi criado, limpe-o
      if (userData.user?.id) {
        console.log('Limpando usuário de teste...');
        // Nota: Você precisa do acesso de service_role para excluir usuários
        // A API pública não permite isso, então o usuário de teste permanecerá
      }
    }
    
    console.log('\n📋 Resumo da verificação:');
    console.log('- Conexão com Supabase: ✅');
    console.log('- API de autenticação:', userError ? '⚠️ Configuração necessária' : '✅');
    
    // Sugerir próximos passos
    if (userError) {
      console.log('\n🔧 Próximos passos:');
      console.log('1. Acesse o painel do Supabase para seu projeto');
      console.log('2. Vá para Authentication > Providers > Email');
      console.log('3. Certifique-se de que o provedor Email/Password está habilitado');
      console.log('4. Remova quaisquer restrições de domínio de email, se houver');
      console.log('5. Configure a verificação de email de acordo com suas necessidades');
    }
    
  } catch (error) {
    console.error('⚠️ Erro ao verificar configuração do Supabase:', error);
    process.exit(1);
  }
}

checkSupabaseConfig();