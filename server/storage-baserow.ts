/**
 * Implementação de IStorage usando o Baserow como banco de dados
 */
import { IStorage } from './storage';
import { 
  User, InsertUser, Client, InsertClient, Product, InsertProduct,
  Proposal, InsertProposal, Convenio, InsertConvenio, Bank, InsertBank,
  Kanban, InsertKanban, Organization, InsertOrganization,
  ClientWithKanban, ProposalWithDetails, RegisterUser, AuthData,
  FormTemplate, InsertFormTemplate, FormSubmission, InsertFormSubmission, FormFieldType
} from '@shared/schema';
import { baserowClient } from './baserow-client';
import { compareSync, hashSync } from 'bcrypt';

// Type alias para dados do Baserow
type BaserowRow = Record<string, any>;

// Mapeamento de nomes de modelo para nomes de tabelas do Baserow
const TABLE_MAPPINGS = {
  users: 'usuarios',
  clients: 'clientes',
  products: 'produtos',
  proposals: 'propostas',
  convenios: 'convenios',
  banks: 'bancos',
  kanban: 'kanban',
  organizations: 'organizacoes'
};

// Mapeamento dos IDs das tabelas no Baserow (precisa ser configurado)
// Este objeto deve ser atualizado com os IDs corretos das tabelas após executar:
// tsx scripts/fetch-baserow-tables.ts <database_id>
const TABLE_IDS: Record<string, number> = {
  // Adicione aqui os IDs corretos quando estiverem disponíveis
  // Os IDs abaixo são exemplos e não funcionarão até serem substituídos
  usuarios: 123456,      // Substitua pelo ID real da tabela de usuários no Baserow
  clientes: 123457,      // Substitua pelo ID real da tabela de clientes no Baserow
  produtos: 123458,      // Substitua pelo ID real da tabela de produtos no Baserow
  propostas: 123459,     // Substitua pelo ID real da tabela de propostas no Baserow
  convenios: 123460,     // Substitua pelo ID real da tabela de convênios no Baserow
  bancos: 123461,        // Substitua pelo ID real da tabela de bancos no Baserow
  kanban: 123462,        // Substitua pelo ID real da tabela de kanban no Baserow
  organizacoes: 123463   // Substitua pelo ID real da tabela de organizações no Baserow
};

// Mapeamento de nomes de campo do modelo para nomes de campo do Baserow
const FIELD_MAPPINGS = {
  // Modelo Client para tabela clientes
  client: {
    id: 'id',
    name: 'nome',
    cpf: 'cpf',
    phone: 'telefone',
    address: 'endereco',
    email: 'email',
    status: 'status',
    createdAt: 'data_criacao',
    creatorId: 'criador_id',
    organizationId: 'organizacao_id',
    notes: 'observacoes',
    convenioId: 'convenio_id',
    rg: 'rg',
    birthDate: 'data_nascimento',
    profession: 'profissao',
    income: 'renda',
    maritalStatus: 'estado_civil',
    nationality: 'nacionalidade',
    naturalness: 'naturalidade',
    motherName: 'nome_mae',
    fatherName: 'nome_pai',
    bankAccount: 'conta_bancaria',
    bankBranch: 'agencia_bancaria',
    bankName: 'nome_banco',
    pix: 'pix'
  },
  
  // Modelo Product para tabela produtos
  product: {
    id: 'id',
    name: 'nome',
    description: 'descricao'
  },
  
  // Modelo Convenio para tabela convenios
  convenio: {
    id: 'id',
    name: 'nome',
    description: 'descricao'
  },
  
  // Modelo Bank para tabela bancos
  bank: {
    id: 'id',
    name: 'nome',
    description: 'descricao'
  },
  
  // Modelo Proposal para tabela propostas
  proposal: {
    id: 'id',
    clientId: 'cliente_id',
    productId: 'produto_id',
    bankId: 'banco_id',
    value: 'valor',
    installments: 'parcelas',
    installmentValue: 'valor_parcela',
    status: 'status',
    createdAt: 'data_criacao',
    creatorId: 'criador_id',
    organizationId: 'organizacao_id',
    notes: 'observacoes',
    contractNumber: 'numero_contrato',
    disbursementDate: 'data_liberacao'
  },
  
  // Modelo Kanban para tabela kanban
  kanban: {
    id: 'id',
    clientId: 'cliente_id',
    column: 'coluna',
    position: 'posicao'
  },
  
  // Modelo User para tabela usuarios
  user: {
    id: 'id',
    name: 'nome',
    email: 'email',
    password: 'senha',
    role: 'papel',
    status: 'status',
    createdAt: 'data_criacao',
    organizationId: 'organizacao_id'
  },
  
  // Modelo Organization para tabela organizacoes
  organization: {
    id: 'id',
    name: 'nome',
    description: 'descricao',
    status: 'status',
    createdAt: 'data_criacao'
  }
};

