// Arquivo para centralizar o acesso às variáveis de ambiente frontend
// No frontend, as variáveis devem começar com VITE_ para serem expostas pelo Vite
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

// Exibir status para debug (sem mostrar valores sensíveis)
console.log("Frontend - Supabase URL:", SUPABASE_URL ? "Configurado" : "Não configurado");
console.log("Frontend - Supabase KEY:", SUPABASE_KEY ? "Configurado" : "Não configurado");

// Verificar variáveis críticas
export function checkEnvironmentVariables() {
  const missingVars = [];
  
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_KEY) missingVars.push('VITE_SUPABASE_KEY');
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Variáveis de ambiente frontend ausentes: ${missingVars.join(', ')}`);
    console.warn("A aplicação pode funcionar com funcionalidade limitada");
    return false;
  }
  
  return true;
}