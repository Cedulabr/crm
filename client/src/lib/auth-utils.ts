import { supabase } from './supabase';

/**
 * Obtém o token de autenticação do localStorage ou da sessão Supabase
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // Tenta obter o token do localStorage primeiro
    const localToken = localStorage.getItem('token');
    if (localToken) {
      return localToken;
    }
    
    // Se não encontrar no localStorage, tenta obter da sessão Supabase
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Erro ao obter sessão Supabase:', error);
      return null;
    }
    
    if (data.session?.access_token) {
      // Atualiza o localStorage com o token da sessão
      localStorage.setItem('token', data.session.access_token);
      return data.session.access_token;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter token de autenticação:', error);
    return null;
  }
}

/**
 * Sincroniza o token entre localStorage e sessão Supabase
 * Isso garante que o token seja consistente entre as duas fontes
 */
export async function syncAuthToken(): Promise<void> {
  try {
    const localToken = localStorage.getItem('token');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão Supabase:', error);
      return;
    }
    
    if (data.session?.access_token) {
      // Se o token do Supabase existir e for diferente do localStorage
      if (!localToken || localToken !== data.session.access_token) {
        localStorage.setItem('token', data.session.access_token);
        console.log('Token sincronizado: Supabase → localStorage');
      }
    } else if (localToken) {
      // Se tem token no localStorage mas não no Supabase, tenta usá-lo para restaurar a sessão
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: localToken,
          refresh_token: localStorage.getItem('refresh_token') || '',
        });
        
        if (sessionError) {
          // Se o token no localStorage for inválido, remove-o
          console.warn('Token inválido no localStorage, removendo-o:', sessionError);
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
        } else if (sessionData.session) {
          console.log('Sessão restaurada com token do localStorage');
        }
      } catch (sessionError) {
        console.error('Erro ao tentar restaurar sessão:', sessionError);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
      }
    }
  } catch (error) {
    console.error('Erro ao sincronizar token:', error);
  }
}

/**
 * Armazena o token de autenticação no localStorage
 */
export function storeAuthToken(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * Remove o token de autenticação do localStorage
 */
export function removeAuthToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
}

/**
 * Verifica se o usuário está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}