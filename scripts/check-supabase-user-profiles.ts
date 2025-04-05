import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserProfiles() {
  console.log('Verificando perfis de usuário no Supabase...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: SUPABASE_URL ou SUPABASE_KEY não estão configurados no arquivo .env');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Verificar o usuário atual
    console.log('\n----- Usuário atual no Supabase -----');
    const { data: userSession, error: userError } = await supabase.auth.getSession();
    
    if (userError) {
      console.error('Erro ao obter usuário atual:', userError.message);
    } else if (userSession.session) {
      console.log('Usuário atual:');
      console.log(`ID: ${userSession.session.user.id}`);
      console.log(`Email: ${userSession.session.user.email}`);
      console.log(`Criado em: ${userSession.session.user.created_at}`);
      console.log(`Dados do usuário:`, userSession.session.user.user_metadata);
    } else {
      console.log('Nenhuma sessão ativa encontrada');
    }
    
    // Verificar tabelas disponíveis no Supabase
    console.log('\n----- Tabelas disponíveis no Supabase -----');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('Erro ao obter tabelas:', tablesError.message);
    } else {
      console.log('Tabelas encontradas:');
      tables.forEach(table => {
        console.log(`- ${table.tablename}`);
      });
    }
    
    // Verificar perfis de usuário na tabela user_profiles
    console.log('\n----- Perfis de usuário no Supabase (tabela user_profiles) -----');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profileError) {
      console.error('Erro ao obter perfis de usuário:', profileError.message);
    } else if (!profiles) {
      console.log('Nenhum perfil de usuário encontrado');
    } else {
      console.log(`Total de perfis: ${profiles.length}`);
      
      profiles.forEach((profile, index) => {
        console.log(`\nPerfil ${index + 1}:`);
        console.log(`ID: ${profile.id}`);
        console.log(`Nome: ${profile.name}`);
        console.log(`Papel: ${profile.role}`);
        console.log(`Setor: ${profile.sector}`);
        console.log(`ID da Organização: ${profile.organization_id}`);
        console.log(`Criado em: ${profile.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar dados do Supabase:', error);
  }
}

checkUserProfiles();