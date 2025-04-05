import OpenAI from "openai";
import { Client } from "@shared/schema";

// Inicializar o cliente OpenAI com a chave da API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Classe que gerencia a integração com a OpenAI
export class OpenAIService {
  /**
   * Processa uma consulta em linguagem natural e retorna uma consulta estruturada
   * @param query Consulta em linguagem natural
   * @returns Objeto de consulta estruturada
   */
  async processNaturalLanguageQuery(query: string): Promise<any> {
    try {
      // o modelo mais recente da OpenAI é "gpt-4o" que foi lançado em 13 de maio de 2024. Não modifique isso a menos que solicitado explicitamente pelo usuário
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em analisar consultas em linguagem natural e 
            convertê-las em estruturas de busca para um sistema CRM. 
            
            O sistema contém informações sobre clientes, propostas e produtos.

            Extraia as entidades, intenções e filtros da consulta do usuário e retorne um objeto JSON
            com os campos:
            {
              "entidade": "cliente" | "proposta" | "produto" | "geral",
              "filtros": {
                "nome": string | null,
                "email": string | null,
                "cpf": string | null,
                "telefone": string | null,
                "status": string | null,
                "produto": string | null,
                "valorMin": number | null,
                "valorMax": number | null,
                "dataInicio": string | null,
                "dataFim": string | null
              },
              "ordenacao": "nome" | "data" | "valor" | null,
              "ordem": "asc" | "desc" | null,
              "intencao": "listar" | "buscar" | "filtrar" | null
            }
            
            Exemplos:
            - "mostrar clientes com nome Maria" → { "entidade": "cliente", "filtros": { "nome": "Maria" }, "intencao": "buscar" }
            - "propostas acima de 5000 reais" → { "entidade": "proposta", "filtros": { "valorMin": 5000 }, "intencao": "filtrar" }
            - "clientes cadastrados este mês" → { "entidade": "cliente", "filtros": { "dataInicio": "início do mês atual" }, "intencao": "listar" }
            - "listar propostas do produto empréstimo" → { "entidade": "proposta", "filtros": { "produto": "empréstimo" }, "intencao": "listar" }
            `
          },
          {
            role: "user",
            content: query
          }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error("Erro ao processar consulta com OpenAI:", error);
      return {
        entidade: "geral",
        filtros: {},
        ordenacao: null,
        ordem: null,
        intencao: "listar"
      };
    }
  }

  /**
   * Gera sugestões de autocompletar com base em uma entrada parcial
   * @param input Texto parcial do usuário
   * @param clients Lista de clientes para contextualização
   * @returns Lista de sugestões de autocompletar
   */
  async generateAutocompleteOptions(input: string, clients: Client[]): Promise<string[]> {
    if (!input || input.length < 2) {
      return [];
    }

    try {
      // Preparar contexto com alguns exemplos de clientes
      const clientContext = clients.slice(0, 5).map(c => 
        `${c.name || ''} (${c.email || ''}, ${c.phone || ''})`
      ).join(', ');

      // o modelo mais recente da OpenAI é "gpt-4o" que foi lançado em 13 de maio de 2024. Não modifique isso a menos que solicitado explicitamente pelo usuário
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de busca para um sistema CRM.
            
            Contexto: O sistema possui clientes como: ${clientContext}
            
            Baseado na entrada parcial do usuário, forneça de 3 a 5 sugestões de buscas completas
            que sejam relevantes em um contexto de CRM. Retorne apenas uma lista JSON de strings,
            sem explicações adicionais.
            
            Exemplos de consultas úteis:
            - "mostrar clientes com nome [nome]"
            - "propostas acima de [valor] reais"
            - "clientes cadastrados este mês"
            - "listar propostas do produto [produto]"
            - "clientes com email [domínio]"
            - "propostas pendentes"
            - "clientes sem proposta"
            `
          },
          {
            role: "user", 
            content: input
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = JSON.parse(response.choices[0].message.content || '[]');
      return Array.isArray(content) ? content : 
             (content.suggestions ? content.suggestions : []);
    } catch (error) {
      console.error("Erro ao gerar opções de autocompletar:", error);
      return [];
    }
  }

  /**
   * Avalia a similaridade semântica entre uma consulta e documentos
   * @param query Consulta do usuário
   * @param documents Lista de documentos para comparar
   * @returns Documentos ordenados por relevância
   */
  async rankResultsBySimilarity(query: string, documents: any[]): Promise<any[]> {
    if (!documents || documents.length === 0) {
      return [];
    }

    try {
      // Criar representação em texto dos documentos
      const documentTexts = documents.map(doc => {
        if (doc.name) { // Cliente
          return `Cliente: ${doc.name || ''}, Email: ${doc.email || ''}, Telefone: ${doc.phone || ''}`;
        } else if (doc.clientId) { // Proposta
          return `Proposta: Valor ${doc.value || 0}, Status: ${doc.status || ''}, Produto: ${doc.productId || ''}`;
        } else {
          return JSON.stringify(doc);
        }
      });

      // o modelo mais recente da OpenAI é "gpt-4o" que foi lançado em 13 de maio de 2024. Não modifique isso a menos que solicitado explicitamente pelo usuário
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em classificar documentos por relevância.
            
            O usuário fornecerá uma consulta e uma lista de documentos numerados.
            Você deve avaliar a relevância semântica de cada documento em relação à consulta
            e retornar um array JSON com os índices dos documentos em ordem de relevância (do mais relevante para o menos).
            
            Retorne apenas o array JSON com os índices, sem explicações adicionais.
            `
          },
          {
            role: "user",
            content: `Consulta: "${query}"
            
            Documentos:
            ${documentTexts.map((text, idx) => `${idx}: ${text}`).join('\n')}
            `
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = JSON.parse(response.choices[0].message.content || '[]');
      const indices = Array.isArray(content) ? content : 
                    (content.indices || content.ranking || []);
      
      // Reordenar documentos com base nos índices retornados
      return indices
        .filter((idx: number) => idx >= 0 && idx < documents.length)
        .map((idx: number) => documents[idx]);
    } catch (error) {
      console.error("Erro ao classificar resultados por similaridade:", error);
      return documents; // Retorna os documentos originais em caso de erro
    }
  }
}

export const openAIService = new OpenAIService();