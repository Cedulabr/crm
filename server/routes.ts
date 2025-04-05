import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { 
  insertClientSchema, 
  insertProposalSchema, 
  InsertClient, 
  insertUserSchema, 
  registerUserSchema,
  insertOrganizationSchema,
  insertFormTemplateSchema,
  insertFormSubmissionSchema,
  UserRole
} from "@shared/schema";

// Importar o storage configurado no arquivo storage.ts
// Este projeto usa DatabaseStorage para persistência dos dados no PostgreSQL
import { storage } from "./storage";
import { check_env } from "./check-env";
import { authMiddleware, requireAuth, checkRole } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Aplicar middleware de autenticação a todas as rotas
  app.use(authMiddleware);
  
  // Rotas de autenticação não exigem validação de token
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const authData = await storage.loginUser(email, password);
      
      if (!authData) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      res.json(authData);
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ message: 'Error during login' });
    }
  });
  
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = registerUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Error registering user' });
    }
  });
  
  // Obter o usuário atual com base no token JWT
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json(req.user);
  });
  
  // Rotas de acesso geral (autenticação requerida)
  
  // =================
  // Client endpoints
  // =================
  
  app.get('/api/clients', requireAuth, async (req, res) => {
    try {
      let clients = [];
      
      // Aplicar controle de acesso baseado no papel do usuário
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      if (req.user.role === UserRole.AGENT) {
        // Agentes só veem seus próprios clientes
        clients = await storage.getClientsByCreator(req.user.id);
      } else if (req.user.role === UserRole.MANAGER) {
        // Gestores veem todos os clientes de sua organização
        clients = await storage.getClientsByOrganization(req.user.organizationId || 0);
      } else {
        // Superadmins veem todos os clientes
        clients = await storage.getClients();
      }
      
      res.json(clients);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
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

  app.post('/api/clients', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Usar dados do usuário autenticado
      const data = { 
        ...req.body,
        organizationId: req.body.organizationId || req.user.organizationId || 1,
        createdById: req.user.id
      };
      
      const clientData = insertClientSchema.parse(data);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid client data', errors: error.errors });
      }
      console.error("Erro ao criar cliente:", error);
      res.status(500).json({ message: 'Error creating client' });
    }
  });

  app.put('/api/clients/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar se o usuário tem permissão para editar este cliente
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Verificar permissões baseadas no papel do usuário
      if (req.user.role === UserRole.AGENT && client.createdById !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to edit this client' });
      }
      
      if (req.user.role === UserRole.MANAGER && client.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: 'You do not have permission to edit clients from other organizations' });
      }
      
      const clientData = insertClientSchema.partial().parse(req.body);
      const updatedClient = await storage.updateClient(id, clientData);
      
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid client data', errors: error.errors });
      }
      res.status(500).json({ message: 'Error updating client' });
    }
  });

  app.delete('/api/clients/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar se o usuário tem permissão para excluir este cliente
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Verificar permissões baseadas no papel do usuário
      if (req.user.role === UserRole.AGENT && client.createdById !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to delete this client' });
      }
      
      if (req.user.role === UserRole.MANAGER && client.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: 'You do not have permission to delete clients from other organizations' });
      }
      
      const deleted = await storage.deleteClient(id);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      res.status(500).json({ message: 'Error deleting client' });
    }
  });

  // Rota clients-with-kanban removida (funcionalidade de kanban foi eliminada)

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
  
  app.get('/api/proposals', requireAuth, async (req, res) => {
    try {
      // Handle filtering by query params
      const { productId, status, minValue, maxValue, clientId } = req.query;
      
      // Aplicar controle de acesso baseado no papel do usuário
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      let proposals = [];
      
      // Filtrar primeiro por papel do usuário
      if (req.user.role === UserRole.AGENT) {
        // Agentes só veem suas próprias propostas
        proposals = await storage.getProposalsByCreator(req.user.id);
      } else if (req.user.role === UserRole.MANAGER) {
        // Gestores veem todas as propostas de sua organização
        proposals = await storage.getProposalsByOrganization(req.user.organizationId || 0);
      } else {
        // Superadmins veem todas as propostas
        proposals = await storage.getProposals();
      }
      
      // Aplicar filtros adicionais ao conjunto já filtrado por papel
      if (productId) {
        proposals = proposals.filter(p => p.productId === Number(productId));
      }
      
      if (status) {
        proposals = proposals.filter(p => p.status === String(status));
      }
      
      if (minValue) {
        const min = Number(minValue);
        const max = maxValue ? Number(maxValue) : Infinity;
        proposals = proposals.filter(p => {
          const value = Number(p.value) || 0;
          return value >= min && value <= max;
        });
      }
      
      if (clientId) {
        proposals = proposals.filter(p => p.clientId === Number(clientId));
      }
      
      res.json(proposals);
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
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

  app.post('/api/proposals', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Separar os campos de cliente adicionais
      const { clientName, clientCpf, clientPhone, ...proposalData } = req.body;
      
      // Criar ou atualizar o cliente com base nas informações da proposta
      let clientId = null;
      
      if (clientName) {
        // Verificar se existe um cliente com o mesmo CPF (se fornecido)
        let existingClient = null;
        if (clientCpf) {
          // Procurar todos os clientes
          const allClients = await storage.getClients();
          // Encontrar o cliente com o mesmo CPF
          existingClient = allClients.find(client => client.cpf === clientCpf);
        }
        
        if (existingClient) {
          // Atualizar o cliente existente se necessário
          const updateData: Partial<InsertClient> = {
            name: clientName
          };
          
          if (clientPhone) {
            updateData.phone = clientPhone;
          }
          
          const updatedClient = await storage.updateClient(existingClient.id, updateData);
          if (updatedClient) {
            clientId = updatedClient.id;
          }
        } else {
          // Criar um novo cliente com os dados do usuário autenticado
          const newClient = {
            name: clientName,
            cpf: clientCpf || null,
            phone: clientPhone || null,
            convenioId: proposalData.convenioId || null,
            birthDate: null,
            contact: null,
            email: null,
            company: null,
            organizationId: req.user.organizationId || 1,
            createdById: req.user.id
          };
          
          const createdClient = await storage.createClient(newClient);
          clientId = createdClient.id;
        }
      }
      
      // Adicionar o ID do cliente à proposta e outros campos necessários com dados do usuário logado
      const completeProposalData = {
        ...proposalData,
        clientId: clientId,
        organizationId: req.user.organizationId || 1,
        createdById: req.user.id,
        status: proposalData.status || 'Nova proposta'
      };
      
      // Validar os dados da proposta
      const validProposalData = insertProposalSchema.parse(completeProposalData);
      
      // Criar uma proposta com os dados validados
      const proposal = await storage.createProposal(validProposalData);
      
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid proposal data', errors: error.errors });
      }
      console.error("Erro ao criar proposta:", error);
      res.status(500).json({ message: 'Error creating proposal' });
    }
  });

  app.put('/api/proposals/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Buscar a proposta e verificar se o usuário tem permissão para atualizá-la
      const proposal = await storage.getProposal(id);
      
      if (!proposal) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      
      // Verificar permissões baseadas no papel do usuário
      if (req.user.role === UserRole.AGENT && proposal.createdById !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to update this proposal' });
      }
      
      if (req.user.role === UserRole.MANAGER && proposal.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: 'You do not have permission to update proposals from other organizations' });
      }
      
      // Separar os campos de cliente adicionais
      const { clientName, clientCpf, clientPhone, ...proposalData } = req.body;
      
      // Atualizar o cliente associado à proposta (se aplicável)
      if (proposal.clientId && clientName) {
        const updateData: Partial<InsertClient> = {
          name: clientName
        };
        
        if (clientCpf) {
          updateData.cpf = clientCpf;
        }
        
        if (clientPhone) {
          updateData.phone = clientPhone;
        }
        
        await storage.updateClient(proposal.clientId, updateData);
      }
      
      const validProposalData = insertProposalSchema.partial().parse(proposalData);
      const updatedProposal = await storage.updateProposal(id, validProposalData);
      
      res.json(updatedProposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid proposal data', errors: error.errors });
      }
      console.error("Erro ao atualizar proposta:", error);
      res.status(500).json({ message: 'Error updating proposal' });
    }
  });

  app.delete('/api/proposals/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Buscar a proposta para verificar se o usuário tem permissão para excluí-la
      const proposal = await storage.getProposal(id);
      
      if (!proposal) {
        return res.status(404).json({ message: 'Proposal not found' });
      }
      
      // Verificar permissões baseadas no papel do usuário
      if (req.user.role === UserRole.AGENT && proposal.createdById !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to delete this proposal' });
      }
      
      if (req.user.role === UserRole.MANAGER && proposal.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: 'You do not have permission to delete proposals from other organizations' });
      }
      
      const deleted = await storage.deleteProposal(id);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir proposta:', error);
      res.status(500).json({ message: 'Error deleting proposal' });
    }
  });

  // =================
  // Kanban endpoints removidos
  // =================
  
  // A funcionalidade de Kanban foi removida do sistema

  // =================
  // Dashboard data
  // =================
  
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      let clients = [];
      let proposals = [];
      
      // Filtrar dados conforme o papel do usuário
      if (req.user.role === UserRole.AGENT) {
        // Agentes só veem seus próprios clientes e propostas
        clients = await storage.getClientsByCreator(req.user.id);
        proposals = await storage.getProposalsByCreator(req.user.id);
      } else if (req.user.role === UserRole.MANAGER) {
        // Gestores veem clientes e propostas de sua organização
        clients = await storage.getClientsByOrganization(req.user.organizationId || 0);
        proposals = await storage.getProposalsByOrganization(req.user.organizationId || 0);
      } else {
        // Superadmins veem todos os dados
        clients = await storage.getClients();
        proposals = await storage.getProposals();
      }
      
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
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
  });

  app.get('/api/dashboard/proposals-by-status', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      let proposalsAll = [];
      
      // Filtrar propostas conforme o papel do usuário
      if (req.user.role === UserRole.AGENT) {
        // Agentes só veem suas próprias propostas
        proposalsAll = await storage.getProposalsByCreator(req.user.id);
      } else if (req.user.role === UserRole.MANAGER) {
        // Gestores veem propostas de sua organização
        proposalsAll = await storage.getProposalsByOrganization(req.user.organizationId || 0);
      } else {
        // Superadmins veem todas as propostas
        proposalsAll = await storage.getProposals();
      }
      
      // Filtrar por status
      const emNegociacao = proposalsAll.filter(p => p.status === 'em_negociacao');
      const aceitas = proposalsAll.filter(p => p.status === 'aceita');
      const emAnalise = proposalsAll.filter(p => p.status === 'em_analise');
      const recusadas = proposalsAll.filter(p => p.status === 'recusada');
      
      res.json({
        emNegociacao: emNegociacao.length,
        aceitas: aceitas.length,
        emAnalise: emAnalise.length,
        recusadas: recusadas.length
      });
    } catch (error) {
      console.error('Erro ao buscar propostas por status:', error);
      res.status(500).json({ message: 'Error fetching proposals by status' });
    }
  });

  app.get('/api/dashboard/recent-activity', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get proposals with details
      const allProposals = await storage.getProposalsWithDetails();
      
      let filteredProposals = [];
      
      // Filtrar propostas conforme o papel do usuário
      if (req.user && req.user.role === UserRole.AGENT) {
        // Agentes só veem suas próprias propostas
        filteredProposals = allProposals.filter(p => p.createdById === req.user?.id);
      } else if (req.user && req.user.role === UserRole.MANAGER) {
        // Gestores veem propostas de sua organização
        filteredProposals = allProposals.filter(p => p.organizationId === req.user?.organizationId);
      } else {
        // Superadmins veem todas as propostas
        filteredProposals = allProposals;
      }
      
      // Sort by createdAt (most recent first) and take up to 5
      const recentActivity = filteredProposals
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 5);
      
      res.json(recentActivity);
    } catch (error) {
      console.error('Erro ao buscar atividade recente:', error);
      res.status(500).json({ message: 'Error fetching recent activity' });
    }
  });

  app.get('/api/dashboard/operator-activity', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Verificar se o usuário tem permissão (superadmin ou gestor)
      if (req.user.role === UserRole.AGENT) {
        return res.status(403).json({ message: 'Permission denied. Requires manager or admin role.' });
      }
      
      // Obter dados necessários
      let users = [];
      let organizations = [];
      let clients = [];
      let proposals = [];
      
      if (req.user && req.user.role === UserRole.MANAGER) {
        // Gestores só veem dados de sua organização
        users = (await storage.getUsers()).filter(u => u.organizationId === req.user?.organizationId);
        
        const userOrg = req.user.organizationId || 0;
        const org = await storage.getOrganizationById(userOrg);
        organizations = org ? [org] : [];
        
        clients = await storage.getClientsByOrganization(userOrg);
        proposals = await storage.getProposalsByOrganization(userOrg);
      } else {
        // Superadmins veem todos os dados
        users = await storage.getUsers();
        organizations = await storage.getOrganizations();
        clients = await storage.getClients();
        proposals = await storage.getProposals();
      }
      
      // Mapear os dados para o formato esperado pelo frontend
      const operatorActivity = users.map(user => {
        // Contar clientes criados pelo usuário
        const userClients = clients.filter(client => client.createdById === user.id);
        
        // Contar propostas criadas pelo usuário
        const userProposals = proposals.filter(proposal => proposal.createdById === user.id);
        
        // Encontrar a organização do usuário
        const organization = organizations.find(org => org.id === user.organizationId);
        
        // Encontrar a data da última atividade (cliente ou proposta)
        const clientDates = userClients.map(c => c.createdAt ? new Date(c.createdAt).getTime() : 0);
        const proposalDates = userProposals.map(p => p.createdAt ? new Date(p.createdAt).getTime() : 0);
        const allDates = [...clientDates, ...proposalDates].filter(d => d > 0);
        
        const lastActivityTimestamp = allDates.length > 0 ? Math.max(...allDates) : null;
        const lastActivity = lastActivityTimestamp ? new Date(lastActivityTimestamp).toISOString() : null;
        
        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          sector: user.sector || "",
          organizationId: user.organizationId || 0,
          organizationName: organization ? organization.name : "Sem organização",
          clientsCount: userClients.length,
          proposalsCount: userProposals.length,
          lastActivity
        };
      });
      
      res.json(operatorActivity);
    } catch (error) {
      console.error("Erro ao obter atividade dos operadores:", error);
      res.status(500).json({ message: "Erro ao obter atividade dos operadores" });
    }
  });

  // =================
  // Organization endpoints
  // =================

  // Listar todas as organizações
  app.get('/api/organizations', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      let organizations: any[] = [];
      
      // Filtrar organizações com base no papel do usuário
      if (req.user.role === UserRole.AGENT || req.user.role === UserRole.MANAGER) {
        // Agentes e gestores só veem sua própria organização
        if (req.user.organizationId) {
          const org = await storage.getOrganizationById(req.user.organizationId);
          if (org) {
            organizations = [org];
          }
        }
      } else {
        // Superadmins veem todas as organizações
        organizations = await storage.getOrganizations();
      }
      
      res.json(organizations);
    } catch (error) {
      console.error('Erro ao buscar organizações:', error);
      res.status(500).json({ message: 'Erro ao buscar organizações' });
    }
  });

  // Obter uma organização específica
  app.get('/api/organizations/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar se o usuário tem permissão para visualizar esta organização
      if (req.user.role !== UserRole.SUPERADMIN && req.user.organizationId !== id) {
        return res.status(403).json({ message: 'You do not have permission to view this organization' });
      }
      
      const organization = await storage.getOrganizationById(id);
      
      if (!organization) {
        return res.status(404).json({ message: 'Organização não encontrada' });
      }
      
      res.json(organization);
    } catch (error) {
      console.error('Erro ao buscar organização:', error);
      res.status(500).json({ message: 'Erro ao buscar organização' });
    }
  });

  // Criar uma nova organização - apenas superadmin
  app.post('/api/organizations', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Apenas superadmins podem criar novas organizações
      if (req.user.role !== UserRole.SUPERADMIN) {
        return res.status(403).json({ message: 'Only superadmins can create organizations' });
      }
      
      const organizationData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(organizationData);
      res.status(201).json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Erro ao criar organização:', error);
      res.status(500).json({ message: 'Erro ao criar organização' });
    }
  });

  // Atualizar uma organização existente
  app.patch('/api/organizations/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar permissões com base no papel do usuário
      if (req.user.role === UserRole.AGENT) {
        return res.status(403).json({ message: 'You do not have permission to update organizations' });
      }
      
      if (req.user.role === UserRole.MANAGER && req.user.organizationId !== id) {
        return res.status(403).json({ message: 'You can only update your own organization' });
      }
      
      const organizationData = insertOrganizationSchema.partial().parse(req.body);
      const updatedOrganization = await storage.updateOrganization(id, organizationData);
      
      if (!updatedOrganization) {
        return res.status(404).json({ message: 'Organização não encontrada' });
      }
      
      res.json(updatedOrganization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Erro ao atualizar organização:', error);
      res.status(500).json({ message: 'Erro ao atualizar organização' });
    }
  });

  // Excluir uma organização - apenas superadmin
  app.delete('/api/organizations/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Apenas superadmins podem excluir organizações
      if (req.user.role !== UserRole.SUPERADMIN) {
        return res.status(403).json({ message: 'Only superadmins can delete organizations' });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOrganization(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Organização não encontrada' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir organização:', error);
      res.status(500).json({ message: 'Erro ao excluir organização' });
    }
  });

  // =================
  // User endpoints
  // =================
  
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Filtrar usuários com base no papel do usuário logado
      let users: any[] = [];
      
      if (req.user.role === UserRole.AGENT) {
        // Agentes só veem seu próprio usuário
        const user = await storage.getUserById(req.user.id);
        if (user) {
          users = [user];
        }
      } else if (req.user.role === UserRole.MANAGER) {
        // Gestores veem usuários de sua organização
        if (req.user.organizationId) {
          users = await storage.getUsersInOrganization(req.user.organizationId);
        }
      } else {
        // Superadmins veem todos os usuários
        users = await storage.getUsers();
      }
      
      res.json(users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ message: 'Error fetching users' });
    }
  });

  app.get('/api/users/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar se o usuário tem permissão para visualizar este usuário
      if (req.user.role === UserRole.AGENT && req.user.id !== id) {
        return res.status(403).json({ message: 'You do not have permission to view this user' });
      }
      
      if (req.user.role === UserRole.MANAGER) {
        const targetUser = await storage.getUserById(id);
        if (!targetUser || targetUser.organizationId !== req.user.organizationId) {
          return res.status(403).json({ message: 'You do not have permission to view users from other organizations' });
        }
      }
      
      const user = await storage.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ message: 'Error fetching user' });
    }
  });

  app.post('/api/users', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Verificar permissões com base no papel do usuário
      if (req.user.role === UserRole.AGENT) {
        return res.status(403).json({ message: 'You do not have permission to create users' });
      }
      
      let organizationId = req.body.organizationId || req.user.organizationId || 1;
      
      // Gestores só podem criar usuários para sua própria organização
      if (req.user.role === UserRole.MANAGER && organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: 'You can only create users for your own organization' });
      }
      
      // Apenas superadmins podem criar outros superadmins
      if (req.body.role === UserRole.SUPERADMIN && req.user.role !== UserRole.SUPERADMIN) {
        return res.status(403).json({ message: 'Only superadmins can create superadmin users' });
      }
      
      // Adicionar organização
      const data = { 
        ...req.body,
        organizationId
      };
      
      // Validar os dados do usuário incluindo a senha
      const userData = registerUserSchema.parse(data);
      const user = await storage.createUser(userData);
      
      // Retornar o usuário criado sem a senha
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: 'Error creating user' });
    }
  });

  app.patch('/api/users/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verifica o usuário que será atualizado
      const targetUser = await storage.getUserById(id);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verificar permissões
      if (req.user.role === UserRole.AGENT && req.user.id !== id) {
        return res.status(403).json({ message: 'You can only update your own account' });
      }
      
      if (req.user.role === UserRole.MANAGER) {
        // Gestores não podem alterar usuários de outras organizações
        if (targetUser.organizationId !== req.user.organizationId) {
          return res.status(403).json({ message: 'You cannot update users from other organizations' });
        }
        
        // Gestores não podem alterar o papel para superadmin
        if (req.body.role === UserRole.SUPERADMIN) {
          return res.status(403).json({ message: 'Only superadmins can promote users to superadmin' });
        }
        
        // Gestores não podem alterar a organização para outra
        if (req.body.organizationId && req.body.organizationId !== req.user.organizationId) {
          return res.status(403).json({ message: 'You cannot move users to another organization' });
        }
      }
      
      // Agentes só podem alterar informações básicas, não o papel ou organização
      if (req.user.role === UserRole.AGENT) {
        const allowedFields = ['name', 'email', 'phone', 'sector'];
        const disallowedFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
        
        if (disallowedFields.length > 0) {
          return res.status(403).json({ 
            message: `You do not have permission to update these fields: ${disallowedFields.join(', ')}` 
          });
        }
      }
      
      // Validar os dados parciais do usuário
      const userData = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(id, userData);
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: 'Error updating user' });
    }
  });

  app.delete('/api/users/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar o usuário a ser excluído
      const targetUser = await storage.getUserById(id);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verificar permissões
      if (req.user.role === UserRole.AGENT) {
        return res.status(403).json({ message: 'Agents cannot delete user accounts' });
      }
      
      if (req.user.role === UserRole.MANAGER) {
        // Gestores não podem excluir usuários de outras organizações
        if (targetUser.organizationId !== req.user.organizationId) {
          return res.status(403).json({ message: 'You cannot delete users from other organizations' });
        }
        
        // Gestores não podem excluir outros gestores ou superadmins
        if (targetUser.role === UserRole.MANAGER || targetUser.role === UserRole.SUPERADMIN) {
          return res.status(403).json({ message: 'You cannot delete managers or superadmins' });
        }
      }
      
      // Um usuário não pode excluir a si mesmo
      if (req.user.id === id) {
        return res.status(403).json({ message: 'You cannot delete your own account' });
      }
      
      const deleted = await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      res.status(500).json({ message: 'Error deleting user' });
    }
  });

  // Rota para redefinir a senha de um usuário
  app.post('/api/users/:id/reset-password', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verifica o usuário alvo
      const targetUser = await storage.getUserById(id);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verificar permissões
      if (req.user.role === UserRole.AGENT && req.user.id !== id) {
        return res.status(403).json({ message: 'You can only reset your own password' });
      }
      
      if (req.user.role === UserRole.MANAGER && targetUser.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: 'You cannot reset passwords for users from other organizations' });
      }
      
      const success = await storage.resetPassword(targetUser.email);
      
      if (success) {
        res.json({ message: 'Password reset email sent' });
      } else {
        res.status(500).json({ message: 'Failed to reset password' });
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      res.status(500).json({ message: 'Error resetting password' });
    }
  });
  
  // Rota de login
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const authData = await storage.loginUser(email, password);
      
      if (!authData) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      res.json(authData);
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ message: 'Error during login' });
    }
  });

  // =================
  // Form Template endpoints
  // =================
  
  app.get('/api/form-templates', requireAuth, async (req, res) => {
    try {
      let templates = [];
      
      // Aplicar controle de acesso baseado no papel do usuário
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      if (req.user.role === UserRole.AGENT || req.user.role === UserRole.MANAGER) {
        // Agentes e gestores veem apenas templates de sua organização
        templates = await storage.getFormTemplatesByOrganization(req.user.organizationId || 0);
      } else {
        // Superadmins veem todos os templates
        templates = await storage.getFormTemplates();
      }
      
      res.json(templates);
    } catch (error) {
      console.error('Erro ao buscar templates de formulário:', error);
      res.status(500).json({ message: 'Error fetching form templates' });
    }
  });
  
  app.get('/api/form-templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getFormTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Para formulários públicos, não precisamos verificar autenticação
      // Apenas verificamos se o formulário está ativo
      if (!template.active && req.headers.authorization) {
        // Se o formulário não está ativo e é uma requisição autenticada
        // Verificar se o usuário tem permissão para ver o formulário
        if (!req.user) {
          return res.status(401).json({ message: 'Authentication required' });
        }
        
        if (req.user.role !== UserRole.SUPERADMIN && 
            template.organizationId !== req.user.organizationId) {
          return res.status(403).json({ message: 'You do not have permission to view this form template' });
        }
      } else if (!template.active) {
        // Se o formulário não estiver ativo e for uma requisição não autenticada
        return res.status(404).json({ message: 'Form template not found or inactive' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Erro ao buscar template de formulário:', error);
      res.status(500).json({ message: 'Error fetching form template' });
    }
  });
  
  app.post('/api/form-templates', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Adicionar organizationId do usuário autenticado
      const data = {
        ...req.body,
        organizationId: req.body.organizationId || req.user.organizationId || 1,
        createdById: req.user.id
      };
      
      const templateData = insertFormTemplateSchema.parse(data);
      const template = await storage.createFormTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid form template data', errors: error.errors });
      }
      console.error('Erro ao criar template de formulário:', error);
      res.status(500).json({ message: 'Error creating form template' });
    }
  });
  
  app.patch('/api/form-templates/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar se o template existe
      const template = await storage.getFormTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Verificar permissões baseadas no papel do usuário
      if (req.user.role !== UserRole.SUPERADMIN && 
          template.organizationId !== req.user.organizationId) {
        return res.status(403).json({ 
          message: 'You do not have permission to update this form template' 
        });
      }
      
      const templateData = insertFormTemplateSchema.partial().parse(req.body);
      const updatedTemplate = await storage.updateFormTemplate(id, templateData);
      
      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid form template data', errors: error.errors });
      }
      console.error('Erro ao atualizar template de formulário:', error);
      res.status(500).json({ message: 'Error updating form template' });
    }
  });
  
  app.delete('/api/form-templates/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar se o template existe
      const template = await storage.getFormTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Verificar permissões baseadas no papel do usuário
      if (req.user.role !== UserRole.SUPERADMIN && 
          template.organizationId !== req.user.organizationId) {
        return res.status(403).json({ 
          message: 'You do not have permission to delete this form template' 
        });
      }
      
      await storage.deleteFormTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir template de formulário:', error);
      res.status(500).json({ message: 'Error deleting form template' });
    }
  });
  
  // =================
  // Form Submission endpoints
  // =================
  
  app.get('/api/form-submissions', requireAuth, async (req, res) => {
    try {
      let submissions = [];
      
      // Aplicar controle de acesso baseado no papel do usuário
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      if (req.user.role === UserRole.AGENT || req.user.role === UserRole.MANAGER) {
        // Agentes e gestores veem apenas submissões de sua organização
        submissions = await storage.getFormSubmissionsByOrganization(req.user.organizationId || 0);
      } else {
        // Superadmins veem todas as submissões
        submissions = await storage.getFormSubmissions();
      }
      
      res.json(submissions);
    } catch (error) {
      console.error('Erro ao buscar submissões de formulário:', error);
      res.status(500).json({ message: 'Error fetching form submissions' });
    }
  });
  
  app.get('/api/form-submissions/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      const submission = await storage.getFormSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: 'Form submission not found' });
      }
      
      // Verificar permissões
      // Primeiro, obter o template para verificar a organização
      const template = await storage.getFormTemplate(submission.formTemplateId || 0);
      
      if (!template) {
        return res.status(404).json({ message: 'Associated form template not found' });
      }
      
      // Verificar se o usuário tem permissão para ver a submissão
      if (req.user.role !== UserRole.SUPERADMIN && 
          template.organizationId !== req.user.organizationId) {
        return res.status(403).json({ 
          message: 'You do not have permission to view this form submission' 
        });
      }
      
      res.json(submission);
    } catch (error) {
      console.error('Erro ao buscar submissão de formulário:', error);
      res.status(500).json({ message: 'Error fetching form submission' });
    }
  });
  
  // Esta rota não requer autenticação para permitir a submissão pública de formulários
  app.post('/api/form-submissions', async (req, res) => {
    try {
      const submissionData = req.body;
      
      // Validar se o formTemplateId é válido
      if (!submissionData.formTemplateId) {
        return res.status(400).json({ message: 'Form template ID is required' });
      }
      
      // Verificar se o template existe e está ativo
      const template = await storage.getFormTemplate(submissionData.formTemplateId);
      
      if (!template) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      if (!template.active) {
        return res.status(400).json({ message: 'This form is no longer accepting submissions' });
      }
      
      // Criar a submissão com o ID da organização do template
      const data = {
        ...submissionData,
        organizationId: template.organizationId
      };
      
      const validData = insertFormSubmissionSchema.parse(data);
      const submission = await storage.createFormSubmission(validData);
      
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid form submission data', errors: error.errors });
      }
      console.error('Erro ao criar submissão de formulário:', error);
      res.status(500).json({ message: 'Error creating form submission' });
    }
  });
  
  // Rota para processar uma submissão (criar cliente a partir dela)
  app.post('/api/form-submissions/:id/process', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const id = parseInt(req.params.id);
      
      // Verificar se a submissão existe
      const submission = await storage.getFormSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: 'Form submission not found' });
      }
      
      // Verificar se a submissão já foi processada
      if (submission.status === 'processado') {
        return res.status(400).json({ message: 'This submission has already been processed' });
      }
      
      // Verificar permissões com base no template associado
      const template = await storage.getFormTemplate(submission.formTemplateId || 0);
      
      if (!template) {
        return res.status(404).json({ message: 'Associated form template not found' });
      }
      
      if (req.user.role !== UserRole.SUPERADMIN && 
          template.organizationId !== req.user.organizationId) {
        return res.status(403).json({ 
          message: 'You do not have permission to process this form submission' 
        });
      }
      
      // Processar a submissão (criar cliente)
      const result = await storage.processFormSubmission(id, req.user.id);
      
      if (!result) {
        return res.status(500).json({ message: 'Failed to process submission' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao processar submissão de formulário:', error);
      res.status(500).json({ message: 'Error processing form submission' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
