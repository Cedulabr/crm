import { 
  clients, 
  products, 
  convenios, 
  banks, 
  proposals, 
  kanban,
  users,
  organizations,
  formTemplates,
  formSubmissions,
  type Client, 
  type InsertClient,
  type Product,
  type InsertProduct,
  type Convenio,
  type InsertConvenio,
  type Bank,
  type InsertBank,
  type Proposal,
  type InsertProposal,
  type Kanban,
  type InsertKanban,
  type ClientWithKanban,
  type ProposalWithDetails,
  type User,
  type InsertUser,
  type RegisterUser,
  type Organization,
  type InsertOrganization,
  type UserWithOrganization,
  type AuthData,
  type FormTemplate,
  type InsertFormTemplate,
  type FormSubmission,
  type InsertFormSubmission
} from "@shared/schema";

export interface IStorage {
  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  getClientsWithKanban(): Promise<ClientWithKanban[]>;
  getClientsByCreator(creatorId: number): Promise<Client[]>; // Obter clientes por ID do agente criador
  getClientsByOrganization(organizationId: number): Promise<Client[]>; // Obter clientes por ID da organização

  // Product operations
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Convenio operations
  getConvenios(): Promise<Convenio[]>;
  getConvenio(id: number): Promise<Convenio | undefined>;
  createConvenio(convenio: InsertConvenio): Promise<Convenio>;

  // Bank operations
  getBanks(): Promise<Bank[]>;
  getBank(id: number): Promise<Bank | undefined>;
  createBank(bank: InsertBank): Promise<Bank>;

  // Proposal operations
  getProposals(): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;
  deleteProposal(id: number): Promise<boolean>;
  getProposalsByClient(clientId: number): Promise<Proposal[]>;
  getProposalsByProduct(productId: number): Promise<Proposal[]>;
  getProposalsByValue(minValue: number, maxValue?: number): Promise<Proposal[]>;
  getProposalsByStatus(status: string): Promise<Proposal[]>;
  getProposalsWithDetails(): Promise<ProposalWithDetails[]>;
  getProposalsByCreator(creatorId: number): Promise<Proposal[]>; // Obter propostas por ID do agente criador
  getProposalsByOrganization(organizationId: number): Promise<Proposal[]>; // Obter propostas por ID da organização

  // Kanban operations
  getKanbanEntries(): Promise<Kanban[]>;
  getKanbanEntry(id: number): Promise<Kanban | undefined>;
  getKanbanEntryByClient(clientId: number): Promise<Kanban | undefined>;
  createKanbanEntry(kanbanEntry: InsertKanban): Promise<Kanban>;
  updateKanbanEntry(id: number, kanbanEntry: Partial<InsertKanban>): Promise<Kanban | undefined>;
  updateClientKanbanColumn(clientId: number, column: string): Promise<Kanban | undefined>;
  
  // User operations
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: RegisterUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsersInOrganization(organizationId: number): Promise<User[]>;
  
  // Authentication
  loginUser(email: string, password: string): Promise<AuthData | null>;
  resetPassword(email: string): Promise<boolean>; // Gerar nova senha para usuário
  
  // Organization operations
  getOrganizations(): Promise<Organization[]>;
  getOrganizationById(id: number): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteOrganization(id: number): Promise<boolean>;
  
