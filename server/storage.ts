import { 
  clients, 
  products, 
  convenios, 
  banks, 
  proposals, 
  kanban,
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
  type ProposalWithDetails
} from "@shared/schema";

export interface IStorage {
  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  getClientsWithKanban(): Promise<ClientWithKanban[]>;

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

  // Kanban operations
  getKanbanEntries(): Promise<Kanban[]>;
  getKanbanEntry(id: number): Promise<Kanban | undefined>;
  getKanbanEntryByClient(clientId: number): Promise<Kanban | undefined>;
  createKanbanEntry(kanbanEntry: InsertKanban): Promise<Kanban>;
  updateKanbanEntry(id: number, kanbanEntry: Partial<InsertKanban>): Promise<Kanban | undefined>;
  updateClientKanbanColumn(clientId: number, column: string): Promise<Kanban | undefined>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private products: Map<number, Product>;
  private convenios: Map<number, Convenio>;
  private banks: Map<number, Bank>;
  private proposals: Map<number, Proposal>;
  private kanbanEntries: Map<number, Kanban>;
  
  private clientId: number;
  private productId: number;
  private convenioId: number;
  private bankId: number;
  private proposalId: number;
  private kanbanId: number;

  constructor() {
    this.clients = new Map();
    this.products = new Map();
    this.convenios = new Map();
    this.banks = new Map();
    this.proposals = new Map();
    this.kanbanEntries = new Map();
    
    this.clientId = 1;
    this.productId = 1;
    this.convenioId = 1;
    this.bankId = 1;
    this.proposalId = 1;
    this.kanbanId = 1;

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
    const newProposal: Proposal = { ...proposal, id, createdAt: new Date() };
    this.proposals.set(id, newProposal);
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
}

export const storage = new MemStorage();
