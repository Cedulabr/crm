/**
 * Rota para verificar o status das tabelas no Supabase
 * Esta rota verifica quais tabelas existem e quais precisam ser criadas
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  setupTablesSQL,
  checkTablesSQL,
  createDefaultOrganizationSQL,
  createDefaultProductsSQL,
  createDefaultConveniosSQL,
  createDefaultBanksSQL
} from '../services/setup-supabase-sql';

// Lista de tabelas esperadas
const EXPECTED_TABLES = [
  'organizations',
  'users',
  'clients',
  'products',
  'convenios',
  'banks',
  'proposals',
  'form_templates',
  'form_submissions'
];

export async function checkSupabaseTables(req: Request, res: Response) {
  try {
    // Verificar se temos as variáveis de ambiente
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      return res.status(500).json({
        error: 'Configuração do Supabase ausente. Verifique SUPABASE_URL e SUPABASE_KEY no .env',
        status: 'error'
      });
    }

    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Verificar existência das tabelas esperadas
    const { data: existingTablesData, error: tablesError } = await supabase.rpc('sql', {
      query: checkTablesSQL
    });

    if (tablesError) {
      return res.status(500).json({
        error: `Erro ao verificar tabelas: ${tablesError.message}`,
        status: 'error',
        setupSql: setupTablesSQL
      });
    }

    // Mapear tabelas existentes
    const existingTables = existingTablesData || [];
    const tableMap = existingTables.reduce((map: any, table: any) => {
      map[table.table_name] = table.columns;
      return map;
    }, {});

    // Verificar quais tabelas estão faltando
    const missingTables = EXPECTED_TABLES.filter(t => !tableMap[t]);

    // Para cada tabela existente, verificar se a estrutura está correta
    const tablesWithIssues: any[] = [];
    const existingTablesStatus = EXPECTED_TABLES.map(tableName => {
      const exists = tableMap[tableName] ? true : false;
      let status = exists ? 'ok' : 'missing';
      
      // Adicionar detalhes para tabelas com problemas estruturais
      if (exists) {
        // Se necessário, adicionar validação de estrutura no futuro
        // Por exemplo, verificar se todas as colunas esperadas estão presentes
      }
      
      if (status !== 'ok') {
        tablesWithIssues.push({
          name: tableName,
          status,
          columns: tableMap[tableName] || []
        });
      }
      
      return {
        name: tableName,
        status,
        columns: tableMap[tableName] || []
      };
    });

    // Verificar se há dados básicos
    const dataStatus = {
      organizations: { count: 0, exists: false },
      products: { count: 0, exists: false },
      convenios: { count: 0, exists: false },
      banks: { count: 0, exists: false }
    };

    // Verificar dados apenas se todas as tabelas existirem
    if (missingTables.length === 0) {
      // Verificar organizações
      const { count: orgCount, error: orgError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      if (!orgError) {
        dataStatus.organizations.count = orgCount || 0;
        dataStatus.organizations.exists = (orgCount || 0) > 0;
      }
      
      // Verificar produtos
      const { count: prodCount, error: prodError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      if (!prodError) {
        dataStatus.products.count = prodCount || 0;
        dataStatus.products.exists = (prodCount || 0) > 0;
      }
      
      // Verificar convênios
      const { count: convCount, error: convError } = await supabase
        .from('convenios')
        .select('*', { count: 'exact', head: true });
      
      if (!convError) {
        dataStatus.convenios.count = convCount || 0;
        dataStatus.convenios.exists = (convCount || 0) > 0;
      }
      
      // Verificar bancos
      const { count: bankCount, error: bankError } = await supabase
        .from('banks')
        .select('*', { count: 'exact', head: true });
      
      if (!bankError) {
        dataStatus.banks.count = bankCount || 0;
        dataStatus.banks.exists = (bankCount || 0) > 0;
      }
    }

    // Determinar o status geral
    const allTablesExist = missingTables.length === 0;
    const allDataExists = dataStatus.organizations.exists && 
                          dataStatus.products.exists && 
                          dataStatus.convenios.exists && 
                          dataStatus.banks.exists;
    
    const overallStatus = allTablesExist 
      ? (allDataExists ? 'ok' : 'missing_data') 
      : 'missing_tables';

    // Preparar resposta com instruções SQL
    return res.status(200).json({
      status: overallStatus,
      missing_tables: missingTables,
      tables_status: existingTablesStatus,
      tables_with_issues: tablesWithIssues,
      data_status: dataStatus,
      setup_sql: {
        tables: setupTablesSQL,
        organization: createDefaultOrganizationSQL,
        products: createDefaultProductsSQL,
        convenios: createDefaultConveniosSQL,
        banks: createDefaultBanksSQL
      }
    });
    
  } catch (error: any) {
    console.error('Erro ao verificar tabelas do Supabase:', error);
    return res.status(500).json({
      error: `Erro interno ao verificar tabelas: ${error.message}`,
      status: 'error',
      setupSql: setupTablesSQL
    });
  }
}