import { useState } from "react";
import Layout from "@/components/layout/layout";
import { SupabaseTablesStatus } from "@/components/admin/supabase-tables-status";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useSupabaseProfile } from "@/hooks/use-supabase-profile";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Redirect } from "wouter";

export default function SupabaseAdminPage() {
  const { session, isLoading: authLoading } = useSupabaseAuth();
  const { profile, isLoading: profileLoading } = useSupabaseProfile();
  
  // Verificar se o usuário é superadmin
  const isSuperAdmin = profile?.role === "superadmin";
  const isLoading = authLoading || profileLoading;

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