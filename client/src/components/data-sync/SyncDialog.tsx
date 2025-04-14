import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDataSync } from './DataSyncProvider';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { RefreshCw, Database, CheckCircle2 } from 'lucide-react';
import { ImportModal } from '../import-export/ImportModal';
import { useToast } from '@/hooks/use-toast';

interface SyncDialogProps {
  trigger?: React.ReactNode;
}

export function SyncDialog({ trigger }: SyncDialogProps) {
  const { syncStatus, lastUpdate, refreshData } = useDataSync();
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    
    try {
      // Força a atualização de todas as tabelas
      await refreshData('clients');
      await refreshData('proposals');
      await refreshData('organizations');
      
      toast({
        title: 'Sincronização concluída',
        description: 'Todos os dados foram sincronizados com sucesso.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      
      toast({
        title: 'Erro na sincronização',
        description: 'Houve um problema ao sincronizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Formatar a data da última atualização
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Nunca atualizado';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return 'Agora mesmo';
    } else if (diffMins < 60) {
      return `há ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return `há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Database className="mr-2 h-4 w-4" />
            Status de Sincronização
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sincronização de Dados</DialogTitle>
          <DialogDescription>
            Verifique o status de sincronização dos dados e sincronize manualmente se necessário.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <div className="grid gap-4">
            <div className="flex justify-between items-center p-3 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2">
                <SyncStatusIndicator table="clients" />
              </div>
              <div className="text-xs text-neutral-500">
                {lastUpdate.clients ? (
                  <span>Última atualização: {formatLastUpdate(lastUpdate.clients)}</span>
                ) : (
                  <span>Sem dados sincronizados</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshData('clients')}
                className="text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Atualizar
              </Button>
            </div>
            
            <div className="flex justify-between items-center p-3 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2">
                <SyncStatusIndicator table="proposals" />
              </div>
              <div className="text-xs text-neutral-500">
                {lastUpdate.proposals ? (
                  <span>Última atualização: {formatLastUpdate(lastUpdate.proposals)}</span>
                ) : (
                  <span>Sem dados sincronizados</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshData('proposals')}
                className="text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Atualizar
              </Button>
            </div>
            
            <div className="flex justify-between items-center p-3 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2">
                <SyncStatusIndicator table="organizations" />
              </div>
              <div className="text-xs text-neutral-500">
                {lastUpdate.organizations ? (
                  <span>Última atualização: {formatLastUpdate(lastUpdate.organizations)}</span>
                ) : (
                  <span>Sem dados sincronizados</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshData('organizations')}
                className="text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Atualizar
              </Button>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between">
            <div className="space-x-2">
              <ImportModal 
                type="clients" 
                trigger={
                  <Button variant="outline" size="sm">
                    Importar Clientes
                  </Button>
                }
              />
              <ImportModal 
                type="proposals" 
                trigger={
                  <Button variant="outline" size="sm">
                    Importar Propostas
                  </Button>
                }
              />
            </div>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className={isRefreshing ? 'opacity-70' : ''}
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Tudo
                </>
              )}
            </Button>
          </div>
          
          <div className="mt-4 rounded-lg p-4 bg-blue-50 text-blue-800 text-sm">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Sobre a sincronização de dados</p>
                <p className="mt-1">
                  Os dados são sincronizados automaticamente em tempo real quando outros usuários fazem alterações.
                  Você também pode forçar uma sincronização manual quando necessário.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}