import { useEffect, useState } from 'react';
import { useDataSync } from './DataSyncProvider';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, AlertTriangle, Clock } from 'lucide-react';

interface SyncStatusIndicatorProps {
  table: 'clients' | 'proposals' | 'organizations';
  showRefresh?: boolean;
}

export function SyncStatusIndicator({ 
  table, 
  showRefresh = true 
}: SyncStatusIndicatorProps) {
  const { syncStatus, lastUpdate, refreshData } = useDataSync();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Formatar a data da última atualização
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    // Se for hoje, mostrar apenas a hora
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastUpdateDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (lastUpdateDate.getTime() === today.getTime()) {
      return `Hoje às ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Se for nos últimos 7 dias, mostrar o dia da semana
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    if (date > sevenDaysAgo) {
      const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return `${weekdays[date.getDay()]} às ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Caso contrário, mostrar a data completa
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} às ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Manipulador para forçar atualização
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData(table);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calcular o tempo desde a última atualização
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');
  
  useEffect(() => {
    // Atualizar o tempo desde a última atualização a cada minuto
    const calculateTimeSinceUpdate = () => {
      const lastUpdateTime = lastUpdate[table];
      if (!lastUpdateTime) {
        setTimeSinceUpdate('Nunca atualizado');
        return;
      }
      
      const now = new Date();
      const diffMs = now.getTime() - lastUpdateTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        setTimeSinceUpdate('Agora mesmo');
      } else if (diffMins < 60) {
        setTimeSinceUpdate(`${diffMins} minuto${diffMins !== 1 ? 's' : ''} atrás`);
      } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
          setTimeSinceUpdate(`${diffHours} hora${diffHours !== 1 ? 's' : ''} atrás`);
        } else {
          const diffDays = Math.floor(diffHours / 24);
          setTimeSinceUpdate(`${diffDays} dia${diffDays !== 1 ? 's' : ''} atrás`);
        }
      }
    };
    
    calculateTimeSinceUpdate();
    const interval = setInterval(calculateTimeSinceUpdate, 60000); // Atualizar a cada minuto
    
    return () => clearInterval(interval);
  }, [lastUpdate, table]);

  // Mapear nome da tabela para nome em português
  const tableNames: Record<string, string> = {
    clients: 'Clientes',
    proposals: 'Propostas',
    organizations: 'Organizações'
  };

  // Determinar o ícone e classe com base no status
  let StatusIcon = Clock;
  let statusClass = 'text-yellow-500';
  let statusText = 'Aguardando';
  
  if (syncStatus[table]) {
    StatusIcon = Check;
    statusClass = 'text-green-500';
    statusText = 'Sincronizado';
  } else if (lastUpdate[table]) {
    StatusIcon = AlertTriangle;
    statusClass = 'text-amber-500';
    statusText = 'Desatualizado';
  }

  return (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <StatusIcon className={`h-4 w-4 ${statusClass}`} />
              <span className="text-sm font-medium">{tableNames[table]}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p><span className="font-semibold">Status:</span> {statusText}</p>
              <p><span className="font-semibold">Última atualização:</span> {formatLastUpdate(lastUpdate[table])}</p>
              <p><span className="font-semibold">Tempo decorrido:</span> {timeSinceUpdate}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showRefresh && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Atualizar {tableNames[table]}</span>
        </Button>
      )}
    </div>
  );
}