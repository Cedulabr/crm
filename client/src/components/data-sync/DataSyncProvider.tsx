import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { setupRealtimeSubscription, unsubscribeFromTable } from '@/lib/supabase-realtime';
import { syncAuthToken } from '@/lib/auth-utils';
import { useToast } from '@/hooks/use-toast';

type Table = 'clients' | 'proposals' | 'organizations';
type SyncStatus = 'connected' | 'disconnected' | 'synced' | 'error' | 'loading';

interface DataSyncContextType {
  syncStatus: Record<Table, SyncStatus>;
  lastUpdate: Record<Table, Date | null>;
  refreshData: (table: Table) => Promise<any[] | null | undefined>;
  setSyncStatus: (table: Table, status: SyncStatus) => void;
  setLastUpdate: (table: Table, date: Date) => void;
}

const DEFAULT_SYNC_STATUS: Record<Table, SyncStatus> = {
  clients: 'loading',
  proposals: 'loading',
  organizations: 'loading'
};

const DEFAULT_LAST_UPDATE: Record<Table, Date | null> = {
  clients: null,
  proposals: null,
  organizations: null
};

const DataSyncContext = createContext<DataSyncContextType | null>(null);

export const useDataSync = () => {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within a DataSyncProvider');
  }
  return context;
};

interface DataSyncProviderProps {
  children: ReactNode;
}

export function DataSyncProvider({ children }: DataSyncProviderProps) {
  const [syncStatus, setSyncStatusState] = useState<Record<Table, SyncStatus>>(DEFAULT_SYNC_STATUS);
  const [lastUpdate, setLastUpdateState] = useState<Record<Table, Date | null>>(DEFAULT_LAST_UPDATE);
  const { isAuthenticated, getSupabaseClient } = useSupabaseAuth();
  const { toast } = useToast();

  const setLastUpdate = (table: Table, date: Date) => {
    setLastUpdateState(prev => ({
      ...prev,
      [table]: date
    }));
  };

  const setSyncStatus = (table: Table, status: SyncStatus) => {
    setSyncStatusState(prev => ({
      ...prev,
      [table]: status
    }));
  };

  // Função para atualizar dados de uma tabela específica
  const refreshData = async (table: Table) => {
    if (!isAuthenticated) {
      setSyncStatus(table, 'disconnected');
      return;
    }

    try {
      // Garantir que o token está sincronizado
      await syncAuthToken();
      
      // Obter cliente Supabase
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Cliente Supabase não disponível');
      }
      
      setSyncStatus(table, 'loading');

      // Realizar a busca de dados frescos
      let { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        throw error;
      }

      // Atualizar status se tudo correr bem
      setSyncStatus(table, 'synced');
      setLastUpdate(table, new Date());
      
      // Verificar se há conexão realtime e atualizar o status
      // Na nova versão, não temos mais acesso direto a isJoined
      // Vamos confiar no status após um pequeno delay
      setTimeout(() => {
        // Aqui verificamos apenas o status atual
        if (syncStatus[table] === 'synced') {
          setSyncStatus(table, 'connected');
        }
      }, 1000);
      
      return data;
    } catch (error) {
      console.error(`Erro ao atualizar ${table}:`, error);
      setSyncStatus(table, 'error');
      
      toast({
        title: `Erro ao sincronizar ${table}`,
        description: error instanceof Error ? error.message : 'Falha na comunicação com o servidor',
        variant: 'destructive',
      });
      
      throw error;
    }
  };

  // Inicializar a sincronização em tempo real quando o usuário estiver autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      // Atualizar status para desconectado se não estiver autenticado
      setSyncStatusState({
        clients: 'disconnected',
        proposals: 'disconnected',
        organizations: 'disconnected'
      });
      return;
    }

    const initializeSync = async () => {
      try {
        // Garantir que o token está sincronizado
        await syncAuthToken();
        
        // Inicializar Supabase Realtime para cada tabela
        const tables: Table[] = ['clients', 'proposals', 'organizations'];
        
        for (const table of tables) {
          setSyncStatus(table, 'loading');
          
          // Configurar assinatura em tempo real
          await setupRealtimeSubscription(table, 
            // Callback para quando novos dados chegarem
            () => {
              setLastUpdate(table, new Date());
              setSyncStatus(table, 'connected');
            }, 
            // Callback para erros
            (error) => {
              console.error(`Erro na sincronização em tempo real de ${table}:`, error);
              setSyncStatus(table, 'error');
            }
          );
          
          // Buscar dados iniciais
          await refreshData(table);
        }
      } catch (error) {
        console.error('Erro ao inicializar sincronização:', error);
        
        // Atualizar status para erro
        setSyncStatusState({
          clients: 'error',
          proposals: 'error',
          organizations: 'error'
        });
        
        toast({
          title: 'Erro de sincronização',
          description: 'Não foi possível inicializar a sincronização em tempo real. Verifique sua conexão.',
          variant: 'destructive',
        });
      }
    };

    initializeSync();

    // Limpar assinaturas quando o componente for desmontado
    return () => {
      ['clients', 'proposals', 'organizations'].forEach((table) => {
        unsubscribeFromTable(table as Table);
      });
    };
  }, [isAuthenticated]);

  const value = {
    syncStatus,
    lastUpdate,
    refreshData,
    setSyncStatus,
    setLastUpdate
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
}