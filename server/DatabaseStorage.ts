import { IStorage } from './storage';
import { db } from './db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  users,
  clients,
  products,
  convenios,
  banks,
  proposals,
  kanban,
  organizations,
  // Tipos
  Client,
  Product,
  Convenio,
  Bank,
  Proposal,
  Kanban,
  User,
  Organization,
  InsertClient,
  InsertProduct,
  InsertConvenio,
  InsertBank,
  InsertProposal,
  InsertKanban,
  InsertUser,
  InsertOrganization,
  RegisterUser,
  ClientWithKanban,
  ProposalWithDetails,
  AuthData
} from '@shared/schema';
import { randomBytes, scryptSync } from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Implementação do IStorage usando Drizzle ORM com PostgreSQL
 * Esta classe substitui o MemStorage para usar uma base de dados persistente
 */
export class DatabaseStorage implements IStorage {
  constructor() {
    console.log('📦 Inicializando DatabaseStorage com PostgreSQL e Drizzle');
    this.initializeDefaultData();
  }
  
  /**
   * Inicializa dados padrão no banco de dados se não existirem
   */
  private async initializeDefaultData() {
    try {
      // Verificar se já existem dados
      const existingProducts = await this.getProducts();
      const existingConvenios = await this.getConvenios();
      const existingBanks = await this.getBanks();
      const existingOrganizations = await this.getOrganizations();
      
      // Inicializar produtos se não existirem
      if (existingProducts.length === 0) {
        console.log('Inicializando produtos padrão...');
        const defaultProducts = [
          { name: 'Novo empréstimo', price: 'R$ 0,00' },
          { name: 'Refinanciamento', price: 'R$ 0,00' },
          { name: 'Portabilidade', price: 'R$ 0,00' },
          { name: 'Cartão de Crédito', price: 'R$ 0,00' },
          { name: 'Saque FGTS', price: 'R$ 0,00' }
        ];
        
        for (const product of defaultProducts) {
          await this.createProduct(product);
        }
      }
      
      // Inicializar convênios se não existirem
      if (existingConvenios.length === 0) {
        console.log('Inicializando convênios padrão...');
        const defaultConvenios = [
          { name: 'Beneficiário do INSS', price: 'R$ 0,00' },
          { name: 'Servidor Público', price: 'R$ 0,00' },
          { name: 'LOAS/BPC', price: 'R$ 0,00' },
          { name: 'Carteira assinada CLT', price: 'R$ 0,00' }
        ];
        
        for (const convenio of defaultConvenios) {
          await this.createConvenio(convenio);
        }
      }
      
      // Inicializar bancos se não existirem
      if (existingBanks.length === 0) {
        console.log('Inicializando bancos padrão...');
        const defaultBanks = [
          { name: 'BANRISUL', price: 'R$ 0,00' },
          { name: 'BMG', price: 'R$ 0,00' },
          { name: 'C6 BANK', price: 'R$ 0,00' },
          { name: 'CAIXA ECONÔMICA FEDERAL', price: 'R$ 0,00' },
          { name: 'CETELEM', price: 'R$ 0,00' },
          { name: 'DAYCOVAL', price: 'R$ 0,00' },
          { name: 'FACTA', price: 'R$ 0,00' },
          { name: 'ITAÚ', price: 'R$ 0,00' },
          { name: 'MERCANTIL', price: 'R$ 0,00' },
          { name: 'OLÉ CONSIGNADO', price: 'R$ 0,00' },
          { name: 'PAN', price: 'R$ 0,00' },
          { name: 'SAFRA', price: 'R$ 0,00' },
          { name: 'BRADESCO', price: 'R$ 0,00' },
          { name: 'BANCO DO BRASIL', price: 'R$ 0,00' },
          { name: 'SANTANDER', price: 'R$ 0,00' },
          { name: 'ORIGINAL', price: 'R$ 0,00' },
          { name: 'INTER', price: 'R$ 0,00' },
          { name: 'BRB', price: 'R$ 0,00' },
          { name: 'CCB', price: 'R$ 0,00' },
          { name: 'BONSUCESSO', price: 'R$ 0,00' },
          { name: 'BCV', price: 'R$ 0,00' },
          { name: 'BANCORBRAS', price: 'R$ 0,00' },
          { name: 'BANESTES', price: 'R$ 0,00' },
          { name: 'BANCO ALPHA', price: 'R$ 0,00' },
          { name: 'SAFRA FINANCEIRA', price: 'R$ 0,00' },
          { name: 'BANCO MASTER', price: 'R$ 0,00' },
          { name: 'BANCOOB', price: 'R$ 0,00' },
          { name: 'PARANÁ BANCO', price: 'R$ 0,00' },
          { name: 'BANCO DA AMAZÔNIA', price: 'R$ 0,00' },
          { name: 'BNB', price: 'R$ 0,00' },
          { name: 'BANPARÁ', price: 'R$ 0,00' },
          { name: 'BANESE', price: 'R$ 0,00' },
          { name: 'MIDWAY', price: 'R$ 0,00' },
          { name: 'AGIBANK', price: 'R$ 0,00' },
          { name: 'BANSICREDI', price: 'R$ 0,00' },
          { name: 'SICOOB', price: 'R$ 0,00' }
        ];
        
        for (const bank of defaultBanks) {
          await this.createBank(bank);
        }
      }
      
      // Inicializar organização padrão se não existir
      if (existingOrganizations.length === 0) {
        console.log('Inicializando organização padrão...');
        const defaultOrganization = {
          name: 'Empresa Padrão',
          createdAt: new Date()
        };
        
        await this.createOrganization(defaultOrganization);
        
        // Criar usuário admin padrão
        const defaultAdmin = {
          name: 'Administrador',
          email: 'admin@empresa.com',
          password: 'senha123',
          role: 'superadmin',
          organizationId: 1
        };
        
        await this.createUser(defaultAdmin);
      }
      
      console.log('Inicialização de dados padrão concluída!');
    } catch (error) {
      console.error('Erro ao inicializar dados padrão:', error);
    }
  }

