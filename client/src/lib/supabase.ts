import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, checkEnvironmentVariables } from './env';

// Verificar variáveis de ambiente
checkEnvironmentVariables();

console.log('Supabase URL:', SUPABASE_URL ? 'Configurado' : 'Não configurado');
console.log('Supabase KEY:', SUPABASE_KEY ? 'Configurado' : 'Não configurado');

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase-auth'
  }
});

/**
 * Login com email e senha usando Supabase
 */
export async function loginWithEmailPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

/**
 * Registrar usuário usando Supabase
 */
export async function registerWithEmailPassword(email: string, password: string, userData: any = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

/**
 * Fazer logout
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return true;
}

/**
 * Obter usuário atual
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    return null;
  }
  
  return data.user;
}

/**
 * Obter sessão atual
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    return null;
  }
  
  // Atualizar o token no localStorage se tivermos uma sessão válida
  if (data.session?.access_token) {
    localStorage.setItem("token", data.session.access_token);
  }
  
  return data.session;
}

/**
 * Sincroniza o token entre o localStorage e a sessão do Supabase
 * Esta função deve ser chamada quando há suspeita de dessincronização
 */
export async function syncAuthToken() {
  try {
    // Primeiro tenta obter a sessão atual do Supabase
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Erro ao obter sessão:", error);
      return false;
    }
    
    // Se temos uma sessão válida, atualizar o localStorage
    if (data.session?.access_token) {
      localStorage.setItem("token", data.session.access_token);
      return true;
    }
    
    // Se não temos sessão Supabase mas temos token no localStorage,
    // tentar usar esse token para restaurar a sessão
    const storedToken = localStorage.getItem("token");
    if (storedToken && !data.session) {
      // Tentar restaurar sessão com o token armazenado
      const { data: sessionData, error: sessionError } = 
        await supabase.auth.setSession({ access_token: storedToken, refresh_token: "" });
      
      if (sessionError) {
        // Token inválido, remover do localStorage
        localStorage.removeItem("token");
        return false;
      }
      
      // Sessão restaurada com sucesso
      return !!sessionData.session;
    }
    
    return false;
  } catch (error) {
    console.error("Erro ao sincronizar token:", error);
    return false;
  }
}