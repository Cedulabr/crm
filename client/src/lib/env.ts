// Arquivo para centralizar o acesso às variáveis de ambiente
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

// Verificar variáveis críticas
export function checkEnvironmentVariables() {
  const missingVars = [];
  
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_KEY) missingVars.push('VITE_SUPABASE_KEY');
  
  if (missingVars.length > 0) {
    console.error(`Variáveis de ambiente ausentes: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
}