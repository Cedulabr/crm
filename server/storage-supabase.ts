import { supabase } from './supabase';
import type { IStorage } from './storage';
import {
  Client,
  Product,
  Convenio,
  Bank,
  Proposal,
  Kanban,
  InsertClient,
  InsertProduct,
  InsertConvenio,
  InsertBank,
  InsertProposal,
  InsertKanban,
  ClientWithKanban,
  ProposalWithDetails
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
      contact: client.contact,
      email: client.email,
      phone: client.phone,
      company: client.company,
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
      contact: data.contact,
      email: data.email,
      phone: data.phone,
      company: data.company,
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }

  async createClient(client: InsertClient): Promise<Client> {
    // Transformando de camelCase para snake_case
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: client.name,
        contact: client.contact,
        email: client.email,
        phone: client.phone,
        company: client.company,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Retorna o cliente com a transformação de snake_case para camelCase
    const newClient: Client = {
      id: data.id,
      name: data.name,
      contact: data.contact,
      email: data.email,
      phone: data.phone,
      company: data.company,
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
        contact: client.contact,
        email: client.email,
        phone: client.phone,
        company: client.company
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      contact: data.contact,
      email: data.email,
      phone: data.phone,
      company: data.company,
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
      bankId: proposal.bank_id
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
      bankId: data.bank_id
    };
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const { data, error } = await supabase
      .from('proposals')
      .insert({
        value: proposal.value,
        client_id: proposal.clientId,
        created_at: new Date().toISOString(),
        status: proposal.status,
        product_id: proposal.productId,
        convenio_id: proposal.convenioId,
        bank_id: proposal.bankId
      })
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
      bankId: data.bank_id
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
        bank_id: proposal.bankId
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
      bankId: data.bank_id
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
      bankId: proposal.bank_id
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
      bankId: proposal.bank_id
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
      bankId: proposal.bank_id
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
      bankId: proposal.bank_id
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
}