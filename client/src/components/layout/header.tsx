import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type UserInfo = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type HeaderProps = {
  onMobileMenuToggle: () => void;
};

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const userDataStr = localStorage.getItem("user");
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        setUser(userData);
      } catch (error) {
        console.error("Erro ao analisar dados do usuário:", error);
      }
    }
  }, []);

  const handleLogout = () => {
    // Limpar localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    toast({
      title: "Logout realizado com sucesso",
      description: "Você foi desconectado(a) do sistema",
    });
    
    // Redirecionar para a página de login
    setLocation("/login");
  };

  // Obter as iniciais do nome do usuário
  const getUserInitials = () => {
    if (!user || !user.name) return "?";
    
    const nameParts = user.name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  // Função para obter o rótulo da função do usuário em português
  const getUserRoleLabel = () => {
    if (!user) return "";
    
    const roleMap: Record<string, string> = {
      superadmin: "Administrador",
      manager: "Gestor",
      agent: "Agente"
    };
    
    return roleMap[user.role] || user.role;
  };

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="flex justify-between items-center px-6 py-3">
        {isMobile && (
          <div className="flex items-center lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileMenuToggle}
              className="text-neutral-500 hover:text-neutral-700"
            >
              <span className="material-icons">menu</span>
            </Button>
          </div>
        )}
        
        <div className="flex-1 flex justify-center lg:justify-start lg:ml-4">
          <div className="relative w-full max-w-md">
            <Input
              type="text"
              className="pl-10 pr-4 py-2"
              placeholder="Pesquisar clientes, propostas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-icons absolute left-3 top-2 text-neutral-400">
              search
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Meu perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-10 h-10 bg-blue-600 text-white cursor-pointer">
                <span className="text-sm font-medium">{getUserInitials()}</span>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-xs font-semibold text-blue-600">{getUserRoleLabel()}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
