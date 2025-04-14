import { getSupabaseClient } from './supabase';

/**
 * Sincroniza o token de autenticação entre localStorage e sessão Supabase
 * Esta função garante que o token armazenado no localStorage esteja sincronizado
 * com a sessão atual do Supabase, permitindo que requisições HTTP e WebSockets
 * usem o mesmo token.
 * 
 * @returns Promise<boolean> Indica se a sincronização foi bem-sucedida
 */
export async function syncAuthToken(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Cliente Supabase não disponível');
      return false;
    }

    // Verificar se há uma sessão ativa no Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão Supabase:', error);
      return false;
    }

    if (!session) {
      // Se não há sessão, limpar localStorage
      localStorage.removeItem('token');
      return false;
    }

    // Atualizar o token no localStorage
    localStorage.setItem('token', session.access_token);
    
    // Armazenar informações do usuário para fácil acesso
    if (session.user) {
      const userData = {
        id: session.user.id,
        email: session.user.email,
        role: session.user.user_metadata?.role || 'user',
        name: session.user.user_metadata?.name || session.user.email
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao sincronizar token de autenticação:', error);
    return false;
  }
}

/**
 * Obtém o token de autenticação atualmente sincronizado
 * @returns string | null Token de autenticação ou null se não estiver autenticado
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Verifica se o token de autenticação atual é válido
 * @returns Promise<boolean> Indica se o token é válido
 */
export async function validateAuthToken(): Promise<boolean> {
  try {
    const token = getAuthToken();
    if (!token) return false;
    
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao validar token de autenticação:', error);
    return false;
  }
}

/**
 * Adiciona o token de autenticação a headers de requisição
 * @param headers Headers existentes (opcional)
 * @returns Headers com o token de autenticação adicionado
 */
export function addAuthTokenToHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  const newHeaders = new Headers(headers);
  
  if (token) {
    newHeaders.set('Authorization', `Bearer ${token}`);
  }
  
  return newHeaders;
}