/**
 * Verifica se uma variável de ambiente está definida
 * @param name Nome da variável de ambiente
 * @returns Boolean indicando se a variável existe e tem valor
 */
export function check_env(name: string): boolean {
  return !!process.env[name];
}