export class BaserowStorage implements IStorage {
  constructor() {
    console.log('📦 Inicializando BaserowStorage com Baserow API');
    // Configurar os mapeamentos de IDs de tabela
    baserowClient.setTableMappings(TABLE_IDS);
    
    // Inicializar dados padrão se necessário
    this.initializeDefaultData().catch(err => {
      console.error('Erro ao inicializar dados padrão:', err);
    });
  }

  /**
   * Inicializa dados padrão se necessário
   */
  private async initializeDefaultData() {
    try {
      // Verificar se há produtos cadastrados
      const products = await this.getProducts();
      if (products.length === 0) {
        console.log('Inicializando produtos padrão...');
        const defaultProducts = [
          { name: 'Novo empréstimo', description: 'Novo contrato de empréstimo' },
          { name: 'Refinanciamento', description: 'Refinanciamento de contrato existente' },
          { name: 'Portabilidade', description: 'Transferência de contrato entre instituições' },
          { name: 'Cartão de Crédito', description: 'Emissão de novo cartão de crédito' },
          { name: 'Saque FGTS', description: 'Antecipação do saque aniversário do FGTS' }
        ];
        
        for (const product of defaultProducts) {
          await this.createProduct(product);
        }
      }

      // Verificar se há convênios cadastrados
      const convenios = await this.getConvenios();
      if (convenios.length === 0) {
        console.log('Inicializando convênios padrão...');
        const defaultConvenios = [
          { name: 'Beneficiário do INSS', description: 'Convênio para aposentados e pensionistas do INSS' },
          { name: 'Servidor Público', description: 'Convênio para servidores públicos' },
          { name: 'LOAS/BPC', description: 'Convênio para beneficiários do LOAS/BPC' },
          { name: 'Carteira assinada CLT', description: 'Convênio para trabalhadores com carteira assinada' }
        ];
        
        for (const convenio of defaultConvenios) {
          await this.createConvenio(convenio);
        }
      }

      // Verificar se há bancos cadastrados
      const banks = await this.getBanks();
      if (banks.length === 0) {
        console.log('Inicializando bancos padrão...');
        const defaultBanks = [
          { name: 'BANRISUL', description: 'Banco do Estado do Rio Grande do Sul' },
          { name: 'BMG', description: 'Banco BMG' },
          { name: 'C6 BANK', description: 'C6 Bank' },
          { name: 'CAIXA', description: 'Caixa Econômica Federal' },
          { name: 'CETELEM', description: 'Banco Cetelem' },
          { name: 'DAYCOVAL', description: 'Banco Daycoval' },
          { name: 'FACTA', description: 'Banco Facta' },
          { name: 'ITAU', description: 'Banco Itaú' },
          { name: 'MERCANTIL', description: 'Banco Mercantil' },
          { name: 'OLÉ CONSIGNADO', description: 'Olé Consignado' },
          { name: 'PAN', description: 'Banco Pan' },
          { name: 'SAFRA', description: 'Banco Safra' },
          { name: 'SANTANDER', description: 'Banco Santander' }
        ];
        
        for (const bank of defaultBanks) {
          await this.createBank(bank);
        }
      }

      // Verificar se há organizações cadastradas
      const organizations = await this.getOrganizations();
      if (organizations.length === 0) {
        console.log('Inicializando organização padrão...');
        const defaultOrg = {
          name: 'Empresa Demo',
          description: 'Organização demonstrativa',
          status: 'ativo'
        };
        
        const org = await this.createOrganization(defaultOrg);
        
        // Criar usuário admin para a organização
        const users = await this.getUsers();
        if (users.length === 0) {
          console.log('Inicializando usuário administrador...');
          await this.createUser({
            name: 'Administrador',
            email: 'admin@empresa.com',
            password: hashSync('senha123', 10),
            role: 'admin',
            organizationId: org.id,
            status: 'ativo'
          });
        }
      }
      
      console.log('Inicialização de dados padrão concluída!');
    } catch (error) {
      console.error('Erro ao inicializar dados padrão:', error);
    }
  }

