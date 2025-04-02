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
  
  // Verificar autenticação inicial e atualizar quando o token mudar
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(localStorage.getItem("token") !== null);
    };
    
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);
  
  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      
      <Route path="/">
        {isAuthenticated ? (
          <Layout>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/clients" component={Clients} />
            <Route path="/proposals" component={Proposals} />
            <Route path="/kanban" component={Kanban} />
          </Layout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
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
