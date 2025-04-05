import { supabase } from './supabase';

// Função para testar a conexão com o Supabase
export async function testSupabaseConnection() {
  try {
    // Usar uma operação que não depende de tabelas específicas
    // Verificar a conexão usando a API de autenticação
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao conectar ao Supabase:', error);
      return {
        success: false,
        message: error.message,
        error
      };
    }
    
    // Se chegou aqui, a conexão está funcionando
    console.log('Conexão com Supabase funcionando!', data);
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      data
    };
  } catch (error) {
    console.error('Erro ao testar conexão com Supabase:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      error
    };
  }
}