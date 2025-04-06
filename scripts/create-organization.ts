import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase (service role)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('⛔ As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDefaultOrganization() {
  try {
    console.log('🔍 Verificando se já existe uma organização...');
    const { data: existingOrg, error: queryError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
      
    if (queryError) {
      console.error('❌ Erro ao verificar organizações existentes:', queryError);
      throw new Error(`Falha ao verificar organizações: ${queryError.message}`);
    }
    
    if (existingOrg && existingOrg.length > 0) {
      console.log('✅ Organização já existe:', existingOrg[0]);
      return existingOrg[0];
    }
    
    console.log('🏢 Criando organização padrão...');
    const defaultOrganization = {
      name: 'Organização Padrão',
      description: 'Organização padrão do sistema',
      active: true
    };
    
    const { data, error } = await supabase
      .from('organizations')
      .insert(defaultOrganization)
      .select()
      .single();
      
    if (error) {
      console.error('❌ Erro ao criar organização:', error);
      throw new Error(`Falha ao criar organização: ${error.message}`);
    }
    
    console.log('✅ Organização padrão criada com sucesso!', data);
    return data;
    
  } catch (error) {
    console.error('❌ Falha ao criar organização padrão:', error);
    throw error;
  }
}

createDefaultOrganization()
  .then(() => {
    console.log('✨ Processo concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro no processo:', error);
    process.exit(1);
  });