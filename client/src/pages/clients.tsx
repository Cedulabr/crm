import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ClientForm from "@/components/clients/client-form";
import ClientList from "@/components/clients/client-list";
import { type Client } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { toast } = useToast();

  // Fetch clients
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Cliente removido",
        description: "O cliente foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Não foi possível remover o cliente: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Filter clients based on search term
  const filteredClients = clients?.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle client editing
  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  // Handle client deletion
  const handleDeleteClient = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este cliente?")) {
      deleteClientMutation.mutate(id);
    }
  };

  // Close form and reset editing client
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-neutral-500">Clientes</h1>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Input
              type="text"
              className="pl-10 pr-4 py-2"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-icons absolute left-3 top-2 text-neutral-400">
              search
            </span>
          </div>
          
          <Button 
            className="bg-blue-800 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => setIsFormOpen(true)}
          >
            <span className="material-icons mr-1">add</span>
            Novo Cliente
          </Button>
        </div>
      </div>
      
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <ClientList 
              clients={filteredClients || []} 
              onEdit={handleEditClient} 
              onDelete={handleDeleteClient}
            />
          )}
        </CardContent>
      </Card>

      {/* New/Edit Client Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>
            {editingClient ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
          <ClientForm 
            client={editingClient} 
            onClose={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
