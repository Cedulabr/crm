import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

import { supabase } from './supabase';

// Função para obter o token JWT mais atualizado
async function getAuthToken(): Promise<string> {
  try {
    // Tenta obter a sessão ativa do Supabase primeiro (mais confiável)
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      // Atualiza o token no localStorage quando obtido da sessão
      localStorage.setItem("token", data.session.access_token);
      return data.session.access_token;
    }
  } catch (error) {
    console.warn("Erro ao obter sessão do Supabase:", error);
  }
  
  // Fallback para o token armazenado no localStorage
  return localStorage.getItem("token") || "";
}

export async function apiRequest(
  method: string,
  url: string,
  options: RequestInit = {},
  data?: any
): Promise<Response> {
  // Adiciona o token de autenticação ao cabeçalho se disponível
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }
  
  // Prepara o corpo da requisição se houver dados
  let body = options.body;
  if (data && !body) {
    headers.append("Content-Type", "application/json");
    body = JSON.stringify(data);
  } else if (options.body && !headers.has("Content-Type")) {
    headers.append("Content-Type", "application/json");
  }
  
  const res = await fetch(url, {
    ...options,
    method,
    headers,
    body,
    credentials: "include",
  });
  
  // Não lançamos erro aqui para permitir o tratamento personalizado
  // para situações de login, etc.
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Adiciona o token de autenticação ao cabeçalho se disponível
    const token = await getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
