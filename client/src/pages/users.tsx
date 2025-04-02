import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import UserForm from "@/components/users/user-form";
import UserList from "@/components/users/user-list";
import { apiRequest } from "@/lib/queryClient";

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser?.role === "superadmin";
  const isManager = currentUser?.role === "manager";
  const canManageUsers = isAdmin || isManager;

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: canManageUsers, // Only admins and managers can see users
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/users/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Não foi possível remover o usuário: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Reset password mutation (no backend implementation, just simulating)
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { id: number, email: string }) => {
      // Em um aplicativo real, isso enviaria um e-mail com instruções de recuperação
      // ou geraria uma nova senha e a enviaria por e-mail
      return apiRequest(`/api/users/${data.id}/reset-password`, { 
        method: 'POST',
        body: JSON.stringify({ email: data.email })
      });
    },
    onSuccess: () => {
      toast({
        title: "Senha redefinida",
        description: "Um e-mail com instruções foi enviado para o usuário.",
      });
      setIsResetPasswordOpen(false);
      setResetPasswordUser(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Não foi possível redefinir a senha: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Simula o reset de senha (em vez de chamar a API real, usamos uma simulação)
  const handleResetPassword = () => {
    if (resetPasswordUser) {
      // Simulação de sucesso
      toast({
        title: "Senha redefinida",
        description: `Um e-mail com instruções foi enviado para ${resetPasswordUser.email}.`,
      });
      setIsResetPasswordOpen(false);
      setResetPasswordUser(null);
    }
  };

  // Filter users based on search term
  const filteredUsers = users?.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle user editing
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  // Handle user deletion
  const handleDeleteUser = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(id);
    }
  };

  // Handle password reset
  const handleOpenResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setIsResetPasswordOpen(true);
  };

  // Close form and reset editing user
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  if (!canManageUsers) {
    return (
      <section className="p-6">
        <div className="flex flex-col items-center justify-center mt-10">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Acesso Restrito</h1>
          <p className="text-gray-500">Você não tem permissão para acessar esta página.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-gray-700">Usuários</h1>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Input
              type="text"
              className="pl-10 pr-4 py-2"
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-icons absolute left-3 top-2 text-gray-400">
              search
            </span>
          </div>
          
          <Button 
            className="bg-blue-800 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => setIsFormOpen(true)}
          >
            <span className="material-icons mr-1">add</span>
            Novo Usuário
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
            <UserList 
              users={filteredUsers || []} 
              onEdit={handleEditUser} 
              onDelete={handleDeleteUser}
              onResetPassword={handleOpenResetPassword}
              currentUser={currentUser}
            />
          )}
        </CardContent>
      </Card>

      {/* New/Edit User Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>
            {editingUser ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          <UserForm 
            user={editingUser} 
            onClose={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Redefinir Senha</DialogTitle>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Deseja enviar instruções de redefinição de senha para o usuário {resetPasswordUser?.name}?
            </p>
            <p className="text-sm font-medium">Email: {resetPasswordUser?.email}</p>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsResetPasswordOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleResetPassword}
              >
                Enviar Instruções
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}