  // Form Template operations
  getFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplate(id: number): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: number, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: number): Promise<boolean>;
  getFormTemplatesByOrganization(organizationId: number): Promise<FormTemplate[]>;
  
  // Form Submission operations
  getFormSubmissions(): Promise<FormSubmission[]>;
  getFormSubmission(id: number): Promise<FormSubmission | undefined>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  updateFormSubmissionStatus(id: number, status: string, processedById?: number): Promise<FormSubmission | undefined>; 
  processFormSubmission(id: number, processedById: number): Promise<{client: Client, submission: FormSubmission} | undefined>;
  getFormSubmissionsByTemplate(templateId: number): Promise<FormSubmission[]>;
  getFormSubmissionsByStatus(status: string): Promise<FormSubmission[]>;
  getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private products: Map<number, Product>;
  private convenios: Map<number, Convenio>;
  private banks: Map<number, Bank>;
  private proposals: Map<number, Proposal>;
  private kanbanEntries: Map<number, Kanban>;
  private users: Map<number, User>;
  private organizations: Map<number, Organization>;
  private formTemplates: Map<number, FormTemplate>;
  private formSubmissions: Map<number, FormSubmission>;
  
  private clientId: number;
  private productId: number;
  private convenioId: number;
  private bankId: number;
  private proposalId: number;
  private kanbanId: number;
  private userId: number;
  private organizationId: number;
  private formTemplateId: number;
  private formSubmissionId: number;

  constructor() {
    this.clients = new Map();
    this.products = new Map();
    this.convenios = new Map();
    this.banks = new Map();
    this.proposals = new Map();
    this.kanbanEntries = new Map();
    this.users = new Map();
    this.organizations = new Map();
    this.formTemplates = new Map();
    this.formSubmissions = new Map();
    
    this.clientId = 1;
    this.productId = 1;
    this.convenioId = 1;
    this.bankId = 1;
    this.proposalId = 1;
    this.kanbanId = 1;
    this.userId = 1;
    this.organizationId = 1;
    this.formTemplateId = 1;
    this.formSubmissionId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Initialize Products
    const products = [
      { name: "Novo empréstimo", price: "50000" },
      { name: "Refinanciamento", price: "20000" },
      { name: "Portabilidade", price: "100000" },
      { name: "Cartão", price: "10000" },
      { name: "Saque FGTS", price: "5000" }
    ];
    
    products.forEach(p => this.createProduct(p));

    // Initialize Convenios
    const convenios = [
      { name: "Beneficiário do INSS" },
      { name: "Servidor Público" },
      { name: "LOAS / BPC" },
      { name: "Carteira assinada CLT" }
    ];
    
    convenios.forEach(c => this.createConvenio(c));

    // Initialize Banks
    const banks = [
      { name: "BANCO BANRISUL" },
      { name: "BANCO PICPAY" },
      { name: "BANCO FOX" },
      { name: "BANCO HAPPY" },
      { name: "BANCO BMG" },
      { name: "BANCO C6 BANK" },
      { name: "BANCO CAIXA ECONÔMICA FEDERAL" },
      { name: "BANCO CREFAZ" },
      { name: "BANCO CREFISA" },
      { name: "BANCO DAYCOVAL" },
      { name: "BANCO DIGIO S.A." },
      { name: "BANCO DO BRASIL" },
      { name: "BANCO INBURSA S.A." },
      { name: "BANCO ITAÚ CONSIGNADO" },
      { name: "BANCO MASTER" },
      { name: "BANCO MERCANTIL DO BRASIL" },
      { name: "BANCO PAN" },
      { name: "BANCO PARANÁ" },
      { name: "BANCO PRATA DIGITAL" },
      { name: "BANCO QUERO MAIS CREDITO" },
      { name: "BANCO SAFRA" },
      { name: "BANCO SANTANDER" },
      { name: "BANCO VCTEX" },
      { name: "BRB - CRÉDITO, FINANCIAMENTO E INVESTIMENTO" },
      { name: "C6 AUTO - CONSIG" },
      { name: "FACTA FINANCEIRA" },
      { name: "FINANTO BANK" },
      { name: "HUB CRÉDITOS" },
      { name: "ICRED FINANCEIRA" },
      { name: "KOVR SEGURADORA" },
      { name: "LOTUS" },
      { name: "MEU CASHCARD" },
      { name: "NOVO SAQUE FINANCEIRA" },
      { name: "PRESENÇA BANK" },
      { name: "TA QUITADO" },
      { name: "UY3 SOCIEDADE DE CRÉDITO DIRETO S/A" },
      { name: "V8 DIGITAL" },
      { name: "VEMCARD" },
      { name: "X FORCE" },
      { name: "X3 BANK" }
    ];
    
    banks.forEach(b => this.createBank(b));
    
    // Initialize Organizations
    const organizations = [
      { name: "Matriz", description: "Empresa principal" },
      { name: "Filial 1", description: "Primeira filial" },
      { name: "Filial 2", description: "Segunda filial" }
    ];
    
    organizations.forEach(org => this.createOrganization(org));
    
    // Initialize Users (superadmin, gestor, agente)
    const superadmin = {
      name: "Administrador",
      email: "admin@empresa.com",
      password: "senha123",
      role: "superadmin",
      organizationId: 1
    };
    
    const gestor = {
      name: "Gestor",
      email: "gestor@empresa.com",
      password: "senha123",
      role: "manager",
      organizationId: 1
    };
    
    const agente = {
      name: "Agente",
      email: "agente@empresa.com",
      password: "senha123",
      role: "agent",
      organizationId: 1
    };
    
    this.createUser(superadmin);
    this.createUser(gestor);
    this.createUser(agente);
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientId++;
    const newClient: Client = { ...client, id, createdAt: new Date() };
    this.clients.set(id, newClient);
    
    // Automatically create a kanban entry for new client with 'lead' column
    const kanbanEntry: InsertKanban = {
      clientId: id,
      column: 'lead',
      position: this.getNextPositionForColumn('lead')
    };
    
    await this.createKanbanEntry(kanbanEntry);
    
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) return undefined;

    const updatedClient = { ...existingClient, ...client };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    const deleted = this.clients.delete(id);
    
    // Also delete associated kanban entry
    const kanbanEntry = await this.getKanbanEntryByClient(id);
    if (kanbanEntry) {
      this.kanbanEntries.delete(kanbanEntry.id);
    }
    
    // Delete associated proposals
    const proposals = await this.getProposalsByClient(id);
    proposals.forEach(proposal => {
      this.proposals.delete(proposal.id);
    });
    
    return deleted;
  }

  async getClientsWithKanban(): Promise<ClientWithKanban[]> {
    const clients = await this.getClients();
    const clientsWithKanban: ClientWithKanban[] = [];

    for (const client of clients) {
      const kanban = await this.getKanbanEntryByClient(client.id);
      const proposals = await this.getProposalsByClient(client.id);
      
      // Mostrar apenas clientes com propostas cadastradas
      if (proposals.length === 0) continue;
      
      const totalValue = proposals.reduce((sum, proposal) => {
        return sum + (Number(proposal.value) || 0);
      }, 0);

      clientsWithKanban.push({
        ...client,
        kanban,
        proposalCount: proposals.length,
        totalValue: totalValue > 0 ? totalValue : undefined
      });
    }

    return clientsWithKanban;
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productId++;
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  // Convenio operations
  async getConvenios(): Promise<Convenio[]> {
    return Array.from(this.convenios.values());
  }

  async getConvenio(id: number): Promise<Convenio | undefined> {
    return this.convenios.get(id);
  }

  async createConvenio(convenio: InsertConvenio): Promise<Convenio> {
    const id = this.convenioId++;
    const newConvenio: Convenio = { ...convenio, id };
    this.convenios.set(id, newConvenio);
    return newConvenio;
  }

  // Bank operations
  async getBanks(): Promise<Bank[]> {
    return Array.from(this.banks.values());
  }

  async getBank(id: number): Promise<Bank | undefined> {
    return this.banks.get(id);
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    const id = this.bankId++;
    const newBank: Bank = { ...bank, id };
    this.banks.set(id, newBank);
    return newBank;
  }

  // Proposal operations
  async getProposals(): Promise<Proposal[]> {
    return Array.from(this.proposals.values());
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const id = this.proposalId++;
    // Sempre criar com status 'lead' para que apareça em "Nova proposta" no Kanban
    const status = 'lead';
    const newProposal: Proposal = { ...proposal, id, createdAt: new Date(), status };
    this.proposals.set(id, newProposal);
    
    // Verificar se o cliente já tem uma entrada no Kanban
    const client = this.clients.get(proposal.clientId || 0);
    if (client) {
      const existingKanban = Array.from(this.kanbanEntries.values())
        .find(entry => entry.clientId === client.id);
      
      // Se o cliente não tiver uma entrada no Kanban, criar uma
      if (!existingKanban) {
        const kanbanId = this.kanbanId++;
        const position = this.getNextPositionForColumn('lead');
        const kanbanEntry: Kanban = {
          id: kanbanId,
          clientId: client.id,
          column: 'lead',
          position
        };
        this.kanbanEntries.set(kanbanId, kanbanEntry);
      } else if (existingKanban.column !== 'lead') {
        // Se o cliente já tiver uma entrada no Kanban, mas não estiver na coluna "Nova proposta"
        // Mover para a coluna "Nova proposta"
        existingKanban.column = 'lead';
        existingKanban.position = this.getNextPositionForColumn('lead');
      }
    }
    
    return newProposal;
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const existingProposal = this.proposals.get(id);
    if (!existingProposal) return undefined;

    const updatedProposal = { ...existingProposal, ...proposal };
    this.proposals.set(id, updatedProposal);
    return updatedProposal;
  }

  async deleteProposal(id: number): Promise<boolean> {
    return this.proposals.delete(id);
  }

  async getProposalsByClient(clientId: number): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter(
      proposal => proposal.clientId === clientId
    );
  }

  async getProposalsByProduct(productId: number): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter(
      proposal => proposal.productId === productId
    );
  }

  async getProposalsByValue(minValue: number, maxValue?: number): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter(proposal => {
      const value = Number(proposal.value);
      if (maxValue !== undefined) {
        return value >= minValue && value <= maxValue;
      }
      return value >= minValue;
    });
  }

  async getProposalsByStatus(status: string): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter(
      proposal => proposal.status === status
    );
  }

  async getProposalsWithDetails(): Promise<ProposalWithDetails[]> {
    const proposals = await this.getProposals();
    const proposalsWithDetails: ProposalWithDetails[] = [];

    for (const proposal of proposals) {
      const client = await this.getClient(proposal.clientId || 0);
      const product = await this.getProduct(proposal.productId || 0);
      const convenio = await this.getConvenio(proposal.convenioId || 0);
      const bank = await this.getBank(proposal.bankId || 0);

      proposalsWithDetails.push({
        ...proposal,
        client,
        product,
        convenio,
        bank
      });
    }

    return proposalsWithDetails;
  }

  // Kanban operations
  async getKanbanEntries(): Promise<Kanban[]> {
    return Array.from(this.kanbanEntries.values());
  }

  async getKanbanEntry(id: number): Promise<Kanban | undefined> {
    return this.kanbanEntries.get(id);
  }

  async getKanbanEntryByClient(clientId: number): Promise<Kanban | undefined> {
    return Array.from(this.kanbanEntries.values()).find(
      entry => entry.clientId === clientId
    );
  }

  async createKanbanEntry(kanbanEntry: InsertKanban): Promise<Kanban> {
    const id = this.kanbanId++;
    const newEntry: Kanban = { ...kanbanEntry, id };
    this.kanbanEntries.set(id, newEntry);
    return newEntry;
  }

  async updateKanbanEntry(id: number, kanbanEntry: Partial<InsertKanban>): Promise<Kanban | undefined> {
    const existingEntry = this.kanbanEntries.get(id);
    if (!existingEntry) return undefined;

    const updatedEntry = { ...existingEntry, ...kanbanEntry };
    this.kanbanEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async updateClientKanbanColumn(clientId: number, column: string): Promise<Kanban | undefined> {
    const entry = await this.getKanbanEntryByClient(clientId);
    if (!entry) return undefined;

    const position = this.getNextPositionForColumn(column);
    const updatedEntry = { ...entry, column, position };
    this.kanbanEntries.set(entry.id, updatedEntry);
    return updatedEntry;
  }

  private getNextPositionForColumn(column: string): number {
    const entriesInColumn = Array.from(this.kanbanEntries.values()).filter(
      entry => entry.column === column
    );
    return entriesInColumn.length + 1;
  }
  
  // Métodos para lidar com clientes por criador e organização
  async getClientsByCreator(creatorId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      client => client.createdById === creatorId
    );
  }
  
  async getClientsByOrganization(organizationId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      client => client.organizationId === organizationId
    );
  }
  
  // Métodos para lidar com propostas por criador e organização
  async getProposalsByCreator(creatorId: number): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter(
      proposal => proposal.createdById === creatorId
    );
  }
  
  async getProposalsByOrganization(organizationId: number): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter(
      proposal => proposal.organizationId === organizationId
    );
  }
  
  // Métodos para lidar com usuários
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.email === email
    );
  }
  
  async createUser(user: RegisterUser): Promise<User> {
    const id = this.userId++;
    // Em um sistema real, a senha seria hasheada antes de ser armazenada
    const { password, ...userWithoutPassword } = user;
    const newUser: User = { 
      ...userWithoutPassword, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { 
      ...existingUser, 
      ...user, 
      updatedAt: new Date() 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getUsersInOrganization(organizationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.organizationId === organizationId
    );
  }
  
  // Métodos de autenticação
  async loginUser(email: string, password: string): Promise<AuthData | null> {
    // Em um sistema real, a senha seria hasheada e comparada com a senha hasheada armazenada
    const user = await this.getUserByEmail(email);
    
    // Simulando verificação de senha
    // Em um sistema real, usaríamos algo como bcrypt.compare(password, user.passwordHash)
    if (!user) return null;
    
    // Em um sistema real, geraríamos um token JWT válido
    const token = `token-${user.id}-${Date.now()}`;
    
    // Buscar a organização do usuário
    const organization = await this.getOrganizationById(user.organizationId || 0);
    
    return {
      token,
      user: {
        ...user,
        organization
      }
    };
  }
  
  async resetPassword(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;
    
    // Em um sistema real, geraríamos uma nova senha aleatória e enviaríamos por email
    // Aqui apenas simulamos o sucesso da operação
    return true;
  }
  
  // Métodos para lidar com organizações
  async getOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }
  
  async getOrganizationById(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }
  
  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const id = this.organizationId++;
    const newOrganization: Organization = { 
      ...organization, 
      id, 
      createdAt: new Date()
    };
    this.organizations.set(id, newOrganization);
    return newOrganization;
  }
  
  async updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const existingOrganization = this.organizations.get(id);
    if (!existingOrganization) return undefined;
    
    const updatedOrganization = { 
      ...existingOrganization, 
      ...organization 
    };
    this.organizations.set(id, updatedOrganization);
    return updatedOrganization;
  }
  
  async deleteOrganization(id: number): Promise<boolean> {
    return this.organizations.delete(id);
  }
  
  // Form Template operations
  async getFormTemplates(): Promise<FormTemplate[]> {
    return Array.from(this.formTemplates.values());
  }
  
  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    return this.formTemplates.get(id);
  }
  
  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const id = this.formTemplateId++;
    const newTemplate: FormTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: template.active ?? true
    };
    this.formTemplates.set(id, newTemplate);
    return newTemplate;
  }
  
  async updateFormTemplate(id: number, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    const existingTemplate = this.formTemplates.get(id);
    if (!existingTemplate) return undefined;
    
    const updatedTemplate = {
      ...existingTemplate,
      ...template,
      updatedAt: new Date()
    };
    this.formTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteFormTemplate(id: number): Promise<boolean> {
    // Também excluir todas as submissões relacionadas a este template
    const submissions = await this.getFormSubmissionsByTemplate(id);
    submissions.forEach(submission => {
      this.formSubmissions.delete(submission.id);
    });
    
    return this.formTemplates.delete(id);
  }
  
  async getFormTemplatesByOrganization(organizationId: number): Promise<FormTemplate[]> {
    return Array.from(this.formTemplates.values()).filter(
      template => template.organizationId === organizationId
    );
  }
  
  // Form Submission operations
  async getFormSubmissions(): Promise<FormSubmission[]> {
    return Array.from(this.formSubmissions.values());
  }
  
  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    return this.formSubmissions.get(id);
  }
  
  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    const id = this.formSubmissionId++;
    const newSubmission: FormSubmission = {
      ...submission,
      id,
      createdAt: new Date(),
      status: 'novo',
      processed: false,
      processedAt: null,
      processedById: null,
      clientId: null
    };
    this.formSubmissions.set(id, newSubmission);
    return newSubmission;
  }
  
  async updateFormSubmissionStatus(id: number, status: string, processedById?: number): Promise<FormSubmission | undefined> {
    const submission = this.formSubmissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission = {
      ...submission,
      status,
      processed: status === 'processado',
      processedAt: status === 'processado' ? new Date() : submission.processedAt,
      processedById: processedById || submission.processedById
    };
    
    this.formSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }
  
  async processFormSubmission(id: number, processedById: number): Promise<{client: Client, submission: FormSubmission} | undefined> {
    const submission = this.formSubmissions.get(id);
    if (!submission || submission.processed) return undefined;
    
    // Buscar o template do formulário para saber qual a coluna do kanban
    const template = this.formTemplates.get(submission.formTemplateId);
    if (!template) return undefined;
    
    // Extrair dados do cliente da submissão
    const clientData: InsertClient = {
      name: submission.data.nome || submission.data.name || 'Cliente sem nome',
      email: submission.data.email || null,
      phone: submission.data.telefone || submission.data.phone || null,
      cpf: submission.data.cpf || null,
      convenioId: null,
      birthDate: submission.data.data_nascimento || submission.data.birthDate || null,
      contact: submission.data.contato || null,
      company: submission.data.empresa || submission.data.company || null,
      organizationId: template.organizationId || 1,
      createdById: processedById
    };
    
    // Criar o cliente
    const client = await this.createClient(clientData);
    
    // Se o template tiver uma coluna do kanban definida, mover o cliente para essa coluna
    if (template.kanbanColumn) {
      await this.updateClientKanbanColumn(client.id, template.kanbanColumn);
    }
    
    // Atualizar a submissão para processada e com o ID do cliente
    const updatedSubmission = {
      ...submission,
      status: 'processado',
      processed: true,
      processedAt: new Date(),
      processedById,
      clientId: client.id
    };
    
    this.formSubmissions.set(id, updatedSubmission);
    
    return {
      client,
      submission: updatedSubmission
    };
  }
  
  async getFormSubmissionsByTemplate(templateId: number): Promise<FormSubmission[]> {
    return Array.from(this.formSubmissions.values()).filter(
      submission => submission.formTemplateId === templateId
    );
  }
  
  async getFormSubmissionsByStatus(status: string): Promise<FormSubmission[]> {
    return Array.from(this.formSubmissions.values()).filter(
      submission => submission.status === status
    );
  }
  
  async getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]> {
    // Primeiro, obter todos os templates da organização
    const templates = await this.getFormTemplatesByOrganization(organizationId);
    const templateIds = templates.map(template => template.id);
    
    // Depois, filtrar as submissões por esses templates
    return Array.from(this.formSubmissions.values()).filter(
      submission => templateIds.includes(submission.formTemplateId)
    );
  }
}

// Import das implementações de armazenamento
import { databaseStorage } from './DatabaseStorage';
import { supabaseStorage } from './storage-supabase';

// Importando o client do Baserow
import { baserowStorage } from './storage-baserow';

// Escolhendo qual armazenamento usar baseado na configuração de ambiente
// Para usar o Baserow, defina a variável de ambiente STORAGE_TYPE=baserow
const storageType = process.env.STORAGE_TYPE || 'database';

let selectedStorage;
if (storageType === 'baserow') {
  console.log('🔄 Usando BaserowStorage para armazenamento de dados');
  selectedStorage = baserowStorage;
} else if (storageType === 'supabase') {
  console.log('🔄 Usando SupabaseStorage para armazenamento de dados');
  selectedStorage = supabaseStorage;
} else {
  console.log('🔄 Usando DatabaseStorage para armazenamento de dados');
  selectedStorage = databaseStorage;
}

export const storage = selectedStorage;
