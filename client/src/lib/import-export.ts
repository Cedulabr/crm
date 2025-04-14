import * as xlsx from 'xlsx';
import { getSupabaseClient } from './supabase';
import { addAuthTokenToHeaders, syncAuthToken } from './auth-utils';

/**
 * Exporta dados para um arquivo Excel
 * @param data Array de objetos a serem exportados
 * @param fileName Nome do arquivo (sem extensão)
 * @param sheetName Nome da planilha
 * @returns Boolean indicando se a exportação foi bem-sucedida
 */
export function exportToExcel(
  data: any[],
  fileName: string = 'export',
  sheetName: string = 'Dados'
): boolean {
  try {
    if (!data || data.length === 0) {
      console.error('Sem dados para exportar');
      return false;
    }

    // Criar uma nova planilha
    const worksheet = xlsx.utils.json_to_sheet(data);
    
    // Criar um novo workbook e adicionar a planilha
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Salvar o arquivo
    xlsx.writeFile(workbook, `${fileName}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Erro ao exportar para Excel:', error);
    return false;
  }
}

/**
 * Importa clientes de um arquivo Excel
 * @param file Arquivo Excel
 * @returns Promise com array de clientes importados
 */
export async function importClientsFromExcel(file: File): Promise<any[]> {
  return importFromExcel(file, 'clients');
}

/**
 * Importa propostas de um arquivo Excel
 * @param file Arquivo Excel
 * @returns Promise com array de propostas importadas
 */
export async function importProposalsFromExcel(file: File): Promise<any[]> {
  return importFromExcel(file, 'proposals');
}

/**
 * Função genérica para importar dados de um arquivo Excel
 * @param file Arquivo Excel
 * @param type Tipo de dado ('clients' ou 'proposals')
 * @returns Promise com array de dados importados
 */
async function importFromExcel(file: File, type: 'clients' | 'proposals'): Promise<any[]> {
  try {
    // Garantir que o token esteja sincronizado
    await syncAuthToken();
    
    // Obter cliente Supabase
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Cliente Supabase não disponível');
    }
    
    // Ler o arquivo Excel
    const data = await readExcelFile(file);
    if (!data || data.length === 0) {
      throw new Error('Arquivo vazio ou inválido');
    }
    
    // Validar e formatar os dados conforme o tipo
    let processedData: any[] = [];
    const errors: any[] = [];
    
    if (type === 'clients') {
      // Processar cada linha como um cliente
      for (const row of data) {
        try {
          // Validar dados mínimos do cliente
          if (!row.name) {
            errors.push(`Cliente sem nome: ${JSON.stringify(row)}`);
            continue;
          }
          
          // Formatar os dados do cliente
          const client = {
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            document: row.document || row.cpf || row.cnpj || null,
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            postal_code: row.postal_code || row.zip || row.cep || null,
            notes: row.notes || null,
            organization_id: Number(row.organization_id) || 1,
            created_by: row.created_by || null,
            status: row.status || 'active'
          };
          
          // Inserir no banco de dados
          const { data: insertedClient, error } = await supabase
            .from('clients')
            .insert(client)
            .select()
            .single();
          
          if (error) throw error;
          processedData.push(insertedClient);
        } catch (error) {
          errors.push(`Erro ao processar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    } else if (type === 'proposals') {
      // Processar cada linha como uma proposta
      for (const row of data) {
        try {
          // Validar dados mínimos da proposta
          if (!row.client_id) {
            errors.push(`Proposta sem client_id: ${JSON.stringify(row)}`);
            continue;
          }
          
          if (!row.product_id) {
            errors.push(`Proposta sem product_id: ${JSON.stringify(row)}`);
            continue;
          }
          
          // Formatar os dados da proposta
          const proposal = {
            client_id: Number(row.client_id),
            product_id: Number(row.product_id),
            value: Number(row.value) || 0,
            installments: Number(row.installments) || 1,
            status: row.status || 'pending',
            notes: row.notes || null,
            organization_id: Number(row.organization_id) || 1,
            created_by: row.created_by || null,
            convenio_id: Number(row.convenio_id) || null,
            bank_id: Number(row.bank_id) || null
          };
          
          // Inserir no banco de dados
          const { data: insertedProposal, error } = await supabase
            .from('proposals')
            .insert(proposal)
            .select()
            .single();
          
          if (error) throw error;
          processedData.push(insertedProposal);
        } catch (error) {
          errors.push(`Erro ao processar proposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }
    
    // Se houver erros, lançar exceção com detalhes
    if (errors.length > 0) {
      const error = new Error(`Importação parcial com ${errors.length} erros`);
      error.errors = errors;
      
      // Se nenhum dado foi processado, considerar falha total
      if (processedData.length === 0) {
        throw error;
      }
      
      // Se alguns dados foram processados, retornar resultado parcial
      console.warn('Importação parcial com erros:', errors);
    }
    
    return processedData;
  } catch (error) {
    console.error(`Erro ao importar ${type} de Excel:`, error);
    throw error;
  }
}

/**
 * Lê um arquivo Excel e retorna os dados como um array de objetos
 * @param file Arquivo Excel
 * @returns Promise com array de objetos
 */
async function readExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          return reject(new Error('Falha ao ler o arquivo'));
        }
        
        // Converter os dados para um workbook
        const workbook = xlsx.read(data, { type: 'binary' });
        
        // Obter a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter a planilha para JSON
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsBinaryString(file);
  });
}