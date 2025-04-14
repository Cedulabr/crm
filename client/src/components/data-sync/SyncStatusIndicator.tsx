import { useEffect, useState } from 'react';
import { RefreshCw, Check, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataSync } from './DataSyncProvider';

interface SyncStatusIndicatorProps {
  table: 'clients' | 'proposals' | 'organizations';
  showRefresh?: boolean;
}

export function SyncStatusIndicator({ table, showRefresh = true }: SyncStatusIndicatorProps) {
  const { syncStatus, lastUpdate, refreshData } = useDataSync();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Determinar o ícone e a cor com base no status
  const getIcon = () => {
    const status = syncStatus[table];
    if (status === 'connected') {
      return <Wifi className="h-4 w-4 text-green-500" />;
    } else if (status === 'disconnected') {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    } else if (status === 'error') {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    } else if (status === 'synced') {
      return <Check className="h-4 w-4 text-green-500" />;
    } else {
      return <Wifi className="h-4 w-4 text-neutral-400" />;
    }
  };

  // Obter a mensagem de status apropriada
  const getStatusMessage = () => {
    let statusText = '';
    let timeInfo = '';
    
    // Status base
    const status = syncStatus[table];
    if (status === 'connected') {
      statusText = 'Conectado em tempo real';
    } else if (status === 'disconnected') {
      statusText = 'Desconectado';
    } else if (status === 'error') {
      statusText = 'Erro de sincronização';
    } else if (status === 'synced') {
      statusText = 'Dados sincronizados';
    } else {
      statusText = 'Status desconhecido';
    }
    
    // Adicionar informação de tempo se disponível
    if (lastUpdate[table]) {
      const now = new Date();
      const lastUpdateTime = lastUpdate[table] as Date;
      const diffMs = now.getTime() - lastUpdateTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        timeInfo = 'agora mesmo';
      } else if (diffMins < 60) {
        timeInfo = `há ${diffMins} min`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
          timeInfo = `há ${diffHours}h`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          timeInfo = `há ${diffDays}d`;
        }
      }
    }
    
    return {
      statusText,
      timeInfo
    };
  };

  const { statusText, timeInfo } = getStatusMessage();
  
  const getTableLabel = () => {
    switch (table) {
      case 'clients':
        return 'Clientes';
      case 'proposals':
        return 'Propostas';
      case 'organizations':
        return 'Organizações';
      default:
        return table;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData(table);
    } catch (error) {
      console.error(`Erro ao atualizar ${table}:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div className={`flex items-center ${showRefresh ? 'gap-1' : ''}`}>
              {getIcon()}
              {showRefresh && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw 
                    className={`h-3 w-3 text-neutral-500 ${isRefreshing ? 'animate-spin' : ''}`} 
                  />
                  <span className="sr-only">Atualizar {getTableLabel()}</span>
                </Button>
              )}
            </div>
            {showRefresh && (
              <span className="text-xs text-neutral-600 font-medium">
                {getTableLabel()}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="flex flex-col text-xs">
            <span className="font-medium">{getTableLabel()}: {statusText}</span>
            {timeInfo && <span className="text-neutral-400">{timeInfo}</span>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}