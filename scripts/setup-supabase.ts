import { main as setupSupabaseTables } from '../server/services/setup-supabase-sql';

async function main() {
  try {
    console.log('Iniciando configuração do Supabase...');
    const result = await setupSupabaseTables();
    if (result.success) {
      console.log('Configuração do Supabase concluída com sucesso.');
      process.exit(0);
    } else {
      console.error('Erro na configuração do Supabase:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Erro na configuração do Supabase:', error);
    process.exit(1);
  }
}

main();