import type { Express } from "express";
import { createServer, type Server } from "http";
import { SupabaseStorage } from "./storage-supabase";
import { z } from "zod";
import { insertClientSchema, insertProposalSchema, insertKanbanSchema } from "@shared/schema";

// Verifique se estamos usando o Supabase ou MemStorage com base nas variáveis de ambiente
// Se SUPABASE_URL e SUPABASE_KEY estiverem definidos, use o SupabaseStorage
import { storage as memStorage } from "./storage";
import { check_env } from "./check-env";

// Determine qual armazenamento usar
const useSupabase = check_env("SUPABASE_URL") && check_env("SUPABASE_KEY");
const storage = useSupabase ? new SupabaseStorage() : memStorage;

export async function registerRoutes(app: Express): Promise<Server> {
  // =================
  // Client endpoints
  // =================
  
  app.get('/api/clients', async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching clients' });
    }
  });

  app.get('/api/clients/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching client' });
    }
  });

  app.post('/api/clients', async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid client data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating client' });
    }
  });

  app.put('/api/clients/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const updatedClient = await storage.updateClient(id, clientData);
      
      if (!updatedClient) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid client data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error updating client' });
    }
  });

  app.delete('/api/clients/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClient(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting client' });
    }
  });

  app.get('/api/clients-with-kanban', async (req, res) => {
    try {
      const clientsWithKanban = await storage.getClientsWithKanban();
      res.json(clientsWithKanban);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching clients with kanban data' });
    }
  });

  // =================
  // Product endpoints
  // =================
  
  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching products' });
    }
  });

  // =================
  // Convenio endpoints
  // =================
  
  app.get('/api/convenios', async (req, res) => {
    try {
      const convenios = await storage.getConvenios();
      res.json(convenios);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching convenios' });
    }
  });

  // =================
  // Bank endpoints
  // =================
  
  app.get('/api/banks', async (req, res) => {
    try {
      const banks = await storage.getBanks();
      res.json(banks);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching banks' });
    }
  });

  // =================
  // Proposal endpoints
  // =================
  
  app.get('/api/proposals', async (req, res) => {
    try {
      // Handle filtering by query params
      const { productId, status, minValue, maxValue, clientId } = req.query;
      
      let proposals;
      
      if (productId) {
        proposals = await storage.getProposalsByProduct(Number(productId));
      } else if (status) {
        proposals = await storage.getProposalsByStatus(String(status));
      } else if (minValue) {
        proposals = await storage.getProposalsByValue(
          Number(minValue), 
          maxValue ? Number(maxValue) : undefined
        );
      } else if (clientId) {
        proposals = await storage.getProposalsByClient(Number(clientId));
      } else {
        proposals = await storage.getProposals();
      }
      
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching proposals' });
    }
  });

  app.get('/api/proposals-with-details', async (req, res) => {
    try {
      const proposals = await storage.getProposalsWithDetails();
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching proposals with details' });
    }
  });

  app.get('/api/proposals/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const proposal = await storage.getProposal(id);
      
      if (!proposal) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      
      res.json(proposal);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching proposal' });
    }
  });

  app.post('/api/proposals', async (req, res) => {
    try {
      const proposalData = insertProposalSchema.parse(req.body);
      const proposal = await storage.createProposal(proposalData);
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid proposal data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating proposal' });
    }
  });

  app.put('/api/proposals/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const proposalData = insertProposalSchema.partial().parse(req.body);
      const updatedProposal = await storage.updateProposal(id, proposalData);
      
      if (!updatedProposal) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      
      res.json(updatedProposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid proposal data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error updating proposal' });
    }
  });

  app.delete('/api/proposals/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProposal(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting proposal' });
    }
  });

  // =================
  // Kanban endpoints
  // =================
  
  app.get('/api/kanban', async (req, res) => {
    try {
      const kanbanEntries = await storage.getKanbanEntries();
      res.json(kanbanEntries);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching kanban entries' });
    }
  });

  app.post('/api/kanban', async (req, res) => {
    try {
      const kanbanData = insertKanbanSchema.parse(req.body);
      const kanbanEntry = await storage.createKanbanEntry(kanbanData);
      res.status(201).json(kanbanEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid kanban data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating kanban entry' });
    }
  });

  app.put('/api/kanban/client/:clientId/column', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { column } = req.body;
      
      if (!column) {
        return res.status(400).json({ message: 'Column is required' });
      }
      
      const updatedEntry = await storage.updateClientKanbanColumn(clientId, column);
      
      if (!updatedEntry) {
        return res.status(404).json({ message: 'Kanban entry not found for client' });
      }
      
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: 'Error updating kanban column' });
    }
  });

  // =================
  // Dashboard data
  // =================
  
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const clients = await storage.getClients();
      const proposals = await storage.getProposals();
      
      // Calculate total clients
      const totalClients = clients.length;
      
      // Active proposals
      const activeProposals = proposals.filter(p => p.status !== 'recusada').length;
      
      // Conversion rate (accepted proposals / total proposals)
      const acceptedProposals = proposals.filter(p => p.status === 'aceita').length;
      const conversionRate = proposals.length > 0 
        ? Math.round((acceptedProposals / proposals.length) * 100) 
        : 0;
      
      // Total value of all proposals
      const totalValue = proposals.reduce((sum, proposal) => {
        return sum + (Number(proposal.value) || 0);
      }, 0);
      
      res.json({
        totalClients,
        activeProposals,
        conversionRate,
        totalValue
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
  });

  app.get('/api/dashboard/proposals-by-status', async (req, res) => {
    try {
      const emNegociacao = await storage.getProposalsByStatus('em_negociacao');
      const aceitas = await storage.getProposalsByStatus('aceita');
      const emAnalise = await storage.getProposalsByStatus('em_analise');
      const recusadas = await storage.getProposalsByStatus('recusada');
      
      res.json({
        emNegociacao: emNegociacao.length,
        aceitas: aceitas.length,
        emAnalise: emAnalise.length,
        recusadas: recusadas.length
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching proposals by status' });
    }
  });

  app.get('/api/dashboard/recent-activity', async (req, res) => {
    try {
      // Get the most recent proposals with client details
      const proposals = await storage.getProposalsWithDetails();
      
      // Sort by createdAt (most recent first) and take up to 5
      const recentActivity = proposals
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 5);
      
      res.json(recentActivity);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching recent activity' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
