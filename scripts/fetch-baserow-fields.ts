/**
 * Script para obter informações sobre os campos das tabelas do Baserow
 * Útil para mapeamento correto dos campos no arquivo storage-baserow.ts
 */
import axios from 'axios';

async function fetchBaserowFields() {
  try {
    if (!process.env.BASEROW_API_KEY || !process.env.BASEROW_API_URL) {
      console.error('As variáveis de ambiente BASEROW_API_KEY e BASEROW_API_URL precisam estar definidas');
      return;
    }

    // Solicitar ao usuário o ID da tabela
    const tableId = process.argv[2];
    if (!tableId) {
      console.error('Por favor, informe o ID da tabela como argumento de linha de comando');
      console.log('Exemplo: tsx scripts/fetch-baserow-fields.ts 12345');
      return;
    }

    const baseUrl = process.env.BASEROW_API_URL.endsWith('/') 
      ? process.env.BASEROW_API_URL.slice(0, -1) 
      : process.env.BASEROW_API_URL;
    
    console.log(`Obtendo campos da tabela ${tableId} do Baserow...`);
    
    const response = await axios.get(
      `${baseUrl}/api/database/fields/table/${tableId}/`,
      { 
        headers: {
          'Authorization': `Token ${process.env.BASEROW_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const fields = response.data;
    
    console.log('\nCampos encontrados:');
    console.log('------------------');
    
    // Mostrar os campos encontrados
    fields.forEach((field: any) => {
      console.log(`Nome: ${field.name}, ID: ${field.id}, Tipo: ${field.type}`);
    });
    
    console.log('\nMapeamento para o arquivo storage-baserow.ts:');
    console.log('------------------------------------------');
    
    // Gerar código de mapeamento para o arquivo storage-baserow.ts
    console.log('// Mapeamento de campos do modelo para campos do Baserow');
    console.log('const FIELD_MAPPINGS = {');
    fields.forEach((field: any) => {
      const normalizedName = field.name.toLowerCase().replace(/\s+/g, '_');
      console.log(`  ${normalizedName}: '${field.name}',`);
    });
    console.log('};');
    
  } catch (error) {
    console.error('Erro ao obter campos do Baserow:', error);
  }
}

fetchBaserowFields();