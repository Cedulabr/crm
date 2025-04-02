import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Adiciona o token de autenticação ao cabeçalho se disponível
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }
  
  if (options.body && !headers.has("Content-Type")) {
    headers.append("Content-Type", "application/json");
  }
  
  const res = await fetch(url, {
    ...options,
    headers,
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
    const token = localStorage.getItem("token");
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
