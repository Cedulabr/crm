import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, checkEnvironmentVariables } from './env';

// Verificar variáveis de ambiente
checkEnvironmentVariables();

console.log('Supabase URL:', SUPABASE_URL ? 'Configurado' : 'Não configurado');
console.log('Supabase KEY:', SUPABASE_KEY ? 'Configurado' : 'Não configurado');

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  
  return data.session;
}