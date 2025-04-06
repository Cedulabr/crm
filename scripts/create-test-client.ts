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

async function createTestClient() {
  try {
    // Podemos usar IDs fixos para a organização e usuário admin que já sabemos que existem
    const organizationId = 1; // Sabemos que a organização com ID 1 existe
    const userId = '4fd63751-d7f7-47b0-a002-dc2ad8b32e70'; // ID do usuário admin

    // Criando cliente usando os campos exatos do banco de dados
    const testClient = {
      name: "Cliente Teste Supabase",
      cpf: "123.456.789-00",
      phone: "(71)99999-9999",
      birth_date: "01/01/1980", // Nome correto do campo
      contact: "Contato Teste",
      email: "cliente.teste@example.com",
      company: "Empresa Teste",
      created_by_id: userId, // Nome correto do campo
      organization_id: organizationId, // Nome correto do campo
    };
    
    console.log('✨ Criando cliente de teste...', testClient);
    
    // Usando o fetch diretamente com a API REST do Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testClient)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro na resposta da API:', response.status, response.statusText);
      console.error('Detalhes:', result);
      throw new Error(`Erro ao criar cliente: ${response.status} ${response.statusText}`);
    }
    
    console.log('✅ Cliente de teste criado com sucesso!');
    console.log(result);
    
    // Buscando clientes para confirmar
    console.log('🔍 Verificando clientes existentes...');
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*');
      
    if (error) {
      console.error('❌ Erro ao buscar clientes:', error);
    } else {
      console.log(`📊 Total de clientes: ${clients?.length || 0}`);
      console.log('📄 Lista de clientes:', clients);
    }
    
  } catch (error) {
    console.error('❌ Falha ao criar cliente de teste:', error);
  }
}

createTestClient();