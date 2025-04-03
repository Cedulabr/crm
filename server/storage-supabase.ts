import { supabase } from './supabase';
import type { IStorage } from './storage';
import {
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
  UserWithOrganization,
  AuthData,
  FormTemplate,
  InsertFormTemplate,
  FormSubmission,
  InsertFormSubmission,
  FormFieldType
} from '@shared/schema';

export class SupabaseStorage implements IStorage {
  // Cliente
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*');
    
    if (error) throw error;
    
    return data.map(client => ({
      id: client.id,
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      convenioId: client.convenio_id,
      birthDate: client.birth_date,
      contact: client.contact,
      email: client.email,
      company: client.company,
      createdById: client.created_by_id,
      organizationId: client.organization_id,
      createdAt: client.created_at ? new Date(client.created_at) : null
    }));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // PGRST116 - não encontrado
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      cpf: data.cpf,
      phone: data.phone,
      convenioId: data.convenio_id,
      birthDate: data.birth_date,
      contact: data.contact,
      email: data.email,
      company: data.company,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }

  async createClient(client: InsertClient): Promise<Client> {
    console.log('Tentando criar cliente:', { 
      name: client.name, 
      email: client.email,
      createdById: client.createdById,
      organizationId: client.organizationId
    });
    
    // Transformando de camelCase para snake_case
    const clientData = {
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      convenio_id: client.convenioId ? parseInt(client.convenioId.toString()) : null,
      birth_date: client.birthDate,
      contact: client.contact,
      email: client.email,
      company: client.company,
      created_by_id: client.createdById,
      organization_id: client.organizationId,
      created_at: new Date().toISOString()
    };
    
    console.log('Dados para inserção do cliente:', clientData);
    
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Retorna o cliente com a transformação de snake_case para camelCase
    const newClient: Client = {
      id: data.id,
      name: data.name,
      cpf: data.cpf,
      phone: data.phone,
      convenioId: data.convenio_id,
      birthDate: data.birth_date,
      contact: data.contact,
      email: data.email,
      company: data.company,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
    
    // Cria entrada no kanban
    await this.createKanbanEntry({
      clientId: newClient.id,
      column: 'lead',
      position: await this.getNextPositionForColumn('lead')
    });
    
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    // Verificar se o cliente existe
    const existingClient = await this.getClient(id);
    if (!existingClient) return undefined;
    
    // Atualizar cliente
    const { data, error } = await supabase
      .from('clients')
      .update({
        name: client.name,
        cpf: client.cpf,
        phone: client.phone,
        convenio_id: client.convenioId ? parseInt(client.convenioId.toString()) : existingClient.convenioId,
        birth_date: client.birthDate,
        contact: client.contact,
        email: client.email,
        company: client.company,
        created_by_id: client.createdById ?? existingClient.createdById,
        organization_id: client.organizationId ?? existingClient.organizationId
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      cpf: data.cpf,
      phone: data.phone,
      convenioId: data.convenio_id,
      birthDate: data.birth_date,
      contact: data.contact,
      email: data.email,
      company: data.company,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }

  async deleteClient(id: number): Promise<boolean> {
    // Primeiro verificar se o cliente existe
    const client = await this.getClient(id);
    if (!client) return false;
    
    // Remover entradas de kanban relacionadas
    const kanban = await this.getKanbanEntryByClient(id);
    if (kanban) {
      await supabase
        .from('kanban')
        .delete()
        .eq('client_id', id);
    }
    
    // Remover propostas relacionadas
    await supabase
      .from('proposals')
      .delete()
      .eq('client_id', id);
    
    // Remover o cliente
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  }

  async getClientsWithKanban(): Promise<ClientWithKanban[]> {
    // Buscar clientes
    const clients = await this.getClients();
    
    // Para cada cliente, buscar a entrada kanban e contagem de propostas
    const result = await Promise.all(clients.map(async (client) => {
      const kanban = await this.getKanbanEntryByClient(client.id);
      const proposals = await this.getProposalsByClient(client.id);
      
      // Calcular o valor total das propostas
      const totalValue = proposals.reduce((sum, proposal) => {
        if (proposal.value) {
          return sum + Number(proposal.value);
        }
        return sum;
      }, 0);
      
      return {
        ...client,
        kanban,
        proposalCount: proposals.length,
        totalValue: totalValue > 0 ? totalValue.toString() : null
      };
    }));
    
    return result;
  }

  // Produtos
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) throw error;
    
    return data.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price
    }));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      price: data.price
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        price: product.price
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      price: data.price
    };
  }

  // Convênios
  async getConvenios(): Promise<Convenio[]> {
    const { data, error } = await supabase
      .from('convenios')
      .select('*');
    
    if (error) throw error;
    
    return data.map(convenio => ({
      id: convenio.id,
      name: convenio.name,
      price: convenio.price
    }));
  }

  async getConvenio(id: number): Promise<Convenio | undefined> {
    const { data, error } = await supabase
      .from('convenios')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      price: data.price
    };
  }

  async createConvenio(convenio: InsertConvenio): Promise<Convenio> {
    const { data, error } = await supabase
      .from('convenios')
      .insert({
        name: convenio.name,
        price: convenio.price
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      price: data.price
    };
  }

  // Bancos
  async getBanks(): Promise<Bank[]> {
    const { data, error } = await supabase
      .from('banks')
      .select('*');
    
    if (error) throw error;
    
    return data.map(bank => ({
      id: bank.id,
      name: bank.name,
      price: bank.price
    }));
  }

  async getBank(id: number): Promise<Bank | undefined> {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      price: data.price
    };
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    const { data, error } = await supabase
      .from('banks')
      .insert({
        name: bank.name,
        price: bank.price
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      price: data.price
    };
  }

  // Propostas
  async getProposals(): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*');
    
    if (error) throw error;
    
    return data.map(proposal => ({
      id: proposal.id,
      value: proposal.value,
      clientId: proposal.client_id,
      createdAt: proposal.created_at ? new Date(proposal.created_at) : null,
      status: proposal.status,
      productId: proposal.product_id,
      convenioId: proposal.convenio_id,
      bankId: proposal.bank_id,
      createdById: proposal.created_by_id,
      organizationId: proposal.organization_id,
      comments: proposal.comments
    }));
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      value: data.value,
      clientId: data.client_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      status: data.status,
      productId: data.product_id,
      convenioId: data.convenio_id,
      bankId: data.bank_id,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      comments: data.comments
    };
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    console.log('Tentando criar proposta:', { 
      value: proposal.value, 
      clientId: proposal.clientId,
      status: proposal.status,
      createdById: proposal.createdById,
      organizationId: proposal.organizationId
    });
    
    const proposalData = {
      value: proposal.value,
      client_id: proposal.clientId,
      created_at: new Date().toISOString(),
      status: proposal.status,
      product_id: proposal.productId,
      convenio_id: proposal.convenioId,
      bank_id: proposal.bankId,
      created_by_id: proposal.createdById,
      organization_id: proposal.organizationId,
      comments: proposal.comments
    };
    
    console.log('Dados para inserção da proposta:', proposalData);
    
    const { data, error } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      value: data.value,
      clientId: data.client_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      status: data.status,
      productId: data.product_id,
      convenioId: data.convenio_id,
      bankId: data.bank_id,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      comments: data.comments
    };
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    // Verificar se existe
    const existingProposal = await this.getProposal(id);
    if (!existingProposal) return undefined;
    
    // Atualizar
    const { data, error } = await supabase
      .from('proposals')
      .update({
        value: proposal.value,
        client_id: proposal.clientId,
        status: proposal.status,
        product_id: proposal.productId,
        convenio_id: proposal.convenioId,
        bank_id: proposal.bankId,
        created_by_id: proposal.createdById ?? existingProposal.createdById,
        organization_id: proposal.organizationId ?? existingProposal.organizationId,
        comments: proposal.comments ?? existingProposal.comments
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      value: data.value,
      clientId: data.client_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      status: data.status,
      productId: data.product_id,
      convenioId: data.convenio_id,
      bankId: data.bank_id,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      comments: data.comments
    };
  }

  async deleteProposal(id: number): Promise<boolean> {
    // Verificar se existe
    const proposal = await this.getProposal(id);
    if (!proposal) return false;
    
    // Deletar
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  }

  async getProposalsByClient(clientId: number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) throw error;
    
    return data.map(proposal => ({
      id: proposal.id,
      value: proposal.value,
      clientId: proposal.client_id,
      createdAt: proposal.created_at ? new Date(proposal.created_at) : null,
      status: proposal.status,
      productId: proposal.product_id,
      convenioId: proposal.convenio_id,
      bankId: proposal.bank_id,
      createdById: proposal.created_by_id,
      organizationId: proposal.organization_id,
      comments: proposal.comments
    }));
  }

  async getProposalsByProduct(productId: number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('product_id', productId);
    
    if (error) throw error;
    
    return data.map(proposal => ({
      id: proposal.id,
      value: proposal.value,
      clientId: proposal.client_id,
      createdAt: proposal.created_at ? new Date(proposal.created_at) : null,
      status: proposal.status,
      productId: proposal.product_id,
      convenioId: proposal.convenio_id,
      bankId: proposal.bank_id,
      createdById: proposal.created_by_id,
      organizationId: proposal.organization_id,
      comments: proposal.comments
    }));
  }

  async getProposalsByValue(minValue: number, maxValue?: number): Promise<Proposal[]> {
    let query = supabase
      .from('proposals')
      .select('*')
      .gte('value', minValue.toString());
    
    if (maxValue !== undefined) {
      query = query.lte('value', maxValue.toString());
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data.map(proposal => ({
      id: proposal.id,
      value: proposal.value,
      clientId: proposal.client_id,
      createdAt: proposal.created_at ? new Date(proposal.created_at) : null,
      status: proposal.status,
      productId: proposal.product_id,
      convenioId: proposal.convenio_id,
      bankId: proposal.bank_id,
      createdById: proposal.created_by_id,
      organizationId: proposal.organization_id,
      comments: proposal.comments
    }));
  }

  async getProposalsByStatus(status: string): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('status', status);
    
    if (error) throw error;
    
    return data.map(proposal => ({
      id: proposal.id,
      value: proposal.value,
      clientId: proposal.client_id,
      createdAt: proposal.created_at ? new Date(proposal.created_at) : null,
      status: proposal.status,
      productId: proposal.product_id,
      convenioId: proposal.convenio_id,
      bankId: proposal.bank_id,
      createdById: proposal.created_by_id,
      organizationId: proposal.organization_id,
      comments: proposal.comments
    }));
  }

  async getProposalsWithDetails(): Promise<ProposalWithDetails[]> {
    const proposals = await this.getProposals();
    
    // Para cada proposta, buscar os detalhes do cliente, produto, convênio e banco
    const result = await Promise.all(proposals.map(async (proposal) => {
      const client = proposal.clientId ? await this.getClient(proposal.clientId) : undefined;
      const product = proposal.productId ? await this.getProduct(proposal.productId) : undefined;
      const convenio = proposal.convenioId ? await this.getConvenio(proposal.convenioId) : undefined;
      const bank = proposal.bankId ? await this.getBank(proposal.bankId) : undefined;
      
      return {
        ...proposal,
        client,
        product,
        convenio,
        bank
      };
    }));
    
    return result;
  }

  // Kanban
  async getKanbanEntries(): Promise<Kanban[]> {
    const { data, error } = await supabase
      .from('kanban')
      .select('*');
    
    if (error) throw error;
    
    return data.map(entry => ({
      id: entry.id,
      clientId: entry.client_id,
      column: entry.column,
      position: entry.position
    }));
  }

  async getKanbanEntry(id: number): Promise<Kanban | undefined> {
    const { data, error } = await supabase
      .from('kanban')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      clientId: data.client_id,
      column: data.column,
      position: data.position
    };
  }

  async getKanbanEntryByClient(clientId: number): Promise<Kanban | undefined> {
    const { data, error } = await supabase
      .from('kanban')
      .select('*')
      .eq('client_id', clientId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      clientId: data.client_id,
      column: data.column,
      position: data.position
    };
  }

  async createKanbanEntry(kanbanEntry: InsertKanban): Promise<Kanban> {
    const { data, error } = await supabase
      .from('kanban')
      .insert({
        client_id: kanbanEntry.clientId,
        column: kanbanEntry.column,
        position: kanbanEntry.position
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      clientId: data.client_id,
      column: data.column,
      position: data.position
    };
  }

  async updateKanbanEntry(id: number, kanbanEntry: Partial<InsertKanban>): Promise<Kanban | undefined> {
    // Verificar se existe
    const existingEntry = await this.getKanbanEntry(id);
    if (!existingEntry) return undefined;
    
    // Atualizar
    const { data, error } = await supabase
      .from('kanban')
      .update({
        client_id: kanbanEntry.clientId,
        column: kanbanEntry.column,
        position: kanbanEntry.position
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      clientId: data.client_id,
      column: data.column,
      position: data.position
    };
  }

  async updateClientKanbanColumn(clientId: number, column: string): Promise<Kanban | undefined> {
    // Buscar a entrada kanban atual
    const kanbanEntry = await this.getKanbanEntryByClient(clientId);
    if (!kanbanEntry) return undefined;
    
    // Calcular a próxima posição
    const position = await this.getNextPositionForColumn(column);
    
    // Atualizar
    const { data, error } = await supabase
      .from('kanban')
      .update({
        column,
        position
      })
      .eq('client_id', clientId)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      clientId: data.client_id,
      column: data.column,
      position: data.position
    };
  }

  private async getNextPositionForColumn(column: string): Promise<number> {
    // Buscar a maior posição atual para a coluna
    const { data, error } = await supabase
      .from('kanban')
      .select('position')
      .eq('column', column)
      .order('position', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    // Se não houver entradas, começar do 0
    if (data.length === 0) return 0;
    
    // Caso contrário, incrementar a maior posição
    return data[0].position + 1;
  }
  
  // Métodos para lidar com clientes por criador e organização
  async getClientsByCreator(creatorId: number): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('created_by_id', creatorId);
    
    if (error) throw error;
    
    return data.map(client => ({
      id: client.id,
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      convenioId: client.convenio_id,
      birthDate: client.birth_date,
      contact: client.contact,
      email: client.email,
      company: client.company,
      createdById: client.created_by_id,
      organizationId: client.organization_id,
      createdAt: client.created_at ? new Date(client.created_at) : null
    }));
  }
  
  async getClientsByOrganization(organizationId: number): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    return data.map(client => ({
      id: client.id,
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      convenioId: client.convenio_id,
      birthDate: client.birth_date,
      contact: client.contact,
      email: client.email,
      company: client.company,
      createdById: client.created_by_id,
      organizationId: client.organization_id,
      createdAt: client.created_at ? new Date(client.created_at) : null
    }));
  }
  
  // Métodos para lidar com propostas por criador e organização
  async getProposalsByCreator(creatorId: number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('created_by_id', creatorId);
    
    if (error) throw error;
    
    return data.map(proposal => ({
      id: proposal.id,
      value: proposal.value,
      clientId: proposal.client_id,
      createdAt: proposal.created_at ? new Date(proposal.created_at) : null,
      status: proposal.status,
      productId: proposal.product_id,
      convenioId: proposal.convenio_id,
      bankId: proposal.bank_id,
      createdById: proposal.created_by_id,
      organizationId: proposal.organization_id,
      comments: proposal.comments
    }));
  }
  
  async getProposalsByOrganization(organizationId: number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    return data.map(proposal => ({
      id: proposal.id,
      value: proposal.value,
      clientId: proposal.client_id,
      createdAt: proposal.created_at ? new Date(proposal.created_at) : null,
      status: proposal.status,
      productId: proposal.product_id,
      convenioId: proposal.convenio_id,
      bankId: proposal.bank_id,
      createdById: proposal.created_by_id,
      organizationId: proposal.organization_id,
      comments: proposal.comments
    }));
  }
  
  // Métodos para lidar com usuários
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    
    return data.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector,
      password: user.password,
      organizationId: user.organization_id,
      createdAt: user.created_at ? new Date(user.created_at) : null,
      updatedAt: user.updated_at ? new Date(user.updated_at) : null
    }));
  }
  
  async getUserById(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      sector: data.sector,
      password: data.password,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log('Buscando usuário pelo email:', email);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Usuário não encontrado pelo email:', email);
        return undefined;
      }
      console.error('Erro ao buscar usuário pelo email:', error);
      throw error;
    }
    
    console.log('Usuário encontrado pelo email:', data);
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      sector: data.sector,
      password: data.password,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }
  
  async createUser(user: RegisterUser): Promise<User> {
    console.log('Tentando criar usuário:', { email: user.email, name: user.name, role: user.role });
    
    // Primeiro, criar usuário no supabase auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          name: user.name,
          role: user.role,
          organization_id: user.organizationId || null
        }
      }
    });
    
    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      throw authError;
    }
    
    console.log('Usuário criado no Auth com sucesso:', authData);
    
    // Preparar o objeto de inserção
    const insertData: any = {
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector || null,
      password: user.password, // Armazenar a senha encriptada
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Adicionar organization_id apenas se estiver definido
    if (user.organizationId !== undefined) {
      insertData.organization_id = user.organizationId;
    }
    
    console.log('Tentando inserir usuário na tabela users:', insertData);
    
    // Em seguida, criar o registro na tabela 'users'
    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      sector: data.sector,
      password: data.password,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    // Verificar se o usuário existe
    const existingUser = await this.getUserById(id);
    if (!existingUser) return undefined;
    
    // Construir objeto de atualização apenas com campos válidos
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    if (user.name) updateData.name = user.name;
    if (user.email) updateData.email = user.email;
    if (user.role) updateData.role = user.role;
    if (user.sector !== undefined) updateData.sector = user.sector;
    if (user.password !== undefined) updateData.password = user.password;
    if (user.organizationId !== undefined) updateData.organization_id = user.organizationId;
    
    // Atualizar usuário
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      sector: data.sector,
      password: data.password,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // Verificar se o usuário existe
    const user = await this.getUserById(id);
    if (!user) return false;
    
    // Deletar usuário
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  }
  
  async getUsersInOrganization(organizationId: number): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    return data.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector,
      password: user.password,
      organizationId: user.organization_id,
      createdAt: user.created_at ? new Date(user.created_at) : null,
      updatedAt: user.updated_at ? new Date(user.updated_at) : null
    }));
  }
  
  async loginUser(email: string, password: string): Promise<AuthData | null> {
    console.log('Tentando fazer login para o usuário:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Erro ao autenticar com Supabase:', error);
      return null;
    }
    
    console.log('Usuário autenticado com sucesso no Supabase Auth, buscando dados do usuário.');
    
    const user = await this.getUserByEmail(email);
    if (!user) {
      console.error('Usuário encontrado na autenticação, mas não encontrado na tabela de usuários:', email);
      return null;
    }
    
    console.log('Usuário encontrado na tabela de usuários:', user);
    
    // Buscar organização
    let organization = undefined;
    if (user.organizationId) {
      organization = await this.getOrganizationById(user.organizationId);
    }
    
    return {
      token: data.session.access_token,
      user: {
        ...user,
        organization
      }
    };
  }
  
  async resetPassword(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return !error;
  }
  
  // Métodos para lidar com organizações
  async getOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*');
    
    if (error) throw error;
    
    return data.map(org => ({
      id: org.id,
      name: org.name,
      phone: org.phone,
      email: org.email,
      address: org.address,
      cnpj: org.cnpj,
      website: org.website,
      description: org.description,
      logo: org.logo,
      createdAt: org.created_at ? new Date(org.created_at) : null
    }));
  }
  
  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      cnpj: data.cnpj,
      website: data.website,
      description: data.description,
      logo: data.logo,
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }
  
  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const insertData: any = {
      name: organization.name,
      created_at: new Date().toISOString()
    };
    
    // Adicionar campos opcionais se fornecidos
    if (organization.phone !== undefined) insertData.phone = organization.phone;
    if (organization.email !== undefined) insertData.email = organization.email;
    if (organization.address !== undefined) insertData.address = organization.address;
    if (organization.cnpj !== undefined) insertData.cnpj = organization.cnpj;
    if (organization.website !== undefined) insertData.website = organization.website;
    if (organization.description !== undefined) insertData.description = organization.description;
    if (organization.logo !== undefined) insertData.logo = organization.logo;
    
    const { data, error } = await supabase
      .from('organizations')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      cnpj: data.cnpj,
      website: data.website,
      description: data.description,
      logo: data.logo,
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }
  
  async updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined> {
    // Verificar se existe
    const existingOrg = await this.getOrganizationById(id);
    if (!existingOrg) return undefined;
    
    // Construir objeto de atualização apenas com campos válidos
    const updateData: Record<string, any> = {};
    
    if (organization.name !== undefined) updateData.name = organization.name;
    if (organization.phone !== undefined) updateData.phone = organization.phone;
    if (organization.email !== undefined) updateData.email = organization.email;
    if (organization.address !== undefined) updateData.address = organization.address;
    if (organization.cnpj !== undefined) updateData.cnpj = organization.cnpj;
    if (organization.website !== undefined) updateData.website = organization.website;
    if (organization.description !== undefined) updateData.description = organization.description;
    if (organization.logo !== undefined) updateData.logo = organization.logo;
    
    // Atualizar
    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      cnpj: data.cnpj,
      website: data.website,
      description: data.description,
      logo: data.logo,
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }
  
  async deleteOrganization(id: number): Promise<boolean> {
    // Verificar se existe
    const org = await this.getOrganizationById(id);
    if (!org) return false;
    
    // Deletar
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  }

  // ==================
  // Form Template methods
  // ==================
  
  async getFormTemplates(): Promise<FormTemplate[]> {
    throw new Error("Método getFormTemplates não implementado em SupabaseStorage");
  }

  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    throw new Error("Método getFormTemplate não implementado em SupabaseStorage");
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    throw new Error("Método createFormTemplate não implementado em SupabaseStorage");
  }

  async updateFormTemplate(id: number, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    throw new Error("Método updateFormTemplate não implementado em SupabaseStorage");
  }

  async deleteFormTemplate(id: number): Promise<boolean> {
    throw new Error("Método deleteFormTemplate não implementado em SupabaseStorage");
  }

  async getFormTemplatesByOrganization(organizationId: number): Promise<FormTemplate[]> {
    throw new Error("Método getFormTemplatesByOrganization não implementado em SupabaseStorage");
  }
  
  // ==================
  // Form Submission methods
  // ==================
  
  async getFormSubmissions(): Promise<FormSubmission[]> {
    throw new Error("Método getFormSubmissions não implementado em SupabaseStorage");
  }

  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    throw new Error("Método getFormSubmission não implementado em SupabaseStorage");
  }

  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    throw new Error("Método createFormSubmission não implementado em SupabaseStorage");
  }

  async updateFormSubmissionStatus(id: number, status: string, processedById?: number): Promise<FormSubmission | undefined> {
    throw new Error("Método updateFormSubmissionStatus não implementado em SupabaseStorage");
  }

  async processFormSubmission(id: number, processedById: number): Promise<{client: Client, submission: FormSubmission} | undefined> {
    throw new Error("Método processFormSubmission não implementado em SupabaseStorage");
  }

  async getFormSubmissionsByTemplate(templateId: number): Promise<FormSubmission[]> {
    throw new Error("Método getFormSubmissionsByTemplate não implementado em SupabaseStorage");
  }

  async getFormSubmissionsByStatus(status: string): Promise<FormSubmission[]> {
    throw new Error("Método getFormSubmissionsByStatus não implementado em SupabaseStorage");
  }

  async getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]> {
    throw new Error("Método getFormSubmissionsByOrganization não implementado em SupabaseStorage");
  }
}

// Criando e exportando uma instância da classe SupabaseStorage
export const supabaseStorage = new SupabaseStorage();