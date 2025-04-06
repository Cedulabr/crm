import { useState } from "react";
import { format } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { type Client } from "@shared/schema";

interface ClientListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: number | string) => void;
}

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Helper to get badge props based on status
function getStatusBadgeProps(status: string | undefined) {
  switch(status) {
    case 'lead':
      return { variant: 'default' as const, label: 'Lead' };
    case 'qualificacao':
      return { variant: 'secondary' as const, label: 'Qualificação' };
    case 'negociacao':
      return { variant: 'destructive' as const, label: 'Negociação' };
    case 'fechamento':
      return { variant: 'outline' as const, label: 'Fechamento' };
    default:
      return { variant: 'outline' as const, label: 'Novo' };
  }
}

export default function ClientList({ clients, onEdit, onDelete }: ClientListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Calculate pagination
  const totalPages = Math.ceil(clients.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = clients.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left py-3 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Cliente</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Contato</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Empresa</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">CPF</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Criado em</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-neutral-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {currentClients.length > 0 ? (
              currentClients.map((client) => {
                // Default status badge
                const { variant, label } = getStatusBadgeProps(undefined);
                
                return (
                  <tr key={client.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Avatar className="w-8 h-8 rounded-full bg-primary-light text-white mr-3">
                          <span className="text-xs font-medium">{getInitials(client.name || "")}</span>
                        </Avatar>
                        <span className="font-medium text-neutral-500">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-neutral-500">{client.email}</p>
                        <p className="text-xs text-neutral-400">{client.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-500">{client.company}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-500">{client.cpf || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={variant} className="text-xs px-3 py-1 rounded-full">
                        {label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-400">
                        {client.createdAt 
                          ? format(new Date(client.createdAt), 'dd/MM/yyyy')
                          : '-'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary-dark hover:text-primary"
                          onClick={() => onEdit(client)}
                        >
                          <span className="material-icons">edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-neutral-400 hover:text-primary"
                        >
                          <span className="material-icons">visibility</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-neutral-400 hover:text-error-dark"
                          onClick={() => onDelete(client.id)}
                        >
                          <span className="material-icons">delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-neutral-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {clients.length > 0 && (
        <div className="bg-neutral-50 px-6 py-3 border-t border-neutral-200 flex justify-between items-center">
          <span className="text-sm text-neutral-500">
            Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, clients.length)} de {clients.length} clientes
          </span>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}
                />
              </PaginationItem>
              
              {[...Array(Math.min(totalPages, 3))].map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      isActive={currentPage === pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPages > 3 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
