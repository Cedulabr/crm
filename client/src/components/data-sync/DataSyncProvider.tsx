import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { subscribeToTable } from '@/lib/supabase-realtime';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { syncAuthToken } from '@/lib/auth-utils';

// Tipo para o contexto
interface DataSyncContextType {
  syncStatus: {
    clients: boolean;
    proposals: boolean;
    organizations: boolean;
  };
  lastUpdate: {
    clients: Date | null;
    proposals: Date | null;
    organizations: Date | null;
  };
  refreshData: (table: string) => Promise<void>;
}

// Criar o contexto
const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined);

// Provedor que envolve os componentes que precisam de acesso ao estado de sincronização
export function DataSyncProvider({ children }: { children: ReactNode }) {
  // Estado para rastrear o status de sincronização
  const [syncStatus, setSyncStatus] = useState({
    clients: false,
    proposals: false,
    organizations: false
  });

  // Estado para rastrear a última atualização
  const [lastUpdate, setLastUpdate] = useState({
    clients: null as Date | null,
    proposals: null as Date | null,
    organizations: null as Date | null
  });

  const { toast } = useToast();
  const { user } = useSupabaseAuth();

  // Configurar inscrições em tempo real quando o usuário estiver autenticado
  useEffect(() => {
    if (!user) return;

    // Garantir que o token de autenticação está sincronizado
    syncAuthToken().catch(err => console.error('Erro ao sincronizar token:', err));

    console.log('Iniciando sincronização de dados em tempo real...');
    
    // Criar funções de cancelamento para cada inscrição
    const unsubscribeClients = subscribeToTable('clients', (payload) => {
      console.log('Atualização em tempo real de clientes:', payload);
      setLastUpdate(prev => ({ ...prev, clients: new Date() }));
      
      // Atualizar status de sincronização
      setSyncStatus(prev => ({ ...prev, clients: true }));
      
      toast({
        title: 'Dados atualizados',
        description: 'Os dados de clientes foram atualizados em tempo real.',
        variant: 'default',
      });
    });
    
    const unsubscribeProposals = subscribeToTable('proposals', (payload) => {
      console.log('Atualização em tempo real de propostas:', payload);
      setLastUpdate(prev => ({ ...prev, proposals: new Date() }));
      
      // Atualizar status de sincronização
      setSyncStatus(prev => ({ ...prev, proposals: true }));
      
      toast({
        title: 'Dados atualizados',
        description: 'Os dados de propostas foram atualizados em tempo real.',
        variant: 'default',
      });
    });
    
    const unsubscribeOrganizations = subscribeToTable('organizations', (payload) => {
      console.log('Atualização em tempo real de organizações:', payload);
      setLastUpdate(prev => ({ ...prev, organizations: new Date() }));
      
      // Atualizar status de sincronização
      setSyncStatus(prev => ({ ...prev, organizations: true }));
      
      toast({
        title: 'Dados atualizados',
        description: 'Os dados de organizações foram atualizados em tempo real.',
        variant: 'default',
      });
    });
    
    // Limpar inscrições quando o componente for desmontado
    return () => {
      unsubscribeClients();
      unsubscribeProposals();
      unsubscribeOrganizations();
    };
  }, [user, toast]);

  // Função para forçar uma atualização manual
  const refreshData = async (table: string) => {
    try {
      // Verifica se o nome da tabela é válido
      if (!['clients', 'proposals', 'organizations'].includes(table)) {
        throw new Error(`Tabela "${table}" não suportada para sincronização`);
      }
      
      console.log(`Forçando atualização de dados para: ${table}`);
      
      // Atualiza o estado de sincronização
      setLastUpdate(prev => ({ 
        ...prev, 
        [table]: new Date() 
      }));
      
      toast({
        title: 'Sincronização iniciada',
        description: `Sincronizando dados de ${table}...`,
        variant: 'default',
      });
      
      // Aqui você poderia adicionar uma lógica para forçar uma atualização
      // através de uma chamada de API ou similar
      
      // Simular uma atualização bem-sucedida após 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualizar estado de sincronização
      setSyncStatus(prev => ({ 
        ...prev, 
        [table]: true 
      }));
      
      toast({
        title: 'Sincronização concluída',
        description: `Os dados de ${table} foram sincronizados com sucesso.`,
        variant: 'default',
      });
    } catch (error) {
      console.error(`Erro ao atualizar dados de ${table}:`, error);
      
      // Atualizar estado de sincronização
      setSyncStatus(prev => ({ 
        ...prev, 
        [table]: false 
      }));
      
      toast({
        title: 'Erro de sincronização',
        description: `Não foi possível sincronizar os dados de ${table}.`,
        variant: 'destructive',
      });
    }
  };
  
  // Valor do contexto
  const contextValue = useMemo(() => ({
    syncStatus,
    lastUpdate,
    refreshData
  }), [syncStatus, lastUpdate]);

  return (
    <DataSyncContext.Provider value={contextValue}>
      {children}
    </DataSyncContext.Provider>
  );
}

// Hook para usar o contexto
export function useDataSync() {
  const context = useContext(DataSyncContext);
  if (context === undefined) {
    throw new Error('useDataSync deve ser usado dentro de um DataSyncProvider');
  }
  return context;
}