import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, KeyRound } from "lucide-react";

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  onResetPassword: (user: User) => void;
  currentUser: any;
}

export default function UserList({ 
  users, 
  onEdit, 
  onDelete, 
  onResetPassword,
  currentUser 
}: UserListProps) {
  // Helper function to format role names
  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      'superadmin': 'Administrador',
      'manager': 'Gestor',
      'agent': 'Agente'
    };
    return roleMap[role] || role;
  };

  // Check if current user can delete the user (can't delete self)
  const canDelete = (user: User) => {
    return user.id !== currentUser.id;
  };

  // Check if current user can edit the user
  const canEditUser = (user: User) => {
    // Superadmin can edit anyone
    if (currentUser.role === 'superadmin') return true;
    // Manager can edit agents but not other managers or superadmins
    if (currentUser.role === 'manager') {
      return user.role === 'agent';
    }
    // Others can't edit
    return false;
  };

  if (users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Nenhum usuário encontrado.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Função</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold 
                ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : 
                  user.role === 'manager' ? 'bg-blue-100 text-blue-800' : 
                  'bg-green-100 text-green-800'}`}>
                {formatRole(user.role)}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {canEditUser(user) && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onEdit(user)}
                    className="h-8 w-8"
                    title="Editar usuário"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onResetPassword(user)}
                  className="h-8 w-8"
                  title="Redefinir senha"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                {canDelete(user) && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onDelete(user.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Remover usuário"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}