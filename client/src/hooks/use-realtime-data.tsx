import { useState, useEffect, useCallback } from 'react';
import { setupRealtimeSubscription, unsubscribeFromTable } from '@/lib/supabase-realtime';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para usar dados em tempo real do Supabase
 * 
 * @param tableName Nome da tabela para observar
 * @param initialData Dados iniciais (pode vir de um fetch inicial)
 * @param filter Filtro opcional para a tabela
 */
export function useRealtimeData<T extends { id: number | string }>(
  tableName: string,
  initialData: T[] = [],
  filter?: string
) {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Função para atualizar os dados locais quando houver alterações em tempo real
  const updateData = useCallback((payload: any) => {
    try {
      const { type, data: newData, oldData } = payload;

      setData(currentData => {
        // Clone dos dados atuais
        const updatedData = [...currentData];

        switch (type) {
          case 'INSERT':
            // Adiciona o novo registro apenas se ele não existir
            if (!updatedData.some(item => item.id === newData.id)) {
              return [...updatedData, newData as T];
            }
            return updatedData;

          case 'UPDATE':
            // Atualiza o registro existente
            return updatedData.map(item => 
              item.id === newData.id ? { ...item, ...newData } as T : item
            );

          case 'DELETE':
            // Remove o registro
            return updatedData.filter(item => item.id !== oldData.id);

          default:
            return updatedData;
        }
      });

      // Notificação de alteração (opcional)
      const actionMessages = {
        INSERT: 'adicionado',
        UPDATE: 'atualizado',
        DELETE: 'removido'
      };

      const entityName = tableName === 'clients' ? 'Cliente' :
                        tableName === 'proposals' ? 'Proposta' :
                        tableName === 'organizations' ? 'Organização' : 'Registro';

      toast({
        title: `${entityName} ${actionMessages[type as keyof typeof actionMessages]}`,
        description: `Um ${entityName.toLowerCase()} foi ${actionMessages[type as keyof typeof actionMessages]} em tempo real.`,
        variant: 'default',
      });

    } catch (err) {
      console.error('Erro ao processar dados em tempo real:', err);
    }
  }, [tableName, toast]);

  // Efeito para inscrever-se nas alterações em tempo real
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // Configurar a assinatura em tempo real usando a nova API
      setupRealtimeSubscription(
        tableName as any, // Tipagem temporária
        // Callback para quando novos dados chegarem
        () => {
          console.log(`Dados atualizados em ${tableName}`);
          // A atualização específica será tratada em outro lugar
        },
        // Callback para erros
        (error) => {
          console.error(`Erro na sincronização em tempo real de ${tableName}:`, error);
          setError(error instanceof Error ? error : new Error('Erro desconhecido na inscrição em tempo real'));
          
          toast({
            title: 'Erro de conexão em tempo real',
            description: 'Não foi possível estabelecer conexão em tempo real com o servidor.',
            variant: 'destructive',
          });
        }
      );
      
      // Limpar inscrições quando o componente for desmontado
      return () => {
        unsubscribeFromTable(tableName as any); // Tipagem temporária
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido na inscrição em tempo real'));
      console.error('Erro ao se inscrever para atualizações em tempo real:', err);
      
      toast({
        title: 'Erro de conexão em tempo real',
        description: 'Não foi possível estabelecer conexão em tempo real com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [tableName, filter, updateData, toast]);

  // Função para atualizar manualmente os dados
  const setLocalData = useCallback((newData: T[]) => {
    setData(newData);
  }, []);

  return { data, setData: setLocalData, isLoading, error };
}