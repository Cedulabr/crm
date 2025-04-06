import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { setupTablesSQL } from '../server/services/setup-supabase-sql';

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

async function setupTables() {
  try {
    console.log('🔧 Configurando tabelas no Supabase...');
    
    // Dividir o SQL em comandos separados
    const commands = setupTablesSQL
      .split(';')
      .map(command => command.trim())
      .filter(command => command.length > 0);
      
    console.log(`📊 Executando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`🔍 Executando comando ${i + 1}/${commands.length}`);
      
      try {
        const { error } = await supabase.rpc('execute', { query: command + ';' });
        
        if (error) {
          console.error(`❌ Erro ao executar comando ${i + 1}:`, error);
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso!`);
        }
      } catch (err) {
        console.error(`❌ Exceção ao executar comando ${i + 1}:`, err);
      }
    }
    
    console.log('✨ Configuração de tabelas concluída!');
    
  } catch (error) {
    console.error('❌ Falha ao configurar tabelas:', error);
    throw error;
  }
}

async function runSetup() {
  try {
    console.log('🚀 Iniciando configuração do banco de dados...');
    await setupTables();
    console.log('✅ Configuração do banco de dados concluída com sucesso!');
  } catch (error) {
    console.error('💥 Erro durante a configuração do banco de dados:', error);
  } finally {
    process.exit(0);
  }
}

runSetup();