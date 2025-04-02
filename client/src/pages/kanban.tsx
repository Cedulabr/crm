import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import KanbanColumn from "@/components/kanban/kanban-column";
import ClientForm from "@/components/clients/client-form";
import { type ClientWithKanban } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// Import a proper drag-and-drop library
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Define column types for kanban
type KanbanColumnType = 'lead' | 'qualificacao' | 'negociacao' | 'pendente' | 'recusada' | 'finalizada';

const COLUMN_LABELS: Record<KanbanColumnType, string> = {
  lead: 'Nova proposta',
  qualificacao: 'Proposta em andamento',
  negociacao: 'Proposta em negociação',
  pendente: 'Proposta pendente',
  recusada: 'Proposta recusada',
  finalizada: 'Proposta finalizada'
};

const COLUMN_COLORS: Record<KanbanColumnType, string> = {
  lead: 'bg-primary-light',
  qualificacao: 'bg-secondary-light',
  negociacao: 'bg-warning-light',
  pendente: 'bg-info-light',
  recusada: 'bg-error-light',
  finalizada: 'bg-success-light'
};

export default function Kanban() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithKanban | null>(null);
  const { toast } = useToast();
  
  // Fetch clients with kanban data
  const { data: clients, isLoading } = useQuery<ClientWithKanban[]>({
    queryKey: ['/api/clients-with-kanban'],
  });
  
  // Group clients by kanban column
  const kanbanData = groupClientsByColumn(clients || []);
  
  // Update client kanban column mutation
  const updateClientKanbanMutation = useMutation({
    mutationFn: async ({ clientId, column }: { clientId: number, column: string }) => {
      return apiRequest('PUT', `/api/kanban/client/${clientId}/column`, { column });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients-with-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals-with-details'] });
      toast({
        title: "Cliente movido",
        description: "O cliente foi movido com sucesso para outra coluna."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Não foi possível mover o cliente: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Handle moving a client between columns
  const handleMoveClient = (clientId: number, targetColumn: string) => {
    updateClientKanbanMutation.mutate({ clientId, column: targetColumn });
  };
  
  // Handle editing a client
  const handleEditClient = (client: ClientWithKanban) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium text-neutral-500">Kanban de Clientes</h1>
          <Button 
            className="bg-blue-800 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => setIsFormOpen(true)}
          >
            <span className="material-icons mr-1">add</span>
            Nova Proposta
          </Button>
        </div>
        
        {isLoading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="flex space-x-6 min-w-max">
              {(['lead', 'qualificacao', 'negociacao', 'pendente', 'recusada', 'finalizada'] as KanbanColumnType[]).map(column => (
                <KanbanColumn
                  key={column}
                  title={COLUMN_LABELS[column]}
                  colorClass={COLUMN_COLORS[column]}
                  clients={kanbanData[column] || []}
                  count={kanbanData[column]?.length || 0}
                  columnId={column}
                  onMoveClient={handleMoveClient}
                  onEditClient={handleEditClient}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Client Dialog (New/Edit) */}
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedClient(null);
        }}>
          <DialogContent className="max-w-md">
            <DialogTitle>{selectedClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            <ClientForm 
              client={selectedClient} 
              onClose={() => {
                setIsFormOpen(false);
                setSelectedClient(null);
              }} 
            />
          </DialogContent>
        </Dialog>
      </section>
    </DndProvider>
  );
}

// Helper function to group clients by their kanban column
function groupClientsByColumn(clients: ClientWithKanban[]): Record<string, ClientWithKanban[]> {
  const result: Record<string, ClientWithKanban[]> = {
    lead: [],
    qualificacao: [],
    negociacao: [],
    pendente: [],
    recusada: [],
    finalizada: []
  };
  
  clients.forEach(client => {
    const column = client.kanban?.column || 'lead';
    if (!result[column]) {
      result[column] = [];
    }
    result[column].push(client);
  });
  
  // Sort clients by position in each column
  Object.keys(result).forEach(column => {
    result[column].sort((a, b) => {
      const posA = a.kanban?.position || 0;
      const posB = b.kanban?.position || 0;
      return posA - posB;
    });
  });
  
  return result;
}
