import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Cache de inscrições para evitar múltiplas inscrições na mesma tabela
 */
const subscriptionCache: Record<string, RealtimeChannel> = {};

/**
 * Inscreve-se em uma tabela do Supabase para receber atualizações em tempo real.
 * 
 * @param tableName Nome da tabela para se inscrever
 * @param callback Função a ser chamada quando houver alterações
 * @param filter Filtro opcional para os eventos (ex: 'id=eq.1')
 * @returns Uma função para cancelar a inscrição
 */
export function subscribeToTable(
  tableName: string, 
  callback: (payload: any) => void,
  filter?: string
): () => void {
  // Cria uma chave única para o cache baseada na tabela e filtro
  const cacheKey = filter ? `${tableName}:${filter}` : tableName;
  
  // Se já existe uma inscrição ativa para esta tabela/filtro, retorna a função para cancelá-la
  if (subscriptionCache[cacheKey]) {
    // Adicionar mais um callback à inscrição existente
    const existingChannel = subscriptionCache[cacheKey];
    
    // Substituir o callback existente para chamar o novo callback
    existingChannel.on('postgres_changes', { 
      event: '*', 
      schema: 'public',
      table: tableName,
      filter: filter
    }, (payload) => {
      callback(payload);
    });
    
    // Retorna função para cancelar esta inscrição específica
    return () => {
      // Implementação simplificada - em uma aplicação real, rastreariam-se todos os callbacks
      existingChannel.unsubscribe();
      delete subscriptionCache[cacheKey];
    };
  }
  
  try {
    console.log(`Inscrevendo-se na tabela ${tableName}${filter ? ` com filtro ${filter}` : ''}`);
    
    // Cria um canal para a tabela
    const channel = supabase.channel(`public:${tableName}${filter ? `:${filter}` : ''}`);
    
    // Configurar eventos que queremos ouvir
    channel
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public',
        table: tableName,
        filter: filter
      }, (payload) => {
        console.log('Novo registro inserido:', payload);
        callback({ type: 'INSERT', data: payload.new });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public',
        table: tableName,
        filter: filter
      }, (payload) => {
        console.log('Registro atualizado:', payload);
        callback({ type: 'UPDATE', data: payload.new, oldData: payload.old });
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public',
        table: tableName,
        filter: filter
      }, (payload) => {
        console.log('Registro excluído:', payload);
        callback({ type: 'DELETE', data: payload.old });
      });
    
    // Inscrever-se no canal
    channel.subscribe((status) => {
      console.log(`Status da inscrição em ${tableName}: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        // Armazenar o canal no cache
        subscriptionCache[cacheKey] = channel;
      }
    });
    
    // Retorna função para cancelar a inscrição
    return () => {
      console.log(`Cancelando inscrição na tabela ${tableName}`);
      channel.unsubscribe();
      delete subscriptionCache[cacheKey];
    };
  } catch (error) {
    console.error(`Erro ao se inscrever na tabela ${tableName}:`, error);
    return () => {}; // Função vazia no caso de erro
  }
}

/**
 * Hook do React para usar os dados em tempo real do Supabase
 * Use este hook diretamente nos componentes React
 */
export function createRealtimeSubscription(tableName: string, filter?: string) {
  let unsubscribe: (() => void) | null = null;
  
  const subscribe = (callback: (payload: any) => void) => {
    // Cancela qualquer inscrição anterior
    if (unsubscribe) {
      unsubscribe();
    }
    
    // Inscreve-se na tabela
    unsubscribe = subscribeToTable(tableName, callback, filter);
    
    return unsubscribe;
  };
  
  const cleanup = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
  
  return { subscribe, cleanup };
}