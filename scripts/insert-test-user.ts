import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuração do Supabase (usando service role key)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('⛔ As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestUser() {
  try {
    const userId = '4fd63751-d7f7-47b0-a002-dc2ad8b32e70'; // ID do usuário admin
    const organizationId = 1; // ID da organização padrão

    // Verificando se o usuário já existe na tabela users
    console.log('🔍 Verificando se o usuário já existe na tabela users...');
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);

    if (queryError) {
      console.error('❌ Erro ao consultar usuário:', queryError);
      throw new Error(`Falha ao consultar usuário: ${queryError.message}`);
    }

    if (existingUser && existingUser.length > 0) {
      console.log('✅ Usuário já existe na tabela users:', existingUser[0]);
      return existingUser[0];
    }

    // Criando o usuário na tabela users
    console.log('🔧 Criando usuário na tabela users...');
    const userData = {
      id: userId,
      name: 'Admin',
      email: 'contato@werkonnect.com',
      role: 'superadmin',
      sector: 'Comercial',
      organization_id: organizationId
    };

    // Usando o fetch diretamente com a API REST do Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(userData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Erro na resposta da API:', response.status, response.statusText);
      console.error('Detalhes:', result);
      throw new Error(`Erro ao criar usuário: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Usuário criado com sucesso na tabela users!');
    console.log(result);

    return result;
  } catch (error) {
    console.error('❌ Falha ao inserir usuário de teste:', error);
    throw error;
  }
}

insertTestUser()
  .then(() => {
    console.log('✨ Processo concluído com sucesso!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });