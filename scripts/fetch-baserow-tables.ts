/**
 * Script para obter informações sobre as tabelas do Baserow
 * Útil para configurar os IDs das tabelas no arquivo storage-baserow.ts
 */
import { baserowClient } from '../server/baserow-client';

async function fetchBaserowTables() {
  try {
    if (!process.env.BASEROW_API_KEY || !process.env.BASEROW_API_URL) {
      console.error('As variáveis de ambiente BASEROW_API_KEY e BASEROW_API_URL precisam estar definidas');
      return;
    }

    // Solicite ao usuário o ID do banco de dados
    const databaseId = process.argv[2];
    if (!databaseId) {
      console.error('Por favor, informe o ID do banco de dados como argumento de linha de comando');
      console.log('Exemplo: tsx scripts/fetch-baserow-tables.ts 12345');
      return;
    }

    console.log('Obtendo tabelas do banco de dados Baserow...');
    const tables = await baserowClient.listTables(parseInt(databaseId));
    
    console.log('\nTabelas encontradas:');
    console.log('--------------------');
    
    // Mostrar as tabelas encontradas
    tables.forEach(table => {
      console.log(`Nome: ${table.name}, ID: ${table.id}`);
    });
    
    console.log('\nConfiguração para o arquivo storage-baserow.ts:');
    console.log('--------------------------------------------');
    
    // Gerar código de configuração para o arquivo storage-baserow.ts
    console.log('const TABLE_IDS: Record<string, number> = {');
    tables.forEach(table => {
      // Converter nome da tabela para minúsculo e remover espaços
      const normalizedName = table.name.toLowerCase().replace(/\s+/g, '_');
      console.log(`  ${normalizedName}: ${table.id},`);
    });
    console.log('};');
    
  } catch (error) {
    console.error('Erro ao obter tabelas do Baserow:', error);
  }
}

fetchBaserowTables();