  // IMPLEMENTAÇÕES DE CLIENTES
  async getClients(): Promise<Client[]> {
    console.log('Baserow: Buscando todos os clientes');
    const rows = await baserowClient.listRows(TABLE_MAPPINGS.clients);
    return rows.map(this.mapBaserowToClient);
  }

  async getClient(id: number): Promise<Client | undefined> {
    console.log(`Baserow: Buscando cliente ${id}`);
    const row = await baserowClient.getRow(TABLE_MAPPINGS.clients, id);
    return row ? this.mapBaserowToClient(row) : undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    console.log('Baserow: Criando novo cliente');
    const data = this.mapClientToBaserow(client);
    const row = await baserowClient.createRow(TABLE_MAPPINGS.clients, data);
    
    // Criar entrada no kanban automaticamente
    const kanbanEntry: InsertKanban = {
      clientId: row.id,
      column: 'novo',
      position: await this.getNextPositionForColumn('novo')
    };
    
    await this.createKanbanEntry(kanbanEntry);
    
    return this.mapBaserowToClient(row);
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    console.log(`Baserow: Atualizando cliente ${id}`);
    const data = this.mapClientToBaserow(client as InsertClient, true);
    const row = await baserowClient.updateRow(TABLE_MAPPINGS.clients, id, data);
    return this.mapBaserowToClient(row);
  }

  async deleteClient(id: number): Promise<boolean> {
    console.log(`Baserow: Deletando cliente ${id}`);
    // Primeiro, tentar deletar a entrada do kanban
    const kanban = await this.getKanbanEntryByClient(id);
    if (kanban) {
      await baserowClient.deleteRow(TABLE_MAPPINGS.kanban, kanban.id);
    }
    
    return baserowClient.deleteRow(TABLE_MAPPINGS.clients, id);
  }

  async getClientsWithKanban(): Promise<ClientWithKanban[]> {
    console.log('Baserow: Buscando clientes com dados de kanban');
    const clients = await this.getClients();
    const kanbanEntries = await this.getKanbanEntries();
    
    return clients.map(client => {
      const kanban = kanbanEntries.find(k => k.clientId === client.id);
      return {
        ...client,
        kanban: kanban || { id: 0, clientId: client.id, column: 'novo', position: 0 }
      };
    });
  }

  // IMPLEMENTAÇÕES DE PRODUTOS
  async getProducts(): Promise<Product[]> {
    console.log('Baserow: Buscando todos os produtos');
    const rows = await baserowClient.listRows(TABLE_MAPPINGS.products);
    return rows.map(this.mapBaserowToProduct);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    console.log(`Baserow: Buscando produto ${id}`);
    const row = await baserowClient.getRow(TABLE_MAPPINGS.products, id);
    return row ? this.mapBaserowToProduct(row) : undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    console.log('Baserow: Criando novo produto');
    const data = this.mapProductToBaserow(product);
    const row = await baserowClient.createRow(TABLE_MAPPINGS.products, data);
    return this.mapBaserowToProduct(row);
  }

  // IMPLEMENTAÇÕES DE CONVÊNIOS
  async getConvenios(): Promise<Convenio[]> {
    console.log('Baserow: Buscando todos os convênios');
    const rows = await baserowClient.listRows(TABLE_MAPPINGS.convenios);
    return rows.map(this.mapBaserowToConvenio);
  }

  async getConvenio(id: number): Promise<Convenio | undefined> {
    console.log(`Baserow: Buscando convênio ${id}`);
    const row = await baserowClient.getRow(TABLE_MAPPINGS.convenios, id);
    return row ? this.mapBaserowToConvenio(row) : undefined;
  }

  async createConvenio(convenio: InsertConvenio): Promise<Convenio> {
    console.log('Baserow: Criando novo convênio');
    const data = this.mapConvenioToBaserow(convenio);
    const row = await baserowClient.createRow(TABLE_MAPPINGS.convenios, data);
    return this.mapBaserowToConvenio(row);
  }

