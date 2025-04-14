import { getSupabaseClient } from './supabase';
import { syncAuthToken } from './auth-utils';

type Table = 'clients' | 'proposals' | 'organizations' | 'users';
type RealtimeCallbackFn = () => void;
type RealtimeErrorCallbackFn = (error: any) => void;

interface ChannelSubscription {
  table: Table;
  channelName: string;
  subscription: any; // RealtimeChannel
}

// Armazenar as assinaturas ativas
const activeSubscriptions: ChannelSubscription[] = [];

/**
 * Configura uma assinatura em tempo real para uma tabela específica
 * @param table Nome da tabela
 * @param callback Função a ser chamada quando houver mudanças
 * @param errorCallback Função a ser chamada em caso de erro
 */
export async function setupRealtimeSubscription(
  table: Table, 
  callback: RealtimeCallbackFn,
  errorCallback: RealtimeErrorCallbackFn
): Promise<void> {
  try {
    // Certifique-se de que o token de autenticação está sincronizado
    await syncAuthToken();
    
    // Obter o cliente Supabase
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Cliente Supabase não disponível');
    }
    
    // Verificar se já existe uma assinatura para esta tabela
    const existingSubscriptionIndex = activeSubscriptions.findIndex(
      (sub) => sub.table === table
    );
    
    // Se já existe, remova a assinatura atual
    if (existingSubscriptionIndex > -1) {
      const { subscription } = activeSubscriptions[existingSubscriptionIndex];
      supabase.removeChannel(subscription);
      activeSubscriptions.splice(existingSubscriptionIndex, 1);
    }
    
    // Crie um nome único para o canal
    const channelName = `realtime:${table}`;
    
    // Crie uma nova assinatura
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        {
          event: '*', // Todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table
        }, 
        (payload) => {
          console.log(`Mudança em ${table}:`, payload);
          callback();
        }
      )
      .subscribe((status: any) => {
        console.log(`Status da assinatura em ${table}:`, status);
        
        if (status === 'SUBSCRIPTION_ERROR' || status?.error) {
          errorCallback(new Error(`Erro na assinatura em tempo real de ${table}`));
        } else if (status === 'SUBSCRIBED' || status?.subscription?.state === 'SUBSCRIBED') {
          console.log(`Assinatura em tempo real ativa para ${table}`);
        }
      });
    
    // Armazenar a assinatura ativa
    activeSubscriptions.push({
      table,
      channelName,
      subscription: channel
    });
    
    console.log(`Assinatura em tempo real configurada para ${table}`);
  } catch (error) {
    console.error(`Erro ao configurar assinatura em tempo real para ${table}:`, error);
    errorCallback(error);
  }
}

/**
 * Cancela a assinatura em tempo real para uma tabela específica
 * @param table Nome da tabela
 */
export function unsubscribeFromTable(table: Table): void {
  const subscriptionIndex = activeSubscriptions.findIndex(
    (sub) => sub.table === table
  );
  
  if (subscriptionIndex > -1) {
    const { subscription } = activeSubscriptions[subscriptionIndex];
    const supabase = getSupabaseClient();
    
    if (supabase) {
      supabase.removeChannel(subscription);
    }
    
    activeSubscriptions.splice(subscriptionIndex, 1);
    console.log(`Assinatura em tempo real cancelada para ${table}`);
  }
}

/**
 * Cancela todas as assinaturas em tempo real
 */
export function unsubscribeFromAll(): void {
  const supabase = getSupabaseClient();
  
  if (supabase) {
    activeSubscriptions.forEach(({ subscription }) => {
      supabase.removeChannel(subscription);
    });
  }
  
  activeSubscriptions.length = 0;
  console.log('Todas as assinaturas em tempo real foram canceladas');
}

/**
 * Verifica se há uma assinatura ativa para uma tabela específica
 * @param table Nome da tabela
 * @returns Booleano indicando se há uma assinatura ativa
 */
export function hasActiveSubscription(table: Table): boolean {
  return activeSubscriptions.some((sub) => sub.table === table);
}