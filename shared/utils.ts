/**
 * Gera um número aleatório entre min e max (inclusive)
 */
export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Formata um valor numérico para o formato de moeda brasileira (R$)
 */
export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Formata um valor como CPF (000.000.000-00)
 */
export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata um número de telefone brasileiro ((00) 00000-0000)
 */
export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

/**
 * Converte uma string de camelCase para snake_case
 * Exemplo: "myVariableName" -> "my_variable_name"
 */
export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converte uma string de snake_case para camelCase
 * Exemplo: "my_variable_name" -> "myVariableName"
 */
export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converte um objeto com chaves em camelCase para um objeto com chaves em snake_case
 * Útil para preparar dados para envio ao Supabase
 */
export function convertObjectToSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    // Ignorar campos undefined ou null
    if (value === undefined || value === null) return;
    
    // Mapear nomes de campos específicos que precisam de tratamento especial
    const snakeCaseKey = 
      key === 'createdById' ? 'created_by_id' :
      key === 'organizationId' ? 'organization_id' :
      key === 'convenioId' ? 'convenio_id' :
      key === 'clientId' ? 'client_id' :
      key === 'productId' ? 'product_id' : 
      key === 'bankId' ? 'bank_id' :
      camelToSnakeCase(key);
      
    result[snakeCaseKey] = value;
  });
  
  return result;
}

/**
 * Converte um objeto com chaves em snake_case para um objeto com chaves em camelCase
 * Útil para processar dados recebidos do Supabase
 */
export function convertObjectToCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const camelCaseKey = snakeToCamelCase(key);
    result[camelCaseKey] = value;
  });
  
  return result;
}