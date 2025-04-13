import OpenAI from 'openai';

// o modelo mais recente da OpenAI é "gpt-4o" que foi lançado em 13 de maio de 2024. Não mude isso a menos que explicitamente solicitado pelo usuário
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Serviço para interação com a API da OpenAI
 */
export class OpenAIService {
  /**
   * Processa uma consulta de linguagem natural para transformá-la em parâmetros de busca estruturados
   * @param query Consulta em linguagem natural
   * @returns Parâmetros estruturados para busca
   */
  async processNaturalLanguageQuery(query: string): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em extrair parâmetros de busca de consultas em linguagem natural. 
            Analise a consulta do usuário e extraia os parâmetros relevantes para busca em um sistema CRM.
            Os parâmetros possíveis são:
            - entityType: O tipo de entidade a ser buscada (client, proposal, user, organization, formTemplate, formSubmission)
            - name: Nome a ser buscado (para clientes, usuários ou organizações)
            - email: Email a ser buscado (para clientes ou usuários)
            - status: Status a ser filtrado (para propostas ou envios de formulário)
            - minValue: Valor mínimo (para propostas)
            - maxValue: Valor máximo (para propostas)
            - productId: ID do produto (para propostas)
            - creatorId: ID do criador (para propostas ou clientes)
            - dateRange: Intervalo de datas (startDate e endDate para propostas ou envios)
            - sortBy: Campo para ordenação
            - sortOrder: Direção da ordenação (asc/desc)
            - limit: Número de resultados a retornar
            
            Retorne apenas os parâmetros identificados em formato JSON, sem texto adicional.`
          },
          { role: "user", content: query }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content || '{}';
      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error('Erro ao processar consulta em linguagem natural:', error);
      throw new Error('Falha ao processar consulta em linguagem natural');
    }
  }

  /**
   * Gera sugestões de autocompletar com base em um texto parcial
   * @param partialText Texto parcial digitado pelo usuário
   * @param context Contexto da busca (em qual entidade está buscando)
   * @returns Lista de sugestões para autocompletar
   */
  async generateAutocompleteSuggestions(partialText: string, context: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em sugerir termos de autocompletar para um sistema CRM.
            Com base no contexto e no texto parcial fornecido, sugira até 5 possíveis consultas completas que o usuário possa estar tentando formar.
            Contexto: ${context}
            Retorne apenas um array JSON de strings com as sugestões, sem texto adicional.`
          },
          { role: "user", content: partialText }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content || '{"suggestions":[]}';
      const result = JSON.parse(content);
      return result.suggestions || [];
    } catch (error) {
      console.error('Erro ao gerar sugestões de autocompletar:', error);
      return [];
    }
  }

  /**
   * Classifica resultados com base na similaridade com a consulta original
   * @param query Consulta original do usuário
   * @param items Lista de itens a serem ordenados
   * @returns Lista de itens ordenados por relevância
   */
  async rankResultsBySimilarity(query: string, items: any[]): Promise<any[]> {
    try {
      // Para poucas entradas, retorna sem processamento adicional
      if (items.length <= 3) return items;
      
      // Para queries simples ou poucos itens, aplicar ordenação básica
      if (query.length < 10 || items.length < 10) {
        // Retornar cópia para não modificar original
        return [...items];
      }
      
      // Para conjuntos maiores, usar a OpenAI para classificar por relevância
      const itemsJson = JSON.stringify(items.slice(0, 20)); // Limitar para evitar tokens excessivos
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em classificar resultados por relevância.
            Analise a consulta do usuário e a lista de itens, e retorne os índices dos itens ordenados do mais relevante para o menos relevante.
            Considere a semântica da consulta e não apenas correspondências exatas de texto.
            Retorne apenas um array JSON de números inteiros representando os índices dos itens, sem texto adicional.`
          },
          { 
            role: "user", 
            content: `Consulta: ${query}\n\nItens: ${itemsJson}`
          }
        ],
        response_format: { type: "json_object" },
      });
      
      const content = response.choices[0].message.content || '{"indices":[]}';
      const result = JSON.parse(content);
      const indices = result.indices || [];
      
      // Reordenar os itens baseado nos índices retornados
      const ranked = indices
        .filter((index: number) => index >= 0 && index < items.length) // Filtrar índices inválidos
        .map((index: number) => items[index]);
      
      // Incluir itens que não foram classificados no final
      const notRanked = items.filter((_, i) => !indices.includes(i));
      
      return [...ranked, ...notRanked];
    } catch (error) {
      console.error('Erro ao classificar resultados por relevância:', error);
      // Em caso de erro, retornar os itens sem alteração na ordem
      return items;
    }
  }
  
  /**
   * Gera opções de autocompletar baseado no texto parcial e contexto
   * @param input Texto parcial digitado pelo usuário
   * @param contextData Dados de contexto para informar as sugestões
   * @returns Lista de sugestões para autocompletar
   */
  async generateAutocompleteOptions(input: string, contextData: any[]): Promise<string[]> {
    try {
      // Para entradas muito curtas ou vazias, retornar lista vazia
      if (!input || input.length < 2) return [];
      
      // Extrair informações de contexto que possam ajudar no autocompletar
      const contextExamples = contextData
        .slice(0, 10)
        .map(item => JSON.stringify(item))
        .join('\n');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em gerar sugestões de autocompletar para um sistema CRM.
            Com base no texto parcial e nos exemplos de dados do sistema, sugira até 5 possíveis consultas completas que o usuário possa estar tentando formar.
            As sugestões devem ser relevantes para um sistema de gerenciamento de clientes, propostas e vendas.
            Exemplos de dados do sistema:
            ${contextExamples}
            
            Retorne apenas um array JSON de strings com as sugestões, sem texto adicional.`
          },
          { role: "user", content: input }
        ],
        response_format: { type: "json_object" },
      });
      
      const content = response.choices[0].message.content || '{"suggestions":[]}';
      const result = JSON.parse(content);
      return result.suggestions || [];
    } catch (error) {
      console.error('Erro ao gerar opções de autocompletar:', error);
      return [];
    }
  }
}

export const openaiService = new OpenAIService();