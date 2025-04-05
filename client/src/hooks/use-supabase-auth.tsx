import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import {
  supabase,
  loginWithEmailPassword,
  registerWithEmailPassword,
  logout as supabaseLogout,
  getCurrentUser
} from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";

type SupabaseAuthContextType = {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
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

  // Carregar usuário atual quando o componente é montado
  useEffect(() => {
    async function loadUserSession() {
      setIsLoading(true);
      try {
        // Verificar se há uma sessão ativa
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao carregar sessão:', error);
          return;
        }
        
        setSession(data.session);

        if (data.session) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        toast({
          title: "Erro ao carregar usuário",
          description: "Não foi possível obter os dados do usuário.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadUserSession();

    // Configurar listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
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
      const data = await loginWithEmailPassword(email, password);
      setUser(data.user);
      setSession(data.session);
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
      const data = await registerWithEmailPassword(email, password, userData);
      setUser(data.user);
      setSession(data.session);
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
      await supabaseLogout();
      setUser(null);
      setSession(null);
      
      // Garantir que o localStorage também seja limpo
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // O redirecionamento será gerenciado pelo Router no App.tsx
      // quando o usuário for definido como null
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
