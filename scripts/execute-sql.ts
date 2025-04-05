import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são necessárias');
  process.exit(1);
}

// Cliente do Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSqlFile() {
  try {
    // Ler o arquivo SQL
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'create_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Dividir em comandos individuais e limpar comentários
    const sqlCommands = sqlContent
      .split(';')
      .map(command => command.trim())
      .filter(command => command && !command.startsWith('--'));

    console.log(`Executando ${sqlCommands.length} comandos SQL...`);

    // Executar cada comando individualmente
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`Executando comando ${i + 1}/${sqlCommands.length}...`);
      
      // O Supabase pode não suportar execução de SQL diretamente via API Rest
      // Podemos tentar usar o método rpc se houver uma função no banco de dados para isso
      try {
        const { data, error } = await supabase.rpc('execute_sql', { sql_command: command });
        
        if (error) {
          console.error(`Erro ao executar comando ${i + 1}:`, error);
        } else {
          console.log(`Comando ${i + 1} executado com sucesso.`);
        }
      } catch (err) {
        console.error(`Erro ao tentar executar comando ${i + 1}:`, err);
      }
    }

    console.log('Execução SQL concluída.');
    
    // Criar organização padrão se não existir
    console.log('Verificando se existe organização padrão...');
    const { data: orgs, error: orgCheckError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
      
    if (orgCheckError) {
      console.error('Erro ao verificar organizações:', orgCheckError);
    } else if (!orgs || orgs.length === 0) {
      console.log('Criando organização padrão...');
      const { data: newOrg, error: newOrgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Organização Padrão',
          cnpj: '12.345.678/0001-90',
          address: 'Avenida Presidente Vargas, 1000',
          phone: '(71) 3333-4444',
          email: 'contato@organizacaopadrao.com',
          website: 'www.organizacaopadrao.com',
          logo_url: 'https://placehold.co/100x100'
        })
        .select()
        .single();
        
      if (newOrgError) {
        console.error('Erro ao criar organização padrão:', newOrgError);
      } else {
        console.log('Organização padrão criada com sucesso:', newOrg?.name);
      }
    } else {
      console.log('Organização padrão já existe.');
    }

  } catch (error) {
    console.error('Erro ao executar SQL:', error);
    process.exit(1);
  }
}

// Executar o script
executeSqlFile();