  // IMPLEMENTAÇÕES DE BANCOS
  async getBanks(): Promise<Bank[]> {
    console.log('Baserow: Buscando todos os bancos');
    const rows = await baserowClient.listRows(TABLE_MAPPINGS.banks);
    return rows.map(this.mapBaserowToBank);
  }

  async getBank(id: number): Promise<Bank | undefined> {
    console.log(`Baserow: Buscando banco ${id}`);
    const row = await baserowClient.getRow(TABLE_MAPPINGS.banks, id);
    return row ? this.mapBaserowToBank(row) : undefined;
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    console.log('Baserow: Criando novo banco');
    const data = this.mapBankToBaserow(bank);
    const row = await baserowClient.createRow(TABLE_MAPPINGS.banks, data);
    return this.mapBaserowToBank(row);
  }

  // IMPLEMENTAÇÕES DE PROPOSTAS
  async getProposals(): Promise<Proposal[]> {
    console.log('Baserow: Buscando todas as propostas');
    const rows = await baserowClient.listRows(TABLE_MAPPINGS.proposals);
    return rows.map(this.mapBaserowToProposal);
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    console.log(`Baserow: Buscando proposta ${id}`);
    const row = await baserowClient.getRow(TABLE_MAPPINGS.proposals, id);
    return row ? this.mapBaserowToProposal(row) : undefined;
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    console.log('Baserow: Criando nova proposta');
    const data = this.mapProposalToBaserow(proposal);
    const row = await baserowClient.createRow(TABLE_MAPPINGS.proposals, data);
    return this.mapBaserowToProposal(row);
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    console.log(`Baserow: Atualizando proposta ${id}`);
    const data = this.mapProposalToBaserow(proposal as InsertProposal, true);
    const row = await baserowClient.updateRow(TABLE_MAPPINGS.proposals, id, data);
    return this.mapBaserowToProposal(row);
  }

  async deleteProposal(id: number): Promise<boolean> {
    console.log(`Baserow: Deletando proposta ${id}`);
    return baserowClient.deleteRow(TABLE_MAPPINGS.proposals, id);
  }

  async getProposalsByClient(clientId: number): Promise<Proposal[]> {
    console.log(`Baserow: Buscando propostas do cliente ${clientId}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.proposals, 'client_id', clientId);
    return rows.map(this.mapBaserowToProposal);
  }

  async getProposalsByProduct(productId: number): Promise<Proposal[]> {
    console.log(`Baserow: Buscando propostas do produto ${productId}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.proposals, 'product_id', productId);
    return rows.map(this.mapBaserowToProposal);
  }

  async getProposalsByValue(minValue: number, maxValue?: number): Promise<Proposal[]> {
    console.log(`Baserow: Buscando propostas por valor entre ${minValue} e ${maxValue || 'infinito'}`);
    const proposals = await this.getProposals();
    return proposals.filter(p => {
      return p.value >= minValue && (maxValue === undefined || p.value <= maxValue);
    });
  }

  async getProposalsByStatus(status: string): Promise<Proposal[]> {
    console.log(`Baserow: Buscando propostas com status ${status}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.proposals, 'status', status);
    return rows.map(this.mapBaserowToProposal);
  }

  async getProposalsWithDetails(): Promise<ProposalWithDetails[]> {
    console.log('Baserow: Buscando propostas com detalhes');
    const proposals = await this.getProposals();
    const clients = await this.getClients();
    const products = await this.getProducts();
    const banks = await this.getBanks();
    
    return Promise.all(proposals.map(async p => {
      const client = clients.find(c => c.id === p.clientId);
      const product = products.find(prod => prod.id === p.productId);
      const bank = banks.find(b => b.id === p.bankId);
      
      return {
        ...p,
        clientName: client?.name || 'Cliente não encontrado',
        productName: product?.name || 'Produto não encontrado',
        bankName: bank?.name || 'Banco não encontrado'
      };
    }));
  }

  // IMPLEMENTAÇÕES DE KANBAN
  async getKanbanEntries(): Promise<Kanban[]> {
    console.log('Baserow: Buscando todas as entradas de kanban');
    const rows = await baserowClient.listRows(TABLE_MAPPINGS.kanban);
    return rows.map(this.mapBaserowToKanban);
  }

  async getKanbanEntry(id: number): Promise<Kanban | undefined> {
    console.log(`Baserow: Buscando entrada de kanban ${id}`);
    const row = await baserowClient.getRow(TABLE_MAPPINGS.kanban, id);
    return row ? this.mapBaserowToKanban(row) : undefined;
  }

  async getKanbanEntryByClient(clientId: number): Promise<Kanban | undefined> {
    console.log(`Baserow: Buscando entrada de kanban do cliente ${clientId}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.kanban, 'client_id', clientId);
    return rows.length > 0 ? this.mapBaserowToKanban(rows[0]) : undefined;
  }

