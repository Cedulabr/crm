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
  organizations,
  formTemplates,
  formSubmissions,
  // Tipos
  Client,
  Product,
  Convenio,
  Bank,
  Proposal,
  User,
  Organization,
  InsertClient,
  InsertProduct,
  InsertConvenio,
  InsertBank,
  InsertProposal,
  InsertUser,
  InsertOrganization,
  RegisterUser,
  ProposalWithDetails,
  AuthData,
  FormTemplate,
  FormSubmission,
  InsertFormTemplate,
  InsertFormSubmission
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
      console.log(`DB: Buscando propostas por valor entre ${minValue} e ${maxValue || 'infinito'}`);
      // Converter valores das propostas para números
      // Note: Isso assume que o campo value está no formato 'R$ X.XXX,XX'
      const allProposals = await this.getProposals();
      
      return allProposals.filter(p => {
        if (!p.value) return false;
        
        // Remover 'R$ ' e substituir '.' por '' e ',' por '.'
        const numericValue = parseFloat(
          p.value.replace('R$ ', '')
            .replace(/\./g, '')
            .replace(',', '.')
        );
        
        if (isNaN(numericValue)) return false;
        
        if (maxValue !== undefined) {
          return numericValue >= minValue && numericValue <= maxValue;
        } else {
          return numericValue >= minValue;
        }
      });
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
      
      // Obtém todas as propostas, clientes, produtos, convênios e bancos
      const allProposals = await this.getProposals();
      const allClients = await this.getClients();
      const allProducts = await this.getProducts();
      const allConvenios = await this.getConvenios();
      const allBanks = await this.getBanks();
      
      // Mapeia as propostas com seus detalhes relacionados
      return allProposals.map(proposal => {
        const client = allClients.find(c => c.id === proposal.clientId);
        const product = allProducts.find(p => p.id === proposal.productId);
        const convenio = allConvenios.find(c => c.id === proposal.convenioId);
        const bank = allBanks.find(b => b.id === proposal.bankId);
        
        return {
          ...proposal,
          client,
          product,
          convenio,
          bank
        };
      });
    } catch (error) {
      console.error('Erro ao buscar propostas com detalhes:', error);
      return [];
    }
  }

  // Métodos para filtros por criador e organização
  async getClientsByCreator(creatorId: number): Promise<Client[]> {
    try {
      console.log(`DB: Buscando clientes do criador com ID ${creatorId}`);
      return await db
        .select()
        .from(clients)
        .where(eq(clients.createdById, creatorId));
    } catch (error) {
      console.error(`Erro ao buscar clientes do criador com ID ${creatorId}:`, error);
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

  async getProposalsByCreator(creatorId: number): Promise<Proposal[]> {
    try {
      console.log(`DB: Buscando propostas do criador com ID ${creatorId}`);
      return await db
        .select()
        .from(proposals)
        .where(eq(proposals.createdById, creatorId))
        .orderBy(desc(proposals.createdAt));
    } catch (error) {
      console.error(`Erro ao buscar propostas do criador com ID ${creatorId}:`, error);
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
      console.log(`DB: Buscando usuário com e-mail ${email}`);
      const result = await db.select().from(users).where(eq(users.email, email));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar usuário com e-mail ${email}:`, error);
      return undefined;
    }
  }

  async createUser(user: RegisterUser): Promise<User> {
    try {
      console.log('DB: Criando novo usuário', { ...user, password: '[REDACTED]' });
      
      // Verificar se já existe um usuário com o mesmo e-mail
      const existingUser = await this.getUserByEmail(user.email);
      if (existingUser) {
        throw new Error('Já existe um usuário com este e-mail');
      }
      
      // Hash da senha
      const salt = randomBytes(16).toString('hex');
      const hashedPassword = scryptSync(user.password, salt, 64).toString('hex') + '.' + salt;
      
      const [newUser] = await db
        .insert(users)
        .values({
          ...user,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date()
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
      
      // Se estiver atualizando o e-mail, verificar se já existe
      if (userData.email) {
        const existingUser = await this.getUserByEmail(userData.email);
        if (existingUser && existingUser.id !== id) {
          throw new Error('Já existe um usuário com este e-mail');
        }
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date()
        })
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
      
      // Verificar se o usuário existe
      const user = await this.getUserById(id);
      if (!user) {
        return false;
      }
      
      // Não permitir excluir o último superadmin
      if (user.role === 'superadmin') {
        const superadmins = (await this.getUsers()).filter(u => u.role === 'superadmin');
        if (superadmins.length <= 1) {
          throw new Error('Não é possível excluir o último superadmin');
        }
      }
      
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

  async loginUser(email: string, password: string): Promise<AuthData | null> {
    try {
      console.log(`DB: Tentativa de login para o usuário ${email}`);
      
      // Buscar o usuário pelo e-mail
      const user = await this.getUserByEmail(email);
      if (!user) {
        console.log(`Usuário com e-mail ${email} não encontrado`);
        return null;
      }
      
      // Verificar a senha
      const [hashedPassword, salt] = user.password.split('.');
      const inputHash = scryptSync(password, salt, 64).toString('hex');
      
      if (inputHash !== hashedPassword) {
        console.log(`Senha incorreta para o usuário ${email}`);
        return null;
      }
      
      // Buscar a organização do usuário
      const organization = await this.getOrganizationById(user.organizationId);
      
      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'seu_jwt_secret',
        { expiresIn: '24h' }
      );
      
      return {
        token,
        user: {
          ...user,
          organization
        }
      };
    } catch (error) {
      console.error(`Erro ao realizar login para o usuário ${email}:`, error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      console.log(`DB: Resetando senha para o usuário ${email}`);
      
      // Buscar o usuário pelo e-mail
      const user = await this.getUserByEmail(email);
      if (!user) {
        console.log(`Usuário com e-mail ${email} não encontrado`);
        return false;
      }
      
      // Gerar nova senha aleatória
      const newPassword = randomBytes(4).toString('hex');
      
      // Hash da nova senha
      const salt = randomBytes(16).toString('hex');
      const hashedPassword = scryptSync(newPassword, salt, 64).toString('hex') + '.' + salt;
      
      // Atualizar o usuário
      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
      
      console.log(`Nova senha gerada para o usuário ${email}: ${newPassword}`);
      
      // Em um ambiente de produção, enviar e-mail com a nova senha
      
      return true;
    } catch (error) {
      console.error(`Erro ao resetar senha para o usuário ${email}:`, error);
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
      
      // Garantir que createdAt esteja definido
      if (!organizationData.createdAt) {
        organizationData = { ...organizationData, createdAt: new Date() };
      }
      
      const [newOrganization] = await db
        .insert(organizations)
        .values(organizationData)
        .returning();
      
      return newOrganization;
    } catch (error) {
      console.error('Erro ao criar organização:', error);
      throw error;
    }
  }

  async updateOrganization(id: number, organizationData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    try {
      console.log(`DB: Atualizando organização com ID ${id}`, organizationData);
      const [updatedOrganization] = await db
        .update(organizations)
        .set(organizationData)
        .where(eq(organizations.id, id))
        .returning();
      
      return updatedOrganization;
    } catch (error) {
      console.error(`Erro ao atualizar organização com ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteOrganization(id: number): Promise<boolean> {
    try {
      console.log(`DB: Removendo organização com ID ${id}`);
      
      // Verificar se existem usuários na organização
      const usersInOrg = await this.getUsersInOrganization(id);
      if (usersInOrg.length > 0) {
        throw new Error('Não é possível excluir uma organização com usuários');
      }
      
      const result = await db.delete(organizations).where(eq(organizations.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao remover organização com ID ${id}:`, error);
      return false;
    }
  }

  // Métodos para Templates de Formulários
  async getFormTemplates(): Promise<FormTemplate[]> {
    try {
      console.log('DB: Buscando todos os templates de formulários');
      return await db.select().from(formTemplates);
    } catch (error) {
      console.error('Erro ao buscar templates de formulários:', error);
      return [];
    }
  }

  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    try {
      console.log(`DB: Buscando template de formulário com ID ${id}`);
      const result = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar template de formulário com ID ${id}:`, error);
      return undefined;
    }
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    try {
      console.log('DB: Criando novo template de formulário', template);
      
      // Garantir timestamps
      if (!template.createdAt) {
        template = {
          ...template,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      const [newTemplate] = await db
        .insert(formTemplates)
        .values(template)
        .returning();
      
      return newTemplate;
    } catch (error) {
      console.error('Erro ao criar template de formulário:', error);
      throw error;
    }
  }

  async updateFormTemplate(id: number, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    try {
      console.log(`DB: Atualizando template de formulário com ID ${id}`, template);
      
      // Adicionar data de atualização
      template = {
        ...template,
        updatedAt: new Date()
      };
      
      const [updatedTemplate] = await db
        .update(formTemplates)
        .set(template)
        .where(eq(formTemplates.id, id))
        .returning();
      
      return updatedTemplate;
    } catch (error) {
      console.error(`Erro ao atualizar template de formulário com ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteFormTemplate(id: number): Promise<boolean> {
    try {
      console.log(`DB: Removendo template de formulário com ID ${id}`);
      
      // Verificar se existem submissões usando este template
      const submissions = await this.getFormSubmissionsByTemplate(id);
      if (submissions.length > 0) {
        console.warn(`Existem ${submissions.length} submissões usando este template. Deletar mesmo assim.`);
      }
      
      // Remover as submissões relacionadas
      for (const submission of submissions) {
        await db.delete(formSubmissions).where(eq(formSubmissions.id, submission.id));
      }
      
      const result = await db.delete(formTemplates).where(eq(formTemplates.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao remover template de formulário com ID ${id}:`, error);
      return false;
    }
  }

  async getFormTemplatesByOrganization(organizationId: number): Promise<FormTemplate[]> {
    try {
      console.log(`DB: Buscando templates de formulários da organização com ID ${organizationId}`);
      return await db
        .select()
        .from(formTemplates)
        .where(eq(formTemplates.organizationId, organizationId));
    } catch (error) {
      console.error(`Erro ao buscar templates de formulários da organização com ID ${organizationId}:`, error);
      return [];
    }
  }

  // Métodos para Submissões de Formulários
  async getFormSubmissions(): Promise<FormSubmission[]> {
    try {
      console.log('DB: Buscando todas as submissões de formulários');
      return await db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt));
    } catch (error) {
      console.error('Erro ao buscar submissões de formulários:', error);
      return [];
    }
  }

  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    try {
      console.log(`DB: Buscando submissão de formulário com ID ${id}`);
      const result = await db.select().from(formSubmissions).where(eq(formSubmissions.id, id));
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar submissão de formulário com ID ${id}:`, error);
      return undefined;
    }
  }

  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    try {
      console.log('DB: Criando nova submissão de formulário', submission);
      
      // Garantir que status e timestamps estejam definidos
      submission = {
        ...submission,
        status: submission.status || 'pending',
        createdAt: new Date()
      };
      
      const [newSubmission] = await db
        .insert(formSubmissions)
        .values(submission)
        .returning();
      
      return newSubmission;
    } catch (error) {
      console.error('Erro ao criar submissão de formulário:', error);
      throw error;
    }
  }

  async updateFormSubmissionStatus(id: number, status: string, processedById?: number): Promise<FormSubmission | undefined> {
    try {
      console.log(`DB: Atualizando status da submissão de formulário com ID ${id} para ${status}`);
      
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (processedById) {
        updateData.processedById = processedById;
      }
      
      const [updatedSubmission] = await db
        .update(formSubmissions)
        .set(updateData)
        .where(eq(formSubmissions.id, id))
        .returning();
      
      return updatedSubmission;
    } catch (error) {
      console.error(`Erro ao atualizar status da submissão de formulário com ID ${id}:`, error);
      return undefined;
    }
  }

  async processFormSubmission(id: number, processedById: number): Promise<{client: Client, submission: FormSubmission} | undefined> {
    try {
      console.log(`DB: Processando submissão de formulário com ID ${id}`);
      
      // Buscar a submissão
      const submission = await this.getFormSubmission(id);
      if (!submission) {
        throw new Error(`Submissão de formulário com ID ${id} não encontrada`);
      }
      
      // Verificar se já foi processada
      if (submission.status === 'processed') {
        throw new Error(`Submissão de formulário com ID ${id} já foi processada`);
      }
      
      // Buscar o template
      const template = await this.getFormTemplate(submission.formTemplateId);
      if (!template) {
        throw new Error(`Template de formulário com ID ${submission.formTemplateId} não encontrado`);
      }
      
      // Criar cliente a partir dos dados da submissão
      const data = submission.data;
      
      // Buscar o usuário que está processando
      const user = await this.getUserById(processedById);
      if (!user) {
        throw new Error(`Usuário com ID ${processedById} não encontrado`);
      }
      
      // Criar o cliente
      const newClient: InsertClient = {
        name: data.nome || 'Cliente sem nome',
        email: data.email || '',
        phone: data.telefone || '',
        cpf: data.cpf || '',
        birthDate: data.data_nascimento || '',
        createdById: processedById,
        organizationId: user.organizationId
      };
      
      const client = await this.createClient(newClient);
      
      // Atualizar o status da submissão
      const updatedSubmission = await this.updateFormSubmissionStatus(id, 'processed', processedById);
      
      if (!updatedSubmission) {
        throw new Error(`Erro ao atualizar status da submissão de formulário com ID ${id}`);
      }
      
      return { 
        client, 
        submission: updatedSubmission 
      };
    } catch (error) {
      console.error(`Erro ao processar submissão de formulário com ID ${id}:`, error);
      return undefined;
    }
  }

  async getFormSubmissionsByTemplate(templateId: number): Promise<FormSubmission[]> {
    try {
      console.log(`DB: Buscando submissões de formulários do template com ID ${templateId}`);
      return await db
        .select()
        .from(formSubmissions)
        .where(eq(formSubmissions.formTemplateId, templateId))
        .orderBy(desc(formSubmissions.createdAt));
    } catch (error) {
      console.error(`Erro ao buscar submissões de formulários do template com ID ${templateId}:`, error);
      return [];
    }
  }

  async getFormSubmissionsByStatus(status: string): Promise<FormSubmission[]> {
    try {
      console.log(`DB: Buscando submissões de formulários com status ${status}`);
      return await db
        .select()
        .from(formSubmissions)
        .where(eq(formSubmissions.status, status))
        .orderBy(desc(formSubmissions.createdAt));
    } catch (error) {
      console.error(`Erro ao buscar submissões de formulários com status ${status}:`, error);
      return [];
    }
  }

  async getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]> {
    try {
      console.log(`DB: Buscando submissões de formulários da organização com ID ${organizationId}`);
      
      // Primeiro obtém os templates da organização
      const templates = await this.getFormTemplatesByOrganization(organizationId);
      
      // Se não houver templates, retorna array vazio
      if (templates.length === 0) {
        return [];
      }
      
      // Busca todas as submissões
      const allSubmissions = await this.getFormSubmissions();
      
      // Filtra as submissões que pertencem aos templates da organização
      return allSubmissions.filter(submission => 
        templates.some(template => template.id === submission.formTemplateId)
      );
    } catch (error) {
      console.error(`Erro ao buscar submissões de formulários da organização com ID ${organizationId}:`, error);
      return [];
    }
  }
}

export const databaseStorage = new DatabaseStorage();