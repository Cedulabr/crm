import { useDrop } from "react-dnd";
import KanbanCard from "./kanban-card";
import { type ClientWithKanban } from "@shared/schema";

interface KanbanColumnProps {
  title: string;
  colorClass: string;
  clients: ClientWithKanban[];
  count: number;
  columnId: string;
  onMoveClient: (clientId: number, targetColumn: string) => void;
  onEditClient?: (client: ClientWithKanban) => void;
}

export default function KanbanColumn({ 
  title, 
  colorClass, 
  clients, 
  count, 
  columnId,
  onMoveClient,
  onEditClient
}: KanbanColumnProps) {
  // Set up drop target
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'kanban-card',
    drop: (item: { id: number }) => {
      onMoveClient(item.id, columnId);
      return { columnId };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div className="w-80 flex flex-col">
      <div className="bg-white rounded-t-xl p-4 border border-neutral-200 border-b-0 flex justify-between items-center">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${colorClass} mr-2`}></div>
          <h3 className="font-medium text-neutral-500">{title}</h3>
        </div>
        <span className="bg-neutral-100 text-neutral-500 text-sm px-2 py-0.5 rounded-full">{count}</span>
      </div>
      
      <div 
        ref={drop}
        className={`bg-neutral-50 rounded-b-xl p-3 border border-neutral-200 kanban-column overflow-y-auto min-h-[400px] ${isOver ? 'bg-primary-light bg-opacity-5' : ''}`}
      >
        <div className="space-y-3">
          {clients.length > 0 ? (
            clients.map(client => (
              <KanbanCard 
                key={client.id} 
                client={client} 
                columnId={columnId}
                onEdit={onEditClient}
              />
            ))
          ) : (
            <div className="text-center py-8 text-neutral-400 text-sm">
              Sem clientes nesta coluna
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