  async createKanbanEntry(kanbanEntry: InsertKanban): Promise<Kanban> {
    console.log('Baserow: Criando nova entrada de kanban');
    const data = this.mapKanbanToBaserow(kanbanEntry);
    const row = await baserowClient.createRow(TABLE_MAPPINGS.kanban, data);
    return this.mapBaserowToKanban(row);
  }

  async updateKanbanEntry(id: number, kanbanEntry: Partial<InsertKanban>): Promise<Kanban | undefined> {
    console.log(`Baserow: Atualizando entrada de kanban ${id}`);
    const data = this.mapKanbanToBaserow(kanbanEntry as InsertKanban, true);
    const row = await baserowClient.updateRow(TABLE_MAPPINGS.kanban, id, data);
    return this.mapBaserowToKanban(row);
  }

  async updateClientKanbanColumn(clientId: number, column: string): Promise<Kanban | undefined> {
    console.log(`Baserow: Movendo cliente ${clientId} para coluna ${column}`);
    const kanban = await this.getKanbanEntryByClient(clientId);
    
    if (!kanban) {
      console.log(`Nenhuma entrada de kanban encontrada para o cliente ${clientId}`);
      return undefined;
    }
    
    const position = await this.getNextPositionForColumn(column);
    return this.updateKanbanEntry(kanban.id, { column, position });
  }

  private async getNextPositionForColumn(column: string): Promise<number> {
    const kanbanEntries = await this.getKanbanEntries();
    const columnEntries = kanbanEntries.filter(k => k.column === column);
    
    if (columnEntries.length === 0) {
      return 0;
    }
    
    const maxPosition = Math.max(...columnEntries.map(k => k.position));
    return maxPosition + 1;
  }

  // IMPLEMENTAÇÕES DE CONSULTAS RELACIONADAS
  async getClientsByCreator(creatorId: number): Promise<Client[]> {
    console.log(`Baserow: Buscando clientes criados pelo usuário ${creatorId}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.clients, 'creator_id', creatorId);
    return rows.map(this.mapBaserowToClient);
  }

  async getClientsByOrganization(organizationId: number): Promise<Client[]> {
    console.log(`Baserow: Buscando clientes da organização ${organizationId}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.clients, 'organization_id', organizationId);
    return rows.map(this.mapBaserowToClient);
  }

  async getProposalsByCreator(creatorId: number): Promise<Proposal[]> {
    console.log(`Baserow: Buscando propostas criadas pelo usuário ${creatorId}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.proposals, 'creator_id', creatorId);
    return rows.map(this.mapBaserowToProposal);
  }

  async getProposalsByOrganization(organizationId: number): Promise<Proposal[]> {
    console.log(`Baserow: Buscando propostas da organização ${organizationId}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.proposals, 'organization_id', organizationId);
    return rows.map(this.mapBaserowToProposal);
  }

  // IMPLEMENTAÇÕES DE USUÁRIOS
  async getUsers(): Promise<User[]> {
    console.log('Baserow: Buscando todos os usuários');
    const rows = await baserowClient.listRows(TABLE_MAPPINGS.users);
    return rows.map(this.mapBaserowToUser);
  }

