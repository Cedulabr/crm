import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OrganizationForm from "@/components/organizations/organization-form";
import OrganizationList from "@/components/organizations/organization-list";
import { Organization } from "@shared/schema";

export default function OrganizationsPage() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const queryClient = useQueryClient();

  // Obter o usuário atual do localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = currentUser?.role === "superadmin";

  // Buscar organizações
  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    // Apenas superadmin pode ver todas as organizações
    enabled: isSuperAdmin,
  });

  // Filtrar organizações pelo termo de busca
  const filteredOrganizations = organizations?.filter(
    (org) => org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleEditOrganization = (organization: Organization) => {
    setEditingOrganization(organization);
    setIsFormOpen(true);
  };

  const handleOpenForm = () => {
    setEditingOrganization(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingOrganization(null);
  };

  // Se não for superadmin, não deve ter acesso a esta página
  if (!isSuperAdmin) {
    return (
      <section className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Restrito</h1>
          <p className="mb-4">
            Você não tem permissão para acessar esta página.
            Apenas administradores do sistema podem gerenciar empresas.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-gray-700">Empresas</h1>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Input
              type="text"
              className="pl-10 pr-4 py-2"
              placeholder="Buscar empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-icons absolute left-3 top-2 text-gray-400">
              search
            </span>
          </div>
          
          <Button 
            className="bg-blue-800 hover:bg-blue-700 text-white shadow-sm"
            onClick={handleOpenForm}
          >
            <span className="material-icons mr-1">add</span>
            Nova Empresa
          </Button>
        </div>
      </div>
      
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingOrganization ? "Editar Empresa" : "Nova Empresa"}
            </h2>
            <OrganizationForm 
              organization={editingOrganization}
              onClose={handleCloseForm}
            />
          </div>
        </div>
      )}
      
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <OrganizationList 
              organizations={filteredOrganizations || []} 
              onEdit={handleEditOrganization} 
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}