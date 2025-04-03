/**
 * Cliente para comunicação com a API do Baserow
 */
import axios from 'axios';

// Definindo as interfaces básicas para tabelas e campos
export interface BaserowTable {
  id: number;
  name: string;
  database_id: number;
}

export interface BaserowRow {
  id: number;
  [key: string]: any;
}

class BaserowClient {
  private apiKey: string;
  private baseUrl: string;
  private tableIds: Record<string, number> = {};

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  /**
   * Configura o mapeamento de nomes de tabelas para IDs
   * @param mappings Objeto com mapeamentos de nomes para IDs
   */
  setTableMappings(mappings: Record<string, number>) {
    this.tableIds = mappings;
  }

  /**
   * Obtém o ID de uma tabela pelo nome
   * @param tableName Nome da tabela
   */
  getTableId(tableName: string): number {
    const id = this.tableIds[tableName];
    if (!id) {
      throw new Error(`ID da tabela "${tableName}" não foi configurado`);
    }
    return id;
  }

  /**
   * Headers padrão para requisições
   */
  private get headers() {
    return {
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Lista as tabelas disponíveis no Baserow
   * @param databaseId ID do banco de dados no Baserow
   */
  async listTables(databaseId: number): Promise<BaserowTable[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/database/tables/database/${databaseId}/`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao listar tabelas do Baserow:', error);
      throw error;
    }
  }

  /**
   * Lista os registros de uma tabela
   * @param tableName Nome da tabela no sistema
   * @param params Parâmetros adicionais para a consulta
   */
  async listRows(tableName: string, params: Record<string, any> = {}): Promise<BaserowRow[]> {
    try {
      const tableId = this.getTableId(tableName);
      const response = await axios.get(
        `${this.baseUrl}/api/database/rows/table/${tableId}/`,
        { 
          headers: this.headers,
          params
        }
      );
      return response.data.results;
    } catch (error) {
      console.error(`Erro ao listar registros da tabela "${tableName}":`, error);
      throw error;
    }
  }

  /**
   * Obtém um registro específico
   * @param tableName Nome da tabela no sistema
   * @param rowId ID do registro
   */
  async getRow(tableName: string, rowId: number): Promise<BaserowRow | null> {
    try {
      const tableId = this.getTableId(tableName);
      const response = await axios.get(
        `${this.baseUrl}/api/database/rows/table/${tableId}/${rowId}/`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error(`Erro ao obter registro da tabela "${tableName}":`, error);
      throw error;
    }
  }

  /**
   * Cria um novo registro
   * @param tableName Nome da tabela no sistema
   * @param data Dados do novo registro
   */
  async createRow(tableName: string, data: Record<string, any>): Promise<BaserowRow> {
    try {
      const tableId = this.getTableId(tableName);
      const response = await axios.post(
        `${this.baseUrl}/api/database/rows/table/${tableId}/`,
        data,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao criar registro na tabela "${tableName}":`, error);
      throw error;
    }
  }

  /**
   * Atualiza um registro existente
   * @param tableName Nome da tabela no sistema
   * @param rowId ID do registro
   * @param data Dados a serem atualizados
   */
  async updateRow(tableName: string, rowId: number, data: Record<string, any>): Promise<BaserowRow> {
    try {
      const tableId = this.getTableId(tableName);
      const response = await axios.patch(
        `${this.baseUrl}/api/database/rows/table/${tableId}/${rowId}/`,
        data,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar registro na tabela "${tableName}":`, error);
      throw error;
    }
  }

  /**
   * Deleta um registro
   * @param tableName Nome da tabela no sistema
   * @param rowId ID do registro
   */
  async deleteRow(tableName: string, rowId: number): Promise<boolean> {
    try {
      const tableId = this.getTableId(tableName);
      await axios.delete(
        `${this.baseUrl}/api/database/rows/table/${tableId}/${rowId}/`,
        { headers: this.headers }
      );
      return true;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return false;
      }
      console.error(`Erro ao deletar registro da tabela "${tableName}":`, error);
      throw error;
    }
  }

  /**
   * Busca registros com filtro
   * @param tableName Nome da tabela no sistema
   * @param field Nome do campo
   * @param value Valor para filtro
   */
  async searchRows(tableName: string, field: string, value: any): Promise<BaserowRow[]> {
    try {
      const tableId = this.getTableId(tableName);
      const response = await axios.get(
        `${this.baseUrl}/api/database/rows/table/${tableId}/`,
        { 
          headers: this.headers,
          params: {
            [`filter__field_${field}__equal`]: value
          }
        }
      );
      return response.data.results;
    } catch (error) {
      console.error(`Erro ao buscar registros na tabela "${tableName}":`, error);
      throw error;
    }
  }
}

// Inicializa o cliente Baserow usando as variáveis de ambiente
export const baserowClient = new BaserowClient(
  process.env.BASEROW_API_KEY || '',
  process.env.BASEROW_API_URL || ''
);

export default baserowClient;