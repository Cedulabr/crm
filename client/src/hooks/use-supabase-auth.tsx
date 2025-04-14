import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { User as SupabaseUser, Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase";
import { syncAuthToken } from "../lib/auth-utils";
import { useToast } from "@/hooks/use-toast";

// Tipo expandido incluindo métodos necessários para DataSyncProvider
type SupabaseAuthContextType = {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  getSupabaseClient: () => SupabaseClient | null;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, userData?: any) => Promise<any>;
  logout: () => Promise<void>;
};

export const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Função para obter o cliente Supabase
  const getSupabaseClientInstance = (): SupabaseClient | null => {
    return getSupabaseClient();
  };

  // Carregar usuário atual quando o componente é montado
  useEffect(() => {
    async function loadUserSession() {
      setIsLoading(true);
      try {
        // Tentar sincronizar tokens primeiro para garantir consistência
        await syncAuthToken();
        
        // Obter cliente Supabase
        const supabase = getSupabaseClientInstance();
        if (!supabase) {
          console.error('Cliente Supabase não disponível');
          setIsLoading(false);
          return;
        }
        
        // Verificar se há uma sessão ativa
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao carregar sessão:', error);
          setIsAuthenticated(false);
          return;
        }
        
        setSession(data.session);
        setIsAuthenticated(!!data.session);

        if (data.session) {
          // Obter usuário atual
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('Erro ao obter usuário:', userError);
            return;
          }
          
          setUser(userData.user);
          
          // Garantir que o token esteja no localStorage
          if (data.session.access_token) {
            localStorage.setItem("token", data.session.access_token);
            
            // Salvar informações do usuário para uso na interface
            if (userData.user) {
              localStorage.setItem("user", JSON.stringify({
                id: userData.user.id,
                email: userData.user.email || '',
                role: userData.user.user_metadata?.role || 'agent',
                name: userData.user.user_metadata?.name || userData.user.email || ''
              }));
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        toast({
          title: "Erro ao carregar usuário",
          description: "Não foi possível obter os dados do usuário.",
          variant: "destructive",
        });
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserSession();

    // Configurar listener para mudanças de autenticação
    const supabase = getSupabaseClientInstance();
    if (!supabase) return;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        setUser(newSession?.user || null);
        setIsAuthenticated(!!newSession);
        
        // Atualizar token no localStorage quando a sessão mudar
        if (newSession?.access_token) {
          localStorage.setItem("token", newSession.access_token);
          
          // Salvar informações do usuário para uso na interface
          if (newSession.user) {
            localStorage.setItem("user", JSON.stringify({
              id: newSession.user.id,
              email: newSession.user.email || '',
              role: newSession.user.user_metadata?.role || 'agent',
              name: newSession.user.user_metadata?.name || newSession.user.email || ''
            }));
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    );

    // Limpar listener quando o componente for desmontado
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [toast]);

  // Funções para autenticação
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const supabase = getSupabaseClientInstance();
      if (!supabase) {
        throw new Error('Cliente Supabase não disponível');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      setUser(data.user);
      setSession(data.session);
      setIsAuthenticated(true);
      
      // Salvar token no localStorage para uso nas requisições à API
      if (data.session && data.session.access_token) {
        localStorage.setItem("token", data.session.access_token);
        
        // Salvar informações do usuário para uso na interface
        if (data.user) {
          localStorage.setItem("user", JSON.stringify({
            id: data.user.id,
            email: data.user.email || '',
            role: data.user.user_metadata?.role || 'agent',
            name: data.user.user_metadata?.name || data.user.email || ''
          }));
        }
      }
      
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, userData?: any) => {
    try {
      setIsLoading(true);
      
      const supabase = getSupabaseClientInstance();
      if (!supabase) {
        throw new Error('Cliente Supabase não disponível');
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {},
        }
      });
      
      if (error) throw error;
      
      setUser(data.user);
      setSession(data.session);
      setIsAuthenticated(!!data.session);
      
      // Salvar token no localStorage para uso nas requisições à API
      if (data.session && data.session.access_token) {
        localStorage.setItem("token", data.session.access_token);
        
        // Salvar informações do usuário para uso na interface
        if (data.user) {
          localStorage.setItem("user", JSON.stringify({
            id: data.user.id,
            email: data.user.email || '',
            role: data.user.user_metadata?.role || 'agent',
            name: data.user.user_metadata?.name || data.user.email || ''
          }));
        }
      }
      
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao registrar",
        description: error.message || "Não foi possível criar sua conta.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      const supabase = getSupabaseClientInstance();
      if (!supabase) {
        throw new Error('Cliente Supabase não disponível');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      
      // Garantir que o localStorage também seja limpo
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (error: any) {
      toast({
        title: "Erro ao sair",
        description: error.message || "Não foi possível fazer logout.",
        variant: "destructive",
      });
      throw error; // Propagar o erro para ser tratado por quem chamou a função
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated,
        getSupabaseClient: getSupabaseClientInstance,
        login,
        register,
        logout
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth deve ser usado dentro de um SupabaseAuthProvider");
  }
  return context;
}
