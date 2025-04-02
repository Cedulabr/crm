import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Organization } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface OrganizationListProps {
  organizations: Organization[];
  onEdit: (organization: Organization) => void;
}

export default function OrganizationList({ organizations, onEdit }: OrganizationListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null);

  // Mutação para excluir uma organização
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/organizations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Empresa excluída",
        description: "A empresa foi excluída com sucesso.",
      });
      setOrganizationToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir",
        description: `Erro ao excluir empresa: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handler para confirmar a exclusão
  const handleDelete = () => {
    if (organizationToDelete) {
      deleteMutation.mutate(organizationToDelete.id);
    }
    setDeleteConfirmOpen(false);
  };

  // Handler para abrir o diálogo de confirmação
  const confirmDelete = (organization: Organization) => {
    setOrganizationToDelete(organization);
    setDeleteConfirmOpen(true);
  };

  if (organizations.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-neutral-500 mb-4">Nenhuma empresa encontrada.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Website</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((organization) => (
            <TableRow key={organization.id}>
              <TableCell className="font-medium">{organization.name}</TableCell>
              <TableCell>{organization.cnpj || "-"}</TableCell>
              <TableCell>{organization.phone || "-"}</TableCell>
              <TableCell>{organization.email || "-"}</TableCell>
              <TableCell>
                {organization.website ? (
                  <a 
                    href={organization.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-800 hover:underline"
                  >
                    {organization.website}
                  </a>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="material-icons">more_vert</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(organization)}>
                      <span className="material-icons mr-2 text-sm">edit</span>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600"
                      onClick={() => confirmDelete(organization)}
                    >
                      <span className="material-icons mr-2 text-sm">delete</span>
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa "{organizationToDelete?.name}"?<br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}