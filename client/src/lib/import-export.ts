import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { getAuthToken, syncAuthToken } from './auth-utils';
import { Client, InsertClient, Proposal, InsertProposal } from '@shared/schema';

/**
 * Exporta dados para um arquivo Excel
 * 
 * @param data Dados a serem exportados
 * @param fileName Nome do arquivo a ser gerado
 * @param sheetName Nome da planilha no Excel
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Dados') {
  try {
    // Prepara os dados para exportação, removendo campos sensíveis e formatando datas
    const exportData = data.map(item => {
      const exportItem = { ...item };
      
      // Remove campos que não devem ser exportados
      delete exportItem.password;
      delete exportItem.token;
      
      // Formata datas para string ISO
      Object.keys(exportItem).forEach(key => {
        if (exportItem[key] instanceof Date) {
          exportItem[key] = exportItem[key].toISOString().split('T')[0];
        }
      });
      
      return exportItem;
    });
    
    // Cria a planilha
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Gera o arquivo e faz o download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Erro ao exportar para Excel:', error);
    throw new Error('Não foi possível exportar os dados para Excel.');
  }
}

/**
 * Importa dados de um arquivo Excel
 * 
 * @param file Arquivo Excel a ser importado
 * @param sheetName Nome da planilha a ser importada (opcional)
 * @returns Os dados importados como array de objetos
 */
export async function importFromExcel(file: File, sheetName?: string): Promise<any[]> {
  try {
    // Assegura que o token está sincronizado antes de importar
    await syncAuthToken();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            throw new Error('Erro ao ler o arquivo.');
          }
          
          // Lê o arquivo Excel
          const data = new Uint8Array(e.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Se não especificou o nome da planilha, usa a primeira
          const sheet = sheetName 
            ? workbook.Sheets[sheetName] 
            : workbook.Sheets[workbook.SheetNames[0]];
          
          if (!sheet) {
            throw new Error(`Planilha ${sheetName || 'especificada'} não encontrada no arquivo.`);
          }
          
          // Converte para JSON
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(jsonData);
        } catch (error) {
          console.error('Erro ao processar arquivo Excel:', error);
          reject(new Error('Não foi possível processar o arquivo Excel.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('Erro ao importar do Excel:', error);
    throw new Error('Não foi possível importar os dados do Excel.');
  }
}

/**
 * Importa clientes de um arquivo Excel para o Supabase
 * 
 * @param file Arquivo Excel com dados de clientes
 * @returns Os clientes importados
 */
export async function importClientsFromExcel(file: File): Promise<Client[]> {
  try {
    // Assegura que o token está sincronizado antes de importar
    await syncAuthToken();
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Não autenticado. Faça login novamente.');
    }
    
    // Importa os dados do Excel
    const jsonData = await importFromExcel(file);
    
    // Transforma os dados importados para o formato de Cliente
    const clients: InsertClient[] = jsonData.map((row: any) => ({
      name: row.name || row.nome || '',
      email: row.email || '',
      phone: row.phone || row.telefone || '',
      cpf: row.cpf || '',
      rg: row.rg || '',
      birthdate: row.birthdate || row.data_nascimento || null,
      address: row.address || row.endereco || '',
      district: row.district || row.bairro || '',
      city: row.city || row.cidade || '',
      state: row.state || row.estado || '',
      zipcode: row.zipcode || row.cep || '',
      income: row.income || row.renda || 0,
      profession: row.profession || row.profissao || '',
      marital_status: row.marital_status || row.estado_civil || '',
      notes: row.notes || row.observacoes || '',
      // Campos obrigatórios com valores padrão
      creator_id: '0',
      organization_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Envia os clientes para o servidor em lotes de 10
    const batchSize = 10;
    const importedClients: Client[] = [];
    
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);
      
      // Faz a chamada à API com o token de autenticação
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(batch)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao importar clientes');
      }
      
      const batchResults = await response.json();
      importedClients.push(...batchResults);
    }
    
    return importedClients;
  } catch (error) {
    console.error('Erro ao importar clientes:', error);
    throw error;
  }
}

/**
 * Importa propostas de um arquivo Excel para o Supabase
 * 
 * @param file Arquivo Excel com dados de propostas
 * @returns As propostas importadas
 */
export async function importProposalsFromExcel(file: File): Promise<Proposal[]> {
  try {
    // Assegura que o token está sincronizado antes de importar
    await syncAuthToken();
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Não autenticado. Faça login novamente.');
    }
    
    // Importa os dados do Excel
    const jsonData = await importFromExcel(file);
    
    // Transforma os dados importados para o formato de Proposta
    const proposals: InsertProposal[] = jsonData.map((row: any) => ({
      client_id: row.client_id || row.clientId || 0,
      product_id: row.product_id || row.productId || 0,
      value: row.value || row.valor || 0,
      installments: row.installments || row.parcelas || 0,
      status: row.status || 'pending',
      comments: row.comments || row.observacoes || '',
      // Campos obrigatórios com valores padrão
      creator_id: '0',
      organization_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Envia as propostas para o servidor em lotes de 10
    const batchSize = 10;
    const importedProposals: Proposal[] = [];
    
    for (let i = 0; i < proposals.length; i += batchSize) {
      const batch = proposals.slice(i, i + batchSize);
      
      // Faz a chamada à API com o token de autenticação
      const response = await fetch('/api/proposals/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(batch)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao importar propostas');
      }
      
      const batchResults = await response.json();
      importedProposals.push(...batchResults);
    }
    
    return importedProposals;
  } catch (error) {
    console.error('Erro ao importar propostas:', error);
    throw error;
  }
}