  async getUserById(id: number): Promise<User | undefined> {
    console.log(`Baserow: Buscando usuário ${id}`);
    const row = await baserowClient.getRow(TABLE_MAPPINGS.users, id);
    return row ? this.mapBaserowToUser(row) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log(`Baserow: Buscando usuário por email ${email}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.users, 'email', email);
    return rows.length > 0 ? this.mapBaserowToUser(rows[0]) : undefined;
  }

  async createUser(user: RegisterUser): Promise<User> {
    console.log('Baserow: Criando novo usuário');
    // Verificar se já existe um usuário com este email
    const existingUser = await this.getUserByEmail(user.email);
    if (existingUser) {
      throw new Error('Usuário com este email já existe');
    }
    
    const data = this.mapUserToBaserow(user);
    const row = await baserowClient.createRow(TABLE_MAPPINGS.users, data);
    return this.mapBaserowToUser(row);
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    console.log(`Baserow: Atualizando usuário ${id}`);
    const data = this.mapUserToBaserow(userData as InsertUser, true);
    const row = await baserowClient.updateRow(TABLE_MAPPINGS.users, id, data);
    return this.mapBaserowToUser(row);
  }

  async deleteUser(id: number): Promise<boolean> {
    console.log(`Baserow: Deletando usuário ${id}`);
    return baserowClient.deleteRow(TABLE_MAPPINGS.users, id);
  }

  async getUsersInOrganization(organizationId: number): Promise<User[]> {
    console.log(`Baserow: Buscando usuários da organização ${organizationId}`);
    const rows = await baserowClient.searchRows(TABLE_MAPPINGS.users, 'organization_id', organizationId);
    return rows.map(this.mapBaserowToUser);
  }

  async loginUser(email: string, password: string): Promise<AuthData | null> {
    console.log(`Baserow: Tentando login para usuário ${email}`);
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      console.log(`Usuário ${email} não encontrado`);
      return null;
    }
    
    const passwordMatches = compareSync(password, user.password);
    if (!passwordMatches) {
      console.log(`Senha incorreta para usuário ${email}`);
      return null;
    }
    
    console.log(`Login bem-sucedido para usuário ${email}`);
    return { user };
  }

  async resetPassword(email: string): Promise<boolean> {
    console.log(`Baserow: Resetando senha para usuário ${email}`);
    // Implementação simplificada: apenas verifica se o usuário existe
    const user = await this.getUserByEmail(email);
    return !!user;
  }

  // IMPLEMENTAÇÕES DE ORGANIZAÇÕES
  async getOrganizations(): Promise<Organization[]> {
    console.log('Baserow: Buscando todas as organizações');
    const rows = await baserowClient.listRows(TABLE_MAPPINGS.organizations);
    return rows.map(this.mapBaserowToOrganization);
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    console.log(`Baserow: Buscando organização ${id}`);
    const row = await baserowClient.getRow(TABLE_MAPPINGS.organizations, id);
    return row ? this.mapBaserowToOrganization(row) : undefined;
  }

  async createOrganization(organizationData: InsertOrganization): Promise<Organization> {
    console.log('Baserow: Criando nova organização');
    const data = this.mapOrganizationToBaserow(organizationData);
    const row = await baserowClient.createRow(TABLE_MAPPINGS.organizations, data);
    return this.mapBaserowToOrganization(row);
  }

  async updateOrganization(id: number, organizationData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    console.log(`Baserow: Atualizando organização ${id}`);
    const data = this.mapOrganizationToBaserow(organizationData as InsertOrganization, true);
    const row = await baserowClient.updateRow(TABLE_MAPPINGS.organizations, id, data);
    return this.mapBaserowToOrganization(row);
  }

  async deleteOrganization(id: number): Promise<boolean> {
    console.log(`Baserow: Deletando organização ${id}`);
    return baserowClient.deleteRow(TABLE_MAPPINGS.organizations, id);
  }

  // Conversores de modelos do Baserow para modelos da aplicação
  private mapBaserowToClient(row: any): Client {
    const fields = FIELD_MAPPINGS.client;
    return {
      id: row.id,
      name: row[fields.name] || '',
      cpf: row[fields.cpf] || '',
      phone: row[fields.phone] || '',
      address: row[fields.address] || '',
      email: row[fields.email] || '',
      status: row[fields.status] || 'ativo',
      createdAt: new Date(row[fields.createdAt] || Date.now()),
      creatorId: row[fields.creatorId] || 0,
      organizationId: row[fields.organizationId] || 0,
      notes: row[fields.notes] || '',
      convenioId: row[fields.convenioId] || 0,
      rg: row[fields.rg] || '',
      birthDate: row[fields.birthDate] ? new Date(row[fields.birthDate]) : new Date(),
      profession: row[fields.profession] || '',
      income: row[fields.income] || 0,
      maritalStatus: row[fields.maritalStatus] || '',
      nationality: row[fields.nationality] || 'Brasileiro(a)',
      naturalness: row[fields.naturalness] || '',
      motherName: row[fields.motherName] || '',
      fatherName: row[fields.fatherName] || '',
      bankAccount: row[fields.bankAccount] || '',
      bankBranch: row[fields.bankBranch] || '',
      bankName: row[fields.bankName] || '',
      pix: row[fields.pix] || ''
    };
  }

  private mapClientToBaserow(client: InsertClient, isUpdate: boolean = false): Record<string, any> {
    const fields = FIELD_MAPPINGS.client;
    const data: Record<string, any> = {};
    
    // Mapear os campos usando o FIELD_MAPPINGS
    data[fields.name] = client.name;
    data[fields.cpf] = client.cpf;
    data[fields.phone] = client.phone;
    data[fields.address] = client.address;
    data[fields.email] = client.email;
    data[fields.status] = client.status;
    data[fields.creatorId] = client.creatorId;
    data[fields.organizationId] = client.organizationId;
    data[fields.notes] = client.notes;
    data[fields.convenioId] = client.convenioId;
    data[fields.rg] = client.rg;
    data[fields.birthDate] = client.birthDate?.toISOString();
    data[fields.profession] = client.profession;
    data[fields.income] = client.income;
    data[fields.maritalStatus] = client.maritalStatus;
    data[fields.nationality] = client.nationality;
    data[fields.naturalness] = client.naturalness;
    data[fields.motherName] = client.motherName;
    data[fields.fatherName] = client.fatherName;
    data[fields.bankAccount] = client.bankAccount;
    data[fields.bankBranch] = client.bankBranch;
    data[fields.bankName] = client.bankName;
    data[fields.pix] = client.pix;

    if (!isUpdate) {
      data.data_criacao = new Date().toISOString();
    }

    return data;
  }

  private mapBaserowToProduct(row: any): Product {
    const fields = FIELD_MAPPINGS.product;
    return {
      id: row.id,
      name: row[fields.name] || '',
      description: row[fields.description] || ''
    };
  }

  private mapProductToBaserow(product: InsertProduct): Record<string, any> {
    const fields = FIELD_MAPPINGS.product;
    const data: Record<string, any> = {};
    
    data[fields.name] = product.name;
    data[fields.description] = product.description;
    
    return data;
  }

  private mapBaserowToConvenio(row: any): Convenio {
    const fields = FIELD_MAPPINGS.convenio;
    return {
      id: row.id,
      name: row[fields.name] || '',
      description: row[fields.description] || ''
    };
  }

  private mapConvenioToBaserow(convenio: InsertConvenio): Record<string, any> {
    const fields = FIELD_MAPPINGS.convenio;
    const data: Record<string, any> = {};
    
    data[fields.name] = convenio.name;
    data[fields.description] = convenio.description;
    
    return data;
  }

  private mapBaserowToBank(row: any): Bank {
    const fields = FIELD_MAPPINGS.bank;
    return {
      id: row.id,
      name: row[fields.name] || '',
      description: row[fields.description] || ''
    };
  }

  private mapBankToBaserow(bank: InsertBank): Record<string, any> {
    const fields = FIELD_MAPPINGS.bank;
    const data: Record<string, any> = {};
    
    data[fields.name] = bank.name;
    data[fields.description] = bank.description;
    
    return data;
  }

  private mapBaserowToProposal(row: BaserowRow): Proposal {
    return {
      id: row.id,
      clientId: row.cliente_id || 0,
      productId: row.produto_id || 0,
      bankId: row.banco_id || 0,
      value: row.valor || 0,
      installments: row.parcelas || 0,
      installmentValue: row.valor_parcela || 0,
      status: row.status || 'em_negociacao',
      createdAt: new Date(row.data_criacao || Date.now()),
      creatorId: row.criador_id || 0,
      organizationId: row.organizacao_id || 0,
      notes: row.observacoes || '',
      contractNumber: row.numero_contrato || '',
      disbursementDate: row.data_liberacao ? new Date(row.data_liberacao) : undefined
    };
  }

  private mapProposalToBaserow(proposal: InsertProposal, isUpdate: boolean = false): Record<string, any> {
    const data: Record<string, any> = {
      cliente_id: proposal.clientId,
      produto_id: proposal.productId,
      banco_id: proposal.bankId,
      valor: proposal.value,
      parcelas: proposal.installments,
      valor_parcela: proposal.installmentValue,
      status: proposal.status,
      criador_id: proposal.creatorId,
      organizacao_id: proposal.organizationId,
      observacoes: proposal.notes,
      numero_contrato: proposal.contractNumber,
      data_liberacao: proposal.disbursementDate?.toISOString()
    };

    if (!isUpdate) {
      data.data_criacao = new Date().toISOString();
    }

    return data;
  }

  private mapBaserowToKanban(row: BaserowRow): Kanban {
    return {
      id: row.id,
      clientId: row.cliente_id || 0,
      column: row.coluna || 'novo',
      position: row.posicao || 0
    };
  }

  private mapKanbanToBaserow(kanban: InsertKanban): Record<string, any> {
    return {
      cliente_id: kanban.clientId,
      coluna: kanban.column,
      posicao: kanban.position
    };
  }

  private mapBaserowToUser(row: BaserowRow): User {
    return {
      id: row.id,
      name: row.nome || '',
      email: row.email || '',
      password: row.senha || '',
      role: row.papel || 'agente',
      status: row.status || 'ativo',
      createdAt: new Date(row.data_criacao || Date.now()),
      organizationId: row.organizacao_id || 0
    };
  }

  private mapUserToBaserow(user: InsertUser | RegisterUser, isUpdate: boolean = false): Record<string, any> {
    const data: Record<string, any> = {
      nome: user.name,
      email: user.email,
      senha: user.password,
      papel: user.role,
      status: user.status,
      organizacao_id: user.organizationId
    };

    if (!isUpdate) {
      data.data_criacao = new Date().toISOString();
    }

    return data;
  }

  private mapBaserowToOrganization(row: BaserowRow): Organization {
    return {
      id: row.id,
      name: row.nome || '',
      description: row.descricao || '',
      status: row.status || 'ativo',
      createdAt: new Date(row.data_criacao || Date.now())
    };
  }

  private mapOrganizationToBaserow(org: InsertOrganization, isUpdate: boolean = false): Record<string, any> {
    const data: Record<string, any> = {
      nome: org.name,
      descricao: org.description,
      status: org.status
    };

    if (!isUpdate) {
      data.data_criacao = new Date().toISOString();
    }

    return data;
  }

  // ==================
  // Form Template methods
  // ==================
  
  async getFormTemplates(): Promise<FormTemplate[]> {
    throw new Error("Método getFormTemplates não implementado em BaserowStorage");
  }

  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    throw new Error("Método getFormTemplate não implementado em BaserowStorage");
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    throw new Error("Método createFormTemplate não implementado em BaserowStorage");
  }

  async updateFormTemplate(id: number, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    throw new Error("Método updateFormTemplate não implementado em BaserowStorage");
  }

  async deleteFormTemplate(id: number): Promise<boolean> {
    throw new Error("Método deleteFormTemplate não implementado em BaserowStorage");
  }

  async getFormTemplatesByOrganization(organizationId: number): Promise<FormTemplate[]> {
    throw new Error("Método getFormTemplatesByOrganization não implementado em BaserowStorage");
  }
  
  // ==================
  // Form Submission methods
  // ==================
  
  async getFormSubmissions(): Promise<FormSubmission[]> {
    throw new Error("Método getFormSubmissions não implementado em BaserowStorage");
  }

  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    throw new Error("Método getFormSubmission não implementado em BaserowStorage");
  }

  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    throw new Error("Método createFormSubmission não implementado em BaserowStorage");
  }

  async updateFormSubmissionStatus(id: number, status: string, processedById?: number): Promise<FormSubmission | undefined> {
    throw new Error("Método updateFormSubmissionStatus não implementado em BaserowStorage");
  }

  async processFormSubmission(id: number, processedById: number): Promise<{client: Client, submission: FormSubmission} | undefined> {
    throw new Error("Método processFormSubmission não implementado em BaserowStorage");
  }

  async getFormSubmissionsByTemplate(templateId: number): Promise<FormSubmission[]> {
    throw new Error("Método getFormSubmissionsByTemplate não implementado em BaserowStorage");
  }

  async getFormSubmissionsByStatus(status: string): Promise<FormSubmission[]> {
    throw new Error("Método getFormSubmissionsByStatus não implementado em BaserowStorage");
  }

  async getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]> {
    throw new Error("Método getFormSubmissionsByOrganization não implementado em BaserowStorage");
  }
}

// Exporta a instância da classe
export const baserowStorage = new BaserowStorage();