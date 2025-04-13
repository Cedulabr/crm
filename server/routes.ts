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
import { checkSupabaseTables } from './routes/check-supabase-tables';
import { createClient } from '@supabase/supabase-js';

// Importar o cliente Supabase centralizado
import supabase, { isSupabaseConfigured } from './supabaseClient';

// Importar o storage configurado no arquivo storage.ts
// Este projeto usa DatabaseStorage para persistência dos dados no PostgreSQL
import { storage } from "./storage";
import { check_env } from "./check-env";
import { authMiddleware, requireAuth, checkRole } from "./middleware/auth";
import { openaiService } from "./services/openai-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Rota de status para verificar a configuração do Supabase
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'online',
      supabase: isSupabaseConfigured() ? 'configured' : 'not_configured',
      timestamp: new Date().toISOString()
    });
  });

  // Aplicar middleware de autenticação a todas as rotas, exceto /api/status
  app.use((req, res, next) => {
    if (req.path === '/api/status') {
      return next();
    }
    authMiddleware(req, res, next);
  });
  
  // Rotas de autenticação não exigem validação de token
  // Rota redirecionada para a implementação do Supabase Auth
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Usar autenticação do Supabase diretamente
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error || !data) {
        console.error('Erro na autenticação:', error);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Buscar o perfil do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations:organization_id(*)')
        .eq('id', data.user.id)
        .single();
        
      if (userError || !userData) {
        console.error('Erro ao buscar perfil do usuário:', userError);
        // Retornar apenas dados básicos se não encontrar o perfil
        return res.json({
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'agent',
            name: data.user.user_metadata?.name || data.user.email,
            sector: data.user.user_metadata?.sector || null,
            organizationId: data.user.user_metadata?.organization_id || 1
          }
        });
      }
      
      // Formatar dados para retorno
      const organization = userData.organizations || undefined;
      delete userData.organizations;
      
      res.json({
        token: data.session.access_token,
        user: {
          ...userData,
          organization
        }
      });
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
        createdById: req.user.id.toString()
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
  
  // Rotas de importação e exportação de clientes (acesso restrito a administradores e gestores)
  app.post('/api/clients/import', requireAuth, checkRole([UserRole.SUPERADMIN, UserRole.MANAGER]), async (req, res) => {
    try {
      const { clients } = req.body;
      
      if (!Array.isArray(clients) || clients.length === 0) {
        return res.status(400).json({ message: 'No clients to import' });
      }
      
      let imported = 0;
      let errors = [];
      
      // Processar cada cliente do arquivo CSV
      for (const clientData of clients) {
        try {
          // Converter IDs numéricos de string para number
          const parsedData: any = {
            ...clientData,
            convenioId: clientData.convenioId ? parseInt(clientData.convenioId, 10) : null,
            organizationId: req.user?.organizationId || 1,
            createdById: req.user?.id
          };
          
          // Validar dados do cliente
          const validClientData = insertClientSchema.parse(parsedData);
          
          // Verificar se já existe um cliente com o mesmo CPF
          let existingClient = null;
          if (validClientData.cpf) {
            const allClients = await storage.getClients();
            existingClient = allClients.find(client => client.cpf === validClientData.cpf);
          }
          
          if (existingClient) {
            // Atualizar cliente existente
            await storage.updateClient(existingClient.id, validClientData);
          } else {
            // Criar novo cliente
            await storage.createClient(validClientData);
          }
          
          imported++;
        } catch (error) {
          console.error('Erro ao importar cliente:', error);
          errors.push({
            client: clientData,
            error: error instanceof z.ZodError ? error.errors : (error instanceof Error ? error.message : String(error))
          });
        }
      }
      
      res.status(200).json({
        message: `Imported ${imported} clients with ${errors.length} errors`,
        imported,
        errors: errors.length > 0 ? errors : null
      });
    } catch (error) {
      console.error('Erro na importação de clientes:', error);
      res.status(500).json({ message: 'Error importing clients' });
    }
  });
  
  app.get('/api/clients/export', requireAuth, checkRole([UserRole.SUPERADMIN, UserRole.MANAGER]), async (req, res) => {
    try {
      let clients = [];
      
      // Filtrar por organização se for um gestor
      if (req.user?.role === UserRole.MANAGER) {
        clients = await storage.getClientsByOrganization(req.user.organizationId || 0);
      } else {
        // Administradores veem todos os clientes
        clients = await storage.getClients();
      }
      
      // Mapear apenas os campos necessários para o CSV
      const exportClients = clients.map(client => ({
        nome: client.name,
        email: client.email,
        telefone: client.phone,
        cpf: client.cpf,
        observacoes: "", // Não há campo de observações no schema
        convenioId: client.convenioId,
        dataNascimento: client.birthDate,
        contato: client.contact,
        empresa: client.company
      }));
      
      res.status(200).json({ clients: exportClients });
    } catch (error) {
      console.error('Erro na exportação de clientes:', error);
      res.status(500).json({ message: 'Error exporting clients' });
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
  
  // Rota para testar a conexão com o Supabase usando a chave service_role
  app.get('/server/api/test-supabase-admin', async (req, res) => {
    try {
      console.log('=== TESTE ADMIN SUPABASE ===');
      console.log('Verificando conexão com chave service_role...');
      
      // Usar o cliente Supabase já configurado com a chave service_role
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(5);
        
      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
        return res.status(500).json({ 
          message: 'Erro ao acessar tabela users com chave service_role', 
          error: usersError 
        });
      }
      
      console.log(`Encontrados ${users?.length || 0} usuários`);
      
      return res.json({
        success: true,
        message: 'Teste de acesso administrativo ao Supabase bem-sucedido',
        users_count: users?.length || 0
      });
    } catch (error) {
      console.error('Erro no teste administrativo:', error);
      return res.status(500).json({ 
        message: 'Erro no teste administrativo', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Rota temporária para testar o Supabase (sem autenticação)
  app.use('/api/test-supabase-client', (req, res, next) => {
    // Desativar middleware de autenticação para esta rota específica
    req.user = { id: "1", role: UserRole.SUPERADMIN, organizationId: 1 } as any;
    next();
  });
  
  app.use('/api/test-supabase-proposal', (req, res, next) => {
    // Desativar middleware de autenticação para esta rota específica
    req.user = { id: "1", role: UserRole.SUPERADMIN, organizationId: 1 } as any;
    next();
  });
  
  app.get('/api/test-supabase-proposal', async (req, res) => {
    try {
      console.log('=== TESTE DE PROPOSTA SUPABASE ===');
      console.log('Tentando criar uma proposta de teste...');
      
      // Criar um cliente primeiro para associar à proposta
      const testClient = {
        name: "Cliente Teste Proposta",
        email: "cliente.proposta@example.com",
        phone: "(71) 91234-5678",
        cpf: "111.222.333-44",
        createdById: "4fd63751-d7f7-47b0-a002-dc2ad8b32e70", // UUID válido
        organizationId: 1
      };
      
      console.log('Criando cliente para teste de proposta:', testClient);
      const client = await storage.createClient(testClient);
      
      // Dados da proposta de teste
      // Removido o campo installmentValue pois ele não existe no esquema do banco
      const testProposal = {
        clientId: client.id,
        productId: 1, // Assumindo que existe um produto com ID 1
        value: "10000",
        installments: 20,
        status: "em_negociacao",
        createdById: "4fd63751-d7f7-47b0-a002-dc2ad8b32e70", // UUID válido
        organizationId: 1
      };
      
      console.log('Criando proposta de teste:', testProposal);
      const proposal = await storage.createProposal(testProposal);
      
      console.log('Proposta criada, agora atualizando...');
      // Atualizar a proposta
      // Removido o campo installmentValue pois ele não existe no esquema do banco
      const updateData = {
        value: "12000",
        status: "aceita"
      };
      
      const updatedProposal = await storage.updateProposal(proposal.id, updateData);
      
      res.json({
        message: "Operações de proposta concluídas com sucesso",
        client,
        originalProposal: proposal,
        updatedProposal
      });
    } catch (error) {
      console.error('Erro no teste de proposta:', error);
      res.status(500).json({ 
        message: 'Erro ao testar operações de proposta', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get('/api/test-supabase-client', async (req, res) => {
    try {
      console.log('=== TESTE DE CLIENTE SUPABASE ===');
      console.log('Tentando criar e atualizar um cliente de teste...');
      
      // 1. Criar um cliente para teste
      const testClient = {
        name: 'Cliente Teste Completo',
        email: 'cliente.teste@example.com',
        phone: '(71) 98765-4321',
        cpf: '987.654.321-00',
        createdById: '4fd63751-d7f7-47b0-a002-dc2ad8b32e70', // ID de um usuário Supabase válido
        organizationId: 1
      };
      
      console.log('Criando cliente para teste:', testClient);
      const client = await storage.createClient(testClient);
      
      // 2. Atualizar o cliente
      console.log('Cliente criado, agora atualizando...');
      const updatedClient = await storage.updateClient(client.id, { 
        name: 'Cliente Teste Atualizado',
        phone: '(71) 99999-8888',
        company: 'Empresa Teste'
      });
      
      // 3. Buscar o cliente pelo ID
      console.log('Cliente atualizado, agora buscando pelo ID...');
      const fetchedClient = await storage.getClient(client.id);
      
      res.json({
        message: 'Operações de cliente concluídas com sucesso',
        originalClient: client,
        updatedClient,
        fetchedClient
      });
    } catch (error) {
      console.error('Erro no teste do Supabase:', error);
      res.status(500).json({ 
        message: 'Erro ao testar o Supabase', 
        error: error instanceof Error ? error.message : String(error)
      });
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
      const err = error as Error;
      console.error('Erro ao buscar propostas:', err);
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
      if (req.user.role === UserRole.AGENT && req.user.id.toString() !== id.toString()) {
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
      if (req.user.role === UserRole.AGENT && req.user.id.toString() !== id.toString()) {
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
      if (req.user.id.toString() === id.toString()) {
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
      if (req.user.role === UserRole.AGENT && req.user.id.toString() !== id.toString()) {
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
  
  // Rota de login - redireciona para a rota de autenticação do Supabase
  app.post('/api/login', async (req, res) => {
    try {
      // Redirecionar para a implementação em /api/auth/login
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Usar autenticação do Supabase diretamente
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error || !data) {
        console.error('Erro na autenticação:', error);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Buscar o perfil do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations:organization_id(*)')
        .eq('id', data.user.id)
        .single();
        
      if (userError || !userData) {
        console.error('Erro ao buscar perfil do usuário:', userError);
        // Retornar apenas dados básicos se não encontrar o perfil
        return res.json({
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'agent',
            name: data.user.user_metadata?.name || data.user.email,
            sector: data.user.user_metadata?.sector || null,
            organizationId: data.user.user_metadata?.organization_id || 1
          }
        });
      }
      
      // Formatar dados para retorno
      const organization = userData.organizations || undefined;
      delete userData.organizations;
      
      res.json({
        token: data.session.access_token,
        user: {
          ...userData,
          organization
        }
      });
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

  // =================
  // Smart Search endpoints
  // =================
  
  // Endpoint para processar consultas em linguagem natural
  app.post('/api/search', requireAuth, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Query parameter is required' });
      }
      
      // Processar a consulta usando OpenAI
      const queryStructure = await openaiService.processNaturalLanguageQuery(query);
      
      // Buscar dados baseados na estrutura da consulta
      let results = [];
      
      // Determinar qual entidade buscar com base na consulta processada
      switch (queryStructure.entidade) {
        case 'cliente':
          let clients = [];
          
          // Aplicar controle de acesso baseado no papel do usuário
          if (req.user?.role === UserRole.AGENT) {
            clients = await storage.getClientsByCreator(req.user.id);
          } else if (req.user?.role === UserRole.MANAGER) {
            clients = await storage.getClientsByOrganization(req.user?.organizationId || 0);
          } else {
            clients = await storage.getClients();
          }
          
          // Aplicar filtros
          if (queryStructure.filtros) {
            const { nome, email, cpf, telefone, dataInicio, dataFim } = queryStructure.filtros;
            
            if (nome) {
              clients = clients.filter(c => c.name && c.name.toLowerCase().includes(nome.toLowerCase()));
            }
            
            if (email) {
              clients = clients.filter(c => c.email && c.email.toLowerCase().includes(email.toLowerCase()));
            }
            
            if (cpf) {
              clients = clients.filter(c => c.cpf && c.cpf.includes(cpf));
            }
            
            if (telefone) {
              clients = clients.filter(c => c.phone && c.phone.includes(telefone));
            }
            
            // Filtros de data podem ser implementados aqui
          }
          
          // Ordenar resultados com ajuda da OpenAI para classificação de relevância
          results = await openaiService.rankResultsBySimilarity(query, clients);
          break;
          
        case 'proposta':
          let proposals = [];
          
          // Aplicar controle de acesso baseado no papel do usuário
          if (req.user?.role === UserRole.AGENT) {
            proposals = await storage.getProposalsByCreator(req.user.id);
          } else if (req.user?.role === UserRole.MANAGER) {
            proposals = await storage.getProposalsByOrganization(req.user?.organizationId || 0);
          } else {
            proposals = await storage.getProposals();
          }
          
          // Aplicar filtros
          if (queryStructure.filtros) {
            const { status, produto, valorMin, valorMax } = queryStructure.filtros;
            
            if (status) {
              proposals = proposals.filter(p => p.status && p.status.toLowerCase().includes(status.toLowerCase()));
            }
            
            if (valorMin) {
              const min = Number(valorMin);
              const max = valorMax ? Number(valorMax) : Infinity;
              proposals = proposals.filter(p => {
                const value = Number(p.value) || 0;
                return value >= min && value <= max;
              });
            }
            
            if (produto) {
              // Buscar produto pelo nome
              const products = await storage.getProducts();
              const matchingProduct = products.find(p => 
                p.name && p.name.toLowerCase().includes(produto.toLowerCase())
              );
              
              if (matchingProduct) {
                proposals = proposals.filter(p => p.productId === matchingProduct.id);
              }
            }
          }
          
          // Buscar detalhes completos para as propostas filtradas
          const proposalsWithDetails = await Promise.all(
            proposals.map(async (p) => {
              const client = p.clientId ? await storage.getClient(p.clientId) : null;
              const product = p.productId ? await storage.getProduct(p.productId) : null;
              
              return { 
                ...p, 
                client, 
                product,
              };
            })
          );
          
          // Ordenar resultados com ajuda da OpenAI para classificação de relevância
          results = await openaiService.rankResultsBySimilarity(query, proposalsWithDetails);
          break;
          
        case 'produto':
          const products = await storage.getProducts();
          
          // Aplicar filtros se necessário
          results = await openaiService.rankResultsBySimilarity(query, products);
          break;
          
        default:
          // Busca geral (combina resultados de várias entidades)
          const allClients = await storage.getClients();
          const allProposals = await storage.getProposalsWithDetails();
          
          const combinedResults = [
            ...allClients.slice(0, 10), // Limitar quantidade para evitar contextos muito grandes
            ...allProposals.slice(0, 10)
          ];
          
          results = await openaiService.rankResultsBySimilarity(query, combinedResults);
      }
      
      res.json({
        query,
        processedQuery: queryStructure,
        results: results.slice(0, 20) // Limitar a 20 resultados
      });
    } catch (error) {
      console.error('Erro no processamento da busca inteligente:', error);
      res.status(500).json({ message: 'Error processing smart search' });
    }
  });
  
  // Endpoint para gerar sugestões de autocompletar
  app.post('/api/search/autocomplete', requireAuth, async (req, res) => {
    try {
      const { input } = req.body;
      
      if (!input || typeof input !== 'string') {
        return res.status(400).json({ message: 'Input parameter is required' });
      }
      
      // Obter alguns clientes para contextualização
      let clients = [];
      
      // Aplicar controle de acesso baseado no papel do usuário
      if (req.user?.role === UserRole.AGENT) {
        clients = await storage.getClientsByCreator(req.user.id);
      } else if (req.user?.role === UserRole.MANAGER) {
        clients = await storage.getClientsByOrganization(req.user?.organizationId || 0);
      } else {
        clients = await storage.getClients();
      }
      
      // Gerar sugestões de autocompletar
      const suggestions = await openaiService.generateAutocompleteOptions(input, clients);
      
      res.json({ suggestions });
    } catch (error) {
      console.error('Erro ao gerar sugestões de autocompletar:', error);
      res.status(500).json({ message: 'Error generating autocomplete suggestions' });
    }
  });

  // =================
  // Supabase Setup Check
  // =================
  
  // Rota para verificar o status das tabelas no Supabase
  app.get('/api/check-supabase-tables', requireAuth, checkRole([UserRole.SUPERADMIN]), async (req, res) => {
    await checkSupabaseTables(req, res);
  });

  const httpServer = createServer(app);
  return httpServer;
}