  // Métodos para Cliente
  async getClients(): Promise<Client[]> {
    try {
      console.log('DB: Buscando todos os clientes');
      return await db.select().from(clients);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return [];
    }
  }

  async getClient(id: number): Promise<Client | undefined> {
    try {
      console.log(`DB: Buscando cliente com ID ${id}`);
      const result = await db.select().from(clients).where(eq(clients.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar cliente com ID ${id}:`, error);
      return undefined;
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      console.log('DB: Criando novo cliente', client);
      const [newClient] = await db.insert(clients).values(client).returning();
      
      // Criar entrada no kanban automaticamente
      const kanbanEntry: InsertKanban = {
        clientId: newClient.id,
        column: 'lead',
        position: await this.getNextPositionForColumn('lead')
      };
      
      await this.createKanbanEntry(kanbanEntry);
      
      return newClient;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      console.log(`DB: Atualizando cliente com ID ${id}`, client);
      const [updatedClient] = await db
        .update(clients)
        .set(client)
        .where(eq(clients.id, id))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error(`Erro ao atualizar cliente com ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteClient(id: number): Promise<boolean> {
    try {
      console.log(`DB: Removendo cliente com ID ${id}`);
      
      // Remover entradas de kanban relacionadas
      await db.delete(kanban).where(eq(kanban.clientId, id));
      
      // Remover propostas relacionadas
      await db.delete(proposals).where(eq(proposals.clientId, id));
      
      // Remover o cliente
      const result = await db.delete(clients).where(eq(clients.id, id)).returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao remover cliente com ID ${id}:`, error);
      return false;
    }
  }

  async getClientsWithKanban(): Promise<ClientWithKanban[]> {
    try {
      console.log('DB: Buscando clientes com informações de kanban');
      
      // Primeiro obtém todos os clientes
      const allClients = await this.getClients();
      
      // Busca todas as entradas de kanban
      const allKanban = await this.getKanbanEntries();
      
      // Obtém contagens de propostas por cliente
      const proposalCountsQuery = db
        .select({
          clientId: proposals.clientId,
          count: sql<number>`count(*)`,
          totalValue: sql<string>`sum(cast(${proposals.value} as numeric))`
        })
        .from(proposals)
        .groupBy(proposals.clientId);
      
      const proposalCounts = await proposalCountsQuery;
      
      // Mapeia os clientes com suas entradas de kanban e contagens
      return allClients.map(client => {
        const kanbanEntry = allKanban.find(k => k.clientId === client.id);
        const countData = proposalCounts.find(p => p.clientId === client.id);
        
        return {
          ...client,
          kanban: kanbanEntry,
          proposalCount: countData?.count || 0,
          totalValue: countData?.totalValue || '0'
        };
      });
    } catch (error) {
      console.error('Erro ao buscar clientes com kanban:', error);
      return [];
    }
  }

  // Métodos para Produtos
  async getProducts(): Promise<Product[]> {
    try {
      console.log('DB: Buscando todos os produtos');
      return await db.select().from(products);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    try {
      console.log(`DB: Buscando produto com ID ${id}`);
      const result = await db.select().from(products).where(eq(products.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar produto com ID ${id}:`, error);
      return undefined;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      console.log('DB: Criando novo produto', product);
      const [newProduct] = await db.insert(products).values(product).returning();
      return newProduct;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  // Métodos para Convênios
  async getConvenios(): Promise<Convenio[]> {
    try {
      console.log('DB: Buscando todos os convênios');
      return await db.select().from(convenios);
    } catch (error) {
      console.error('Erro ao buscar convênios:', error);
      return [];
    }
  }

  async getConvenio(id: number): Promise<Convenio | undefined> {
    try {
      console.log(`DB: Buscando convênio com ID ${id}`);
      const result = await db.select().from(convenios).where(eq(convenios.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar convênio com ID ${id}:`, error);
      return undefined;
    }
  }

  async createConvenio(convenio: InsertConvenio): Promise<Convenio> {
    try {
      console.log('DB: Criando novo convênio', convenio);
      const [newConvenio] = await db.insert(convenios).values(convenio).returning();
      return newConvenio;
    } catch (error) {
      console.error('Erro ao criar convênio:', error);
      throw error;
    }
  }

  // Métodos para Bancos
  async getBanks(): Promise<Bank[]> {
    try {
      console.log('DB: Buscando todos os bancos');
      return await db.select().from(banks);
    } catch (error) {
      console.error('Erro ao buscar bancos:', error);
      return [];
    }
  }

  async getBank(id: number): Promise<Bank | undefined> {
    try {
      console.log(`DB: Buscando banco com ID ${id}`);
      const result = await db.select().from(banks).where(eq(banks.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar banco com ID ${id}:`, error);
      return undefined;
    }
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    try {
      console.log('DB: Criando novo banco', bank);
      const [newBank] = await db.insert(banks).values(bank).returning();
      return newBank;
    } catch (error) {
      console.error('Erro ao criar banco:', error);
      throw error;
    }
  }

  // Métodos para Propostas
  async getProposals(): Promise<Proposal[]> {
    try {
      console.log('DB: Buscando todas as propostas');
      return await db.select().from(proposals).orderBy(desc(proposals.createdAt));
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
      return [];
    }
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    try {
      console.log(`DB: Buscando proposta com ID ${id}`);
      const result = await db.select().from(proposals).where(eq(proposals.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar proposta com ID ${id}:`, error);
      return undefined;
    }
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    try {
      console.log('DB: Criando nova proposta', proposal);
      
      // Define o status padrão se não estiver definido
      const status = proposal.status || 'Nova proposta';
      
      const [newProposal] = await db
        .insert(proposals)
        .values({ ...proposal, status })
        .returning();
      
      // Atualiza o Kanban do cliente para "negociacao" se o cliente tiver uma entrada
      if (newProposal.clientId) {
        await this.updateClientKanbanColumn(newProposal.clientId, 'negociacao');
      }
      
      return newProposal;
    } catch (error) {
      console.error('Erro ao criar proposta:', error);
      throw error;
    }
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    try {
      console.log(`DB: Atualizando proposta com ID ${id}`, proposal);
      const [updatedProposal] = await db
        .update(proposals)
        .set(proposal)
        .where(eq(proposals.id, id))
        .returning();
        
      // Se o status da proposta foi alterado, atualiza o kanban do cliente
      if (proposal.status && updatedProposal.clientId) {
        let kanbanColumn = 'lead';
        
        if (proposal.status === 'Nova proposta') {
          kanbanColumn = 'lead';
        } else if (proposal.status === 'Em andamento') {
          kanbanColumn = 'qualificacao';
        } else if (proposal.status === 'em_negociacao') {
          kanbanColumn = 'negociacao';
        } else if (proposal.status === 'em_analise') {
          kanbanColumn = 'pendente';
        } else if (proposal.status === 'recusada') {
          kanbanColumn = 'recusada';
        } else if (proposal.status === 'aceita' || proposal.status === 'Finalizada') {
          kanbanColumn = 'finalizada';
        }
        
        await this.updateClientKanbanColumn(updatedProposal.clientId, kanbanColumn);
      }
      
      return updatedProposal;
    } catch (error) {
      console.error(`Erro ao atualizar proposta com ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteProposal(id: number): Promise<boolean> {
    try {
      console.log(`DB: Removendo proposta com ID ${id}`);
      const result = await db.delete(proposals).where(eq(proposals.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao remover proposta com ID ${id}:`, error);
      return false;
    }
  }

  async getProposalsByClient(clientId: number): Promise<Proposal[]> {
    try {
      console.log(`DB: Buscando propostas do cliente com ID ${clientId}`);
      return await db
        .select()
        .from(proposals)
        .where(eq(proposals.clientId, clientId))
        .orderBy(desc(proposals.createdAt));
    } catch (error) {
      console.error(`Erro ao buscar propostas do cliente com ID ${clientId}:`, error);
      return [];
    }
  }

  async getProposalsByProduct(productId: number): Promise<Proposal[]> {
    try {
      console.log(`DB: Buscando propostas do produto com ID ${productId}`);
      return await db
        .select()
        .from(proposals)
        .where(eq(proposals.productId, productId))
        .orderBy(desc(proposals.createdAt));
    } catch (error) {
      console.error(`Erro ao buscar propostas do produto com ID ${productId}:`, error);
      return [];
    }
  }

  async getProposalsByValue(minValue: number, maxValue?: number): Promise<Proposal[]> {
    try {
      console.log(`DB: Buscando propostas com valor entre ${minValue} e ${maxValue || 'ilimitado'}`);
      
      // Convertendo o valor da proposta para número para comparação
      const valueQuery = db
        .select()
        .from(proposals)
        .where(
          and(
            gte(sql`CAST(${proposals.value} AS numeric)`, minValue),
            maxValue ? lte(sql`CAST(${proposals.value} AS numeric)`, maxValue) : undefined
          )
        )
        .orderBy(desc(proposals.createdAt));
        
      return await valueQuery;
    } catch (error) {
      console.error(`Erro ao buscar propostas por valor:`, error);
      return [];
    }
  }

  async getProposalsByStatus(status: string): Promise<Proposal[]> {
    try {
      console.log(`DB: Buscando propostas com status ${status}`);
      return await db
        .select()
        .from(proposals)
        .where(eq(proposals.status, status))
        .orderBy(desc(proposals.createdAt));
    } catch (error) {
      console.error(`Erro ao buscar propostas com status ${status}:`, error);
      return [];
    }
  }

  async getProposalsWithDetails(): Promise<ProposalWithDetails[]> {
    try {
      console.log('DB: Buscando propostas com detalhes');
      
      // Busca todas as propostas
      const allProposals = await this.getProposals();
      
      // Busca todos os clientes, produtos, convênios e bancos para juntar aos dados das propostas
      const allClients = await this.getClients();
      const allProducts = await this.getProducts();
      const allConvenios = await this.getConvenios();
      const allBanks = await this.getBanks();
      
      // Mapeia as propostas com seus detalhes
      return allProposals.map(proposal => ({
        ...proposal,
        client: allClients.find(c => c.id === proposal.clientId),
        product: allProducts.find(p => p.id === proposal.productId),
        convenio: allConvenios.find(c => c.id === proposal.convenioId),
        bank: allBanks.find(b => b.id === proposal.bankId)
      }));
    } catch (error) {
      console.error('Erro ao buscar propostas com detalhes:', error);
      return [];
    }
  }

  // Métodos para Kanban
  async getKanbanEntries(): Promise<Kanban[]> {
    try {
      console.log('DB: Buscando todas as entradas do kanban');
      return await db.select().from(kanban);
    } catch (error) {
      console.error('Erro ao buscar entradas do kanban:', error);
      return [];
    }
  }

  async getKanbanEntry(id: number): Promise<Kanban | undefined> {
    try {
      console.log(`DB: Buscando entrada de kanban com ID ${id}`);
      const result = await db.select().from(kanban).where(eq(kanban.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar entrada de kanban com ID ${id}:`, error);
      return undefined;
    }
  }

  async getKanbanEntryByClient(clientId: number): Promise<Kanban | undefined> {
    try {
      console.log(`DB: Buscando entrada de kanban do cliente com ID ${clientId}`);
      const result = await db.select().from(kanban).where(eq(kanban.clientId, clientId));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar entrada de kanban do cliente com ID ${clientId}:`, error);
      return undefined;
    }
  }

  async createKanbanEntry(kanbanEntry: InsertKanban): Promise<Kanban> {
    try {
      console.log('DB: Criando nova entrada de kanban', kanbanEntry);
      
      // Se não tiver uma posição, obter a próxima posição disponível na coluna
      if (kanbanEntry.position === undefined) {
        kanbanEntry.position = await this.getNextPositionForColumn(kanbanEntry.column);
      }
      
      const [newEntry] = await db.insert(kanban).values(kanbanEntry).returning();
      return newEntry;
    } catch (error) {
      console.error('Erro ao criar entrada de kanban:', error);
      throw error;
    }
  }

  async updateKanbanEntry(id: number, kanbanEntry: Partial<InsertKanban>): Promise<Kanban | undefined> {
    try {
      console.log(`DB: Atualizando entrada de kanban com ID ${id}`, kanbanEntry);
      const [updatedEntry] = await db
        .update(kanban)
        .set(kanbanEntry)
        .where(eq(kanban.id, id))
        .returning();
      return updatedEntry;
    } catch (error) {
      console.error(`Erro ao atualizar entrada de kanban com ID ${id}:`, error);
      return undefined;
    }
  }

  async updateClientKanbanColumn(clientId: number, column: string): Promise<Kanban | undefined> {
    try {
      console.log(`DB: Atualizando coluna do kanban do cliente com ID ${clientId} para ${column}`);
      
      // Busca a entrada existente
      const existingEntry = await this.getKanbanEntryByClient(clientId);
      
      if (existingEntry) {
        // Se já existe uma entrada, atualizá-la
        const position = await this.getNextPositionForColumn(column);
        return await this.updateKanbanEntry(existingEntry.id, { column, position });
      } else {
        // Se não existe, criar uma nova
        const position = await this.getNextPositionForColumn(column);
        const entry = await this.createKanbanEntry({ clientId, column, position });
        return entry;
      }
    } catch (error) {
      console.error(`Erro ao atualizar coluna do kanban do cliente com ID ${clientId}:`, error);
      return undefined;
    }
  }

  private async getNextPositionForColumn(column: string): Promise<number> {
    try {
      // Busca o maior valor de posição na coluna
      const positionQuery = db
        .select({
          maxPos: sql<number>`coalesce(max(${kanban.position}), -1)`
        })
        .from(kanban)
        .where(eq(kanban.column, column));
        
      const [result] = await positionQuery;
      return (result?.maxPos || -1) + 1;
    } catch (error) {
      console.error(`Erro ao obter próxima posição para coluna ${column}:`, error);
      return 0;
    }
  }

  // Métodos para Clientes por Criador/Organização
  async getClientsByCreator(creatorId: number): Promise<Client[]> {
    try {
      console.log(`DB: Buscando clientes criados pelo usuário com ID ${creatorId}`);
      return await db
        .select()
        .from(clients)
        .where(eq(clients.createdById, creatorId));
    } catch (error) {
      console.error(`Erro ao buscar clientes criados pelo usuário com ID ${creatorId}:`, error);
      return [];
    }
  }

  async getClientsByOrganization(organizationId: number): Promise<Client[]> {
    try {
      console.log(`DB: Buscando clientes da organização com ID ${organizationId}`);
      return await db
        .select()
        .from(clients)
        .where(eq(clients.organizationId, organizationId));
    } catch (error) {
      console.error(`Erro ao buscar clientes da organização com ID ${organizationId}:`, error);
      return [];
    }
  }

  // Métodos para Propostas por Criador/Organização
  async getProposalsByCreator(creatorId: number): Promise<Proposal[]> {
    try {
      console.log(`DB: Buscando propostas criadas pelo usuário com ID ${creatorId}`);
      return await db
        .select()
        .from(proposals)
        .where(eq(proposals.createdById, creatorId))
        .orderBy(desc(proposals.createdAt));
    } catch (error) {
      console.error(`Erro ao buscar propostas criadas pelo usuário com ID ${creatorId}:`, error);
      return [];
    }
  }

  async getProposalsByOrganization(organizationId: number): Promise<Proposal[]> {
    try {
      console.log(`DB: Buscando propostas da organização com ID ${organizationId}`);
      return await db
        .select()
        .from(proposals)
        .where(eq(proposals.organizationId, organizationId))
        .orderBy(desc(proposals.createdAt));
    } catch (error) {
      console.error(`Erro ao buscar propostas da organização com ID ${organizationId}:`, error);
      return [];
    }
  }

  // Métodos para Usuários
  async getUsers(): Promise<User[]> {
    try {
      console.log('DB: Buscando todos os usuários');
      return await db.select().from(users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      console.log(`DB: Buscando usuário com ID ${id}`);
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar usuário com ID ${id}:`, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log(`DB: Buscando usuário com email ${email}`);
      const result = await db.select().from(users).where(eq(users.email, email));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar usuário com email ${email}:`, error);
      return undefined;
    }
  }

  async createUser(user: RegisterUser): Promise<User> {
    try {
      console.log('DB: Criando novo usuário', { ...user, password: '[REDACTED]' });
      
      // Gerar salt e hash da senha
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(user.password, salt, 64).toString('hex');
      const hashedPassword = `${salt}:${hash}`;
      
      // Remover a senha em texto puro e adicionar a senha hasheada
      const { password, ...userData } = user;
      
      // Inserir o usuário no banco de dados
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          // Aqui poderíamos armazenar hashedPassword em uma coluna password, 
          // mas nessa implementação não estamos armazenando a senha
        })
        .returning();
        
      return newUser;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      console.log(`DB: Atualizando usuário com ID ${id}`, userData);
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error(`Erro ao atualizar usuário com ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log(`DB: Removendo usuário com ID ${id}`);
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao remover usuário com ID ${id}:`, error);
      return false;
    }
  }

  async getUsersInOrganization(organizationId: number): Promise<User[]> {
    try {
      console.log(`DB: Buscando usuários da organização com ID ${organizationId}`);
      return await db
        .select()
        .from(users)
        .where(eq(users.organizationId, organizationId));
    } catch (error) {
      console.error(`Erro ao buscar usuários da organização com ID ${organizationId}:`, error);
      return [];
    }
  }

  // Autenticação
  async loginUser(email: string, password: string): Promise<AuthData | null> {
    try {
      console.log(`DB: Tentando login para o usuário com email ${email}`);
      
      // Buscar usuário pelo email
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        console.log(`Usuário com email ${email} não encontrado`);
        return null;
      }
      
      // Para simplificar, em ambiente de desenvolvimento/teste, aceitamos qualquer senha
      // Na produção, usaríamos uma verificação hash adequada
      console.log(`Login bem-sucedido para o usuário ${email}`);
      
      // Buscar organização
      let organization: Organization | undefined;
      if (user.organizationId) {
        organization = await this.getOrganizationById(user.organizationId);
      }
      
      // Gerar token
      const token = jwt.sign({ userId: user.id, role: user.role }, "secret_key", { expiresIn: "7d" });
      
      return {
        token,
        user: {
          ...user,
          organization
        }
      };
    } catch (error) {
      console.error(`Erro ao realizar login para usuário com email ${email}:`, error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      console.log(`DB: Resetando senha do usuário com email ${email}`);
      
      // Verificar se o usuário existe
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        console.log(`Usuário com email ${email} não encontrado`);
        return false;
      }
      
      // Em uma implementação real, enviaríamos um e-mail com link para reset
      // e/ou gerar uma nova senha temporária
      console.log(`Senha resetada para o usuário com email ${email}`);
      
      return true;
    } catch (error) {
      console.error(`Erro ao resetar senha do usuário com email ${email}:`, error);
      return false;
    }
  }

  // Métodos para Organizações
  async getOrganizations(): Promise<Organization[]> {
    try {
      console.log('DB: Buscando todas as organizações');
      return await db.select().from(organizations);
    } catch (error) {
      console.error('Erro ao buscar organizações:', error);
      return [];
    }
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    try {
      console.log(`DB: Buscando organização com ID ${id}`);
      const result = await db.select().from(organizations).where(eq(organizations.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar organização com ID ${id}:`, error);
      return undefined;
    }
  }

  async createOrganization(organizationData: InsertOrganization): Promise<Organization> {
    try {
      console.log('DB: Criando nova organização', organizationData);
      const [newOrg] = await db
        .insert(organizations)
        .values(organizationData)
        .returning();
      return newOrg;
    } catch (error) {
      console.error('Erro ao criar organização:', error);
      throw error;
    }
  }

  async updateOrganization(id: number, organizationData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    try {
      console.log(`DB: Atualizando organização com ID ${id}`, organizationData);
      const [updatedOrg] = await db
        .update(organizations)
        .set(organizationData)
        .where(eq(organizations.id, id))
        .returning();
      return updatedOrg;
    } catch (error) {
      console.error(`Erro ao atualizar organização com ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteOrganization(id: number): Promise<boolean> {
    try {
      console.log(`DB: Removendo organização com ID ${id}`);
      
      // Remover usuários da organização ou atualizar para NULL
      await db
        .update(users)
        .set({ organizationId: null })
        .where(eq(users.organizationId, id));
      
      // Remover clientes da organização
      await db
        .delete(clients)
        .where(eq(clients.organizationId, id));
      
      // Remover propostas da organização
      await db
        .delete(proposals)
        .where(eq(proposals.organizationId, id));
      
      // Remover a organização
      const result = await db
        .delete(organizations)
        .where(eq(organizations.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao remover organização com ID ${id}:`, error);
      return false;
    }
  }
}

// Exportar uma instância para uso em routes.ts
export const databaseStorage = new DatabaseStorage();