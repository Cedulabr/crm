import { useState, useEffect } from "react";
import Layout from "@/components/layout/layout";
import { SupabaseTablesStatus } from "@/components/admin/supabase-tables-status";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Redirect } from "wouter";

export default function SupabaseAdminPage() {
  const { session, isLoading: authLoading } = useSupabaseAuth();
  const [role, setRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  
  // Obter papel do usuário do localStorage
  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        setRole(userData.role || null);
      }
    } catch (error) {
      console.error("Erro ao obter papel do usuário:", error);
    } finally {
      setIsRoleLoading(false);
    }
  }, []);
  
  // Verificar se o usuário é superadmin
  const isSuperAdmin = role === "superadmin";
  const isLoading = authLoading || isRoleLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Se não estiver autenticado, redirecionar para login
  if (!session) {
    return <Redirect to="/login" />;
  }

  // Se não for superadmin, mostrar mensagem de acesso negado
  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="container max-w-5xl mx-auto py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acesso Negado</AlertTitle>
            <AlertDescription>
              Você não tem permissão para acessar esta página. Apenas administradores do sistema podem gerenciar a configuração do Supabase.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 flex justify-center">
            <Button onClick={() => window.history.back()}>
              Voltar
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Administração do Supabase</h1>
        
        <div className="grid gap-8">
          <SupabaseTablesStatus />
        </div>
      </div>
    </Layout>
  );
}