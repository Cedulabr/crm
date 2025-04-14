import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Proposals from "@/pages/proposals";
// Kanban foi removido
import Users from "@/pages/users";
import Organizations from "@/pages/organizations";
import Forms from "@/pages/forms";
import Login from "@/pages/login";
import Layout from "@/components/layout/layout";
import { FormTemplateEditor } from "@/components/forms/form-template-editor";
import PublicForm from "@/components/forms/public-form";
import SupabaseAdminPage from "@/pages/supabase-admin";
import UpdateRolePage from "@/pages/update-role";
import { SupabaseAuthProvider, useSupabaseAuth } from "./hooks/use-supabase-auth";
import { useSupabaseProfile } from "./hooks/use-supabase-profile";
import { DataSyncProvider } from "./components/data-sync/DataSyncProvider";

// Componente de proteção de rota para verificar se o usuário está autenticado
function PrivateRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useSupabaseAuth();
  const isAuthenticated = !!user;
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, location, setLocation]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <Component {...rest} />;
}

function Router() {
  const { user, isLoading } = useSupabaseAuth();
  const [location] = useLocation();
  const isAuthenticated = !!user;
  
  // Determinar qual conteúdo exibir com base na autenticação e rota
  const renderContent = () => {
    // Se ainda estiver carregando, mostrar indicador de carregamento
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    // Rota do formulário público (não requer autenticação)
    if (location.startsWith("/form/")) {
      return (
        <Switch>
          <Route path="/form/:id" component={PublicForm} />
          <Route component={NotFound} />
        </Switch>
      );
    }
    
    // Rota de login 
    if (location === "/login") {
      return isAuthenticated ? <Redirect to="/dashboard" /> : <Login />;
    }
    
    // Páginas protegidas (só acessíveis com autenticação)
    if (isAuthenticated) {
      return (
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/clients" component={Clients} />
            <Route path="/proposals" component={Proposals} />
            {/* Rota de Kanban removida */}
            <Route path="/users" component={Users} />
            <Route path="/organizations" component={Organizations} />
            <Route path="/forms" component={Forms} />
            <Route path="/forms/new" component={FormTemplateEditor} />
            <Route path="/forms/edit/:id" component={FormTemplateEditor} />
            <Route path="/supabase-admin" component={SupabaseAdminPage} />
            <Route path="/update-role" component={UpdateRolePage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      );
    }
    
    // Se não estiver autenticado e não estiver na página de login, redirecionar
    return <Redirect to="/login" />;
  };
  
  return renderContent();
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <DataSyncProvider>
          <Router />
          <Toaster />
        </DataSyncProvider>
      </SupabaseAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
