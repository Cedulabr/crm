import { useDrag } from "react-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { type ClientWithKanban } from "@shared/schema";

interface KanbanCardProps {
  client: ClientWithKanban;
  columnId: string;
  onEdit?: (client: ClientWithKanban) => void;
}

export default function KanbanCard({ client, columnId, onEdit }: KanbanCardProps) {
  // Set up drag source
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'kanban-card',
    item: { id: client.id, currentColumn: columnId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Format date
  const formattedDate = client.createdAt 
    ? format(new Date(client.createdAt), 'dd/MM/yyyy')
    : 'Data não disponível';

  // Get proposal count text
  const proposalText = client.proposalCount === 0 
    ? 'Sem proposta' 
    : client.proposalCount === 1 
      ? '1 proposta'
      : `${client.proposalCount} propostas`;

  // Get badge class based on proposal count
  const badgeClass = client.proposalCount === 0 
    ? 'bg-neutral-300 bg-opacity-30 text-neutral-500'
    : 'bg-primary-light bg-opacity-10 text-primary-dark';
  
  // Get badge variant
  const badgeVariant = client.proposalCount ? "default" : "outline";

  // Handle double click on card
  const handleDoubleClick = () => {
    if (onEdit) {
      onEdit(client);
    }
  };

  return (
    <Card 
      ref={drag}
      className={`bg-white p-4 rounded-lg border border-neutral-200 shadow-sm cursor-move hover:shadow-md transition kanban-card ${
        isDragging ? 'opacity-40' : ''
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-medium text-neutral-500">{client.company || 'Empresa não informada'}</h4>
            <p className="text-xs text-neutral-400">{client.name}</p>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-neutral-400 hover:text-primary-dark"
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(client);
              }}
            >
              <span className="material-icons text-sm">edit</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-neutral-400 hover:text-primary-dark"
            >
              <span className="material-icons text-sm">more_vert</span>
            </Button>
          </div>
        </div>
        <div className="flex items-center text-xs text-neutral-400 mb-3">
          <span className="material-icons text-xs mr-1">event</span>
          <span>Criado em {formattedDate}</span>
        </div>
        <div className="border-t border-neutral-100 pt-3">
          <div className="flex justify-between items-center">
            <Badge variant={badgeVariant} className={`px-2 py-1 text-xs rounded-full ${badgeClass}`}>
              {proposalText}
            </Badge>
            <span className="text-sm font-medium text-neutral-500">
              {client.totalValue ? 
                `R$ ${Number(client.totalValue).toLocaleString('pt-BR')}` : 
                '-'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
