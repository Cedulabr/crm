import { Router, Request, Response } from 'express';
import { openaiService } from '../services/openai-service';
import { storage } from '../storage';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Schema para validação da consulta de busca
const SearchQuerySchema = z.object({
  query: z.string().min(1, { message: 'A consulta não pode estar vazia' }),
});

// Schema para validação das sugestões de autocompletar
const AutocompleteQuerySchema = z.object({
  partialText: z.string().min(1, { message: 'O texto parcial não pode estar vazio' }),
  context: z.string().optional(),
});

/**
 * Rota para busca inteligente com processamento de linguagem natural
 */
router.post('/search', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    // Validar entrada
    const validation = SearchQuerySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { query } = validation.data;
    
    // Processar a consulta em linguagem natural para extrair parâmetros estruturados
    const searchParams = await openaiService.processNaturalLanguageQuery(query);
    
    // Realizar a busca com base nos parâmetros extraídos
    const results = await executeSearch(searchParams);
    
    res.json({ 
      query,
      interpretedParams: searchParams,
      results
    });
  } catch (error) {
    console.error('Erro na busca inteligente:', error);
    res.status(500).json({ error: 'Erro ao processar a busca inteligente' });
  }
});

/**
 * Rota para sugestões de autocompletar
 */
router.post('/autocomplete', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    // Validar entrada
    const validation = AutocompleteQuerySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { partialText, context = 'geral' } = validation.data;
    
    // Gerar sugestões de autocompletar
    // Buscar alguns clientes para contextualização
    const clients = await storage.getClients();
    const suggestions = await openaiService.generateAutocompleteOptions(partialText, clients.slice(0, 5));
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Erro nas sugestões de autocompletar:', error);
    res.status(500).json({ error: 'Erro ao gerar sugestões de autocompletar' });
  }
});

/**
 * Função auxiliar para executar a busca com base nos parâmetros extraídos
 * @param params Parâmetros de busca estruturados
 * @returns Resultados da busca
 */
async function executeSearch(params: any) {
  const { entityType } = params;
  let results = [];

  try {
    switch (entityType) {
      case 'client':
        if (params.name) {
          // Busca simplificada por nome - na implementação real, seria necessário uma busca mais sofisticada
          const clients = await storage.getClients();
          results = clients.filter(client => 
            client.name.toLowerCase().includes(params.name.toLowerCase())
          );
        } else if (params.email) {
          const clients = await storage.getClients();
          results = clients.filter(client => 
            client.email?.toLowerCase().includes(params.email.toLowerCase())
          );
        } else {
          results = await storage.getClients();
        }
        break;
      
      case 'proposal':
        if (params.status) {
          results = await storage.getProposalsByStatus(params.status);
        } else if (params.minValue || params.maxValue) {
          results = await storage.getProposalsByValue(
            params.minValue || 0, 
            params.maxValue || Number.MAX_SAFE_INTEGER
          );
        } else if (params.productId) {
          results = await storage.getProposalsByProduct(params.productId);
        } else {
          results = await storage.getProposalsWithDetails();
        }
        break;
      
      case 'user':
        if (params.name || params.email) {
          const users = await storage.getUsers();
          results = users.filter(user => 
            (params.name && user.name.toLowerCase().includes(params.name.toLowerCase())) ||
            (params.email && user.email.toLowerCase().includes(params.email.toLowerCase()))
          );
        } else {
          results = await storage.getUsers();
        }
        break;
      
      case 'organization':
        const organizations = await storage.getOrganizations();
        if (params.name) {
          results = organizations.filter(org => 
            org.name.toLowerCase().includes(params.name.toLowerCase())
          );
        } else {
          results = organizations;
        }
        break;
      
      case 'formTemplate':
        const templates = await storage.getFormTemplates();
        if (params.name) {
          results = templates.filter(template => 
            template.name.toLowerCase().includes(params.name.toLowerCase())
          );
        } else {
          results = templates;
        }
        break;
      
      case 'formSubmission':
        if (params.status) {
          results = await storage.getFormSubmissionsByStatus(params.status);
        } else {
          results = await storage.getFormSubmissions();
        }
        break;
      
      default:
        // Se não foi especificado um tipo de entidade, buscar em todas as entidades principais
        const allClients = await storage.getClients();
        const allProposals = await storage.getProposalsWithDetails();
        
        // Para buscas genéricas, retornamos um array com todos os resultados combinados
        const filteredClients = params.name ? 
          allClients.filter(client => client.name.toLowerCase().includes(params.name.toLowerCase())) : 
          allClients.slice(0, 5);
          
        const filteredProposals = params.status ? 
          await storage.getProposalsByStatus(params.status) : 
          allProposals.slice(0, 5);
          
        results = [...filteredClients, ...filteredProposals];
    }

    // Aplicar ordenação, se especificada
    if (params.sortBy) {
      const direction = params.sortOrder === 'desc' ? -1 : 1;
      results.sort((a: any, b: any) => {
        if (a[params.sortBy] < b[params.sortBy]) return -1 * direction;
        if (a[params.sortBy] > b[params.sortBy]) return 1 * direction;
        return 0;
      });
    }

    // Aplicar limite, se especificado
    if (params.limit && results.length > params.limit) {
      results = results.slice(0, params.limit);
    }

    return results;
  } catch (error) {
    console.error('Erro ao executar busca:', error);
    throw new Error('Falha ao executar busca com os parâmetros fornecidos');
  }
}

export default router;