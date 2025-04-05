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