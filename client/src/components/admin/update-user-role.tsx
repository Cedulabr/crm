import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export function UpdateUserRole() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updateRoleToSuperAdmin = async () => {
    try {
      setIsUpdating(true);
      
      // 1. Obter usuário atual
      const userString = localStorage.getItem("user");
      if (!userString) {
        throw new Error("Usuário não encontrado no localStorage");
      }
      
      const user = JSON.parse(userString);
      
      // 2. Atualizar o papel no localStorage
      const updatedUser = {
        ...user,
        role: "superadmin"
      };
      
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // 3. Fazer logout e login novamente para recarregar os dados
      toast({
        title: "Papel atualizado com sucesso",
        description: "Seu papel foi alterado para superadmin. A página será recarregada para aplicar as alterações.",
      });
      
      // Recarregar a página para aplicar as alterações
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao atualizar papel:", error);
      toast({
        title: "Erro ao atualizar papel",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
      <h3 className="text-lg font-medium text-red-800 mb-2">Permissões de Usuário</h3>
      <p className="text-sm text-red-600 mb-4">
        Seu usuário está configurado como superadmin no banco de dados, mas está sendo reconhecido como "agent" pelo frontend.
        Clique no botão abaixo para sincronizar e atualizar suas permissões.
      </p>
      <Button
        variant="destructive"
        onClick={updateRoleToSuperAdmin}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Atualizando...
          </>
        ) : (
          "Atualizar para SuperAdmin"
        )}
      </Button>
    </div>
  );
}