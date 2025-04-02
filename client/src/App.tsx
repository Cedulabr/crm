import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Proposals from "@/pages/proposals";
import Kanban from "@/pages/kanban";
import Users from "@/pages/users";
import Organizations from "@/pages/organizations";
import Login from "@/pages/login";
import Layout from "@/components/layout/layout";

// Componente de proteção de rota para verificar se o usuário está autenticado
function PrivateRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const isAuthenticated = localStorage.getItem("token") !== null;
  
  useEffect(() => {
    if (!isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isAuthenticated, location, setLocation]);
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <Component {...rest} />;
}

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("token") !== null
  );
  const [location] = useLocation();
  
  // Verificar autenticação inicial e atualizar quando o token mudar
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(localStorage.getItem("token") !== null);
    };
    
    // Verificar quando o estado de localStorage é alterado
    window.addEventListener("storage", checkAuth);
    
    // Também verificar em cada alteração de rota
    checkAuth();
    
    return () => window.removeEventListener("storage", checkAuth);
  }, [location]);
  
  // Determinar qual conteúdo exibir com base na autenticação e rota
  const renderContent = () => {
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
            <Route path="/kanban" component={Kanban} />
            <Route path="/users" component={Users} />
            <Route path="/organizations" component={Organizations} />
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
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
