import { createClient } from '@supabase/supabase-js';
import {
  Client, InsertClient,
  Product, InsertProduct,
  Convenio, InsertConvenio,
  Bank, InsertBank,
  Proposal, InsertProposal, ProposalWithDetails,
  User, InsertUser, RegisterUser, UserWithOrganization, AuthData,
  Organization, InsertOrganization,
  FormTemplate, InsertFormTemplate,
  FormSubmission, InsertFormSubmission,
  UserRole
} from '@shared/schema';
import { IStorage } from '../storage';
import bcrypt from 'bcrypt';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são necessárias');
  process.exit(1);
}

// Cliente do Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Implementação do IStorage usando Supabase
 * Esta classe substitui o DatabaseStorage para usar o Supabase para todas as operações
 */
export class SupabaseStorage implements IStorage {
  constructor() {
    console.log('📦 Inicializando SupabaseStorage');
    this.initializeDefaultData();
  }

  /**
   * Inicializa dados padrão no Supabase se não existirem
   */
  private async initializeDefaultData() {
    try {
      // Verificar se já existem bancos cadastrados
      const { data: banks } = await supabase
        .from('banks')
        .select('*')
        .limit(1);
      
      if (banks && banks.length === 0) {
        console.log('Inicializando dados padrão no Supabase...');
        
        // Criar dados básicos se necessário
        // 1. Bancos
        const bankData = [
          { name: 'BANRISUL', price: 'R$ 2.500,00' },
          { name: 'BMG', price: 'R$ 3.000,00' },
          { name: 'C6 BANK', price: 'R$ 1.800,00' },
          { name: 'CAIXA ECONÔMICA FEDERAL', price: 'R$ 2.000,00' },
          { name: 'ITAÚ', price: 'R$ 4.500,00' },
          { name: 'SAFRA', price: 'R$ 2.800,00' },
          { name: 'SANTANDER', price: 'R$ 3.200,00' },
          { name: 'BRADESCO', price: 'R$ 3.500,00' },
          { name: 'BANCO DO BRASIL', price: 'R$ 3.000,00' },
          { name: 'NUBANK', price: 'R$ 1.500,00' }
        ];
        
        const { data: createdBanks, error: bankError } = await supabase
          .from('banks')
          .insert(bankData)
          .select();
          
        if (bankError) {
          console.error('Erro ao criar bancos:', bankError);
        } else {
          console.log(`Criados ${createdBanks?.length || 0} bancos`);
        }
        
        // 2. Convênios
        const convenioData = [
          { name: 'Beneficiário do INSS', price: 'R$ 3.000,00' },
          { name: 'Servidor Público', price: 'R$ 5.000,00' },
          { name: 'LOAS/BPC', price: 'R$ 1.500,00' },
          { name: 'Carteira assinada CLT', price: 'R$ 4.000,00' }
        ];
        
        const { data: createdConvenios, error: convenioError } = await supabase
          .from('convenios')
          .insert(convenioData)
          .select();
          
        if (convenioError) {
          console.error('Erro ao criar convênios:', convenioError);
        } else {
          console.log(`Criados ${createdConvenios?.length || 0} convênios`);
        }
        
        // 3. Produtos
        const productData = [
          { name: 'Novo empréstimo', price: 'R$ 1.000,00' },
          { name: 'Refinanciamento', price: 'R$ 5.000,00' },
          { name: 'Portabilidade', price: 'R$ 2.000,00' },
          { name: 'Cartão de Crédito', price: 'R$ 500,00' },
          { name: 'Saque FGTS', price: 'R$ 1.200,00' }
        ];
        
        const { data: createdProducts, error: productError } = await supabase
          .from('products')
          .insert(productData)
          .select();
          
        if (productError) {
          console.error('Erro ao criar produtos:', productError);
        } else {
          console.log(`Criados ${createdProducts?.length || 0} produtos`);
        }
      }
      
      // Verificar se existe ao menos uma organização
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .limit(1);
        
      if (orgs && orgs.length === 0) {
        // Criar organização padrão
        const { data: createdOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: 'Organização Padrão',
            cnpj: '12.345.678/0001-90',
            address: 'Avenida Presidente Vargas, 1000',
            phone: '(71) 3333-4444',
            email: 'contato@organizacaopadrao.com',
            website: 'www.organizacaopadrao.com',
            logo_url: 'https://placehold.co/100x100'
          })
          .select()
          .single();
          
        if (orgError) {
          console.error('Erro ao criar organização padrão:', orgError);
        } else if (createdOrg) {
          console.log(`Criada organização padrão: ${createdOrg.name}`);
          
          // Verificar se existe ao menos um usuário administrador
          const { data: users } = await supabase.auth.admin.listUsers();
          
          if (!users || users.users.length === 0) {
            // Criar usuário administrador
            const hashedPassword = await bcrypt.hash('Admin@123', 10);
            
            // 1. Criar usuário na autenticação do Supabase
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: 'admin@example.com',
              password: 'Admin@123',
              user_metadata: {
                name: 'Administrador',
                role: UserRole.SUPERADMIN,
                organization_id: createdOrg.id
              }
            });
            
            if (authError) {
              console.error('Erro ao criar usuário na autenticação:', authError);
            } else if (authData) {
              console.log(`Criado usuário auth: ${authData.user.email}`);
              
              // 2. Criar perfil do usuário na tabela profiles
              const { error: profileError } = await supabase
                .from('users')
                .insert({
                  id: authData.user.id,
                  name: 'Administrador',
                  email: 'admin@example.com',
                  role: UserRole.SUPERADMIN,
                  sector: 'Comercial',
                  organization_id: createdOrg.id,
                  password: hashedPassword
                });
                
              if (profileError) {
                console.error('Erro ao criar perfil do usuário:', profileError);
              } else {
                console.log('Criado perfil do usuário admin');
              }
            }
          }
        }
      }
      
      console.log('Inicialização de dados padrão concluída!');
    } catch (error) {
      console.error('Erro na inicialização de dados padrão:', error);
    }
  }

  // =====================
  // Métodos para Clientes
  // =====================
  
  async getClients(): Promise<Client[]> {
    console.log('Supabase: Buscando todos os clientes');
    const { data, error } = await supabase
      .from('clients')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar clientes:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getClient(id: number): Promise<Client | undefined> {
    console.log(`Supabase: Buscando cliente ID ${id}`);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar cliente ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    console.log('Supabase: Criando novo cliente');
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar cliente:', error);
      throw new Error(`Falha ao criar cliente: ${error.message}`);
    }
    
    return data;
  }
  
  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    console.log(`Supabase: Atualizando cliente ID ${id}`);
    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao atualizar cliente ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async deleteClient(id: number): Promise<boolean> {
    console.log(`Supabase: Excluindo cliente ID ${id}`);
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Erro ao excluir cliente ${id}:`, error);
      return false;
    }
    
    return true;
  }
  
  async getClientsByCreator(creatorId: string): Promise<Client[]> {
    console.log(`Supabase: Buscando clientes do criador ID ${creatorId}`);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('created_by_id', creatorId);
      
    if (error) {
      console.error(`Erro ao buscar clientes do criador ${creatorId}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  async getClientsByOrganization(organizationId: number): Promise<Client[]> {
    console.log(`Supabase: Buscando clientes da organização ID ${organizationId}`);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId);
      
    if (error) {
      console.error(`Erro ao buscar clientes da organização ${organizationId}:`, error);
      return [];
    }
    
    return data || [];
  }

  // =====================
  // Métodos para Produtos
  // =====================
  
  async getProducts(): Promise<Product[]> {
    console.log('Supabase: Buscando todos os produtos');
    const { data, error } = await supabase
      .from('products')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getProduct(id: number): Promise<Product | undefined> {
    console.log(`Supabase: Buscando produto ID ${id}`);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar produto ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    console.log('Supabase: Criando novo produto');
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar produto:', error);
      throw new Error(`Falha ao criar produto: ${error.message}`);
    }
    
    return data;
  }

  // =====================
  // Métodos para Convênios
  // =====================
  
  async getConvenios(): Promise<Convenio[]> {
    console.log('Supabase: Buscando todos os convênios');
    const { data, error } = await supabase
      .from('convenios')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar convênios:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getConvenio(id: number): Promise<Convenio | undefined> {
    console.log(`Supabase: Buscando convênio ID ${id}`);
    const { data, error } = await supabase
      .from('convenios')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar convênio ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createConvenio(convenio: InsertConvenio): Promise<Convenio> {
    console.log('Supabase: Criando novo convênio');
    const { data, error } = await supabase
      .from('convenios')
      .insert(convenio)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar convênio:', error);
      throw new Error(`Falha ao criar convênio: ${error.message}`);
    }
    
    return data;
  }

  // =====================
  // Métodos para Bancos
  // =====================
  
  async getBanks(): Promise<Bank[]> {
    console.log('Supabase: Buscando todos os bancos');
    const { data, error } = await supabase
      .from('banks')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar bancos:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getBank(id: number): Promise<Bank | undefined> {
    console.log(`Supabase: Buscando banco ID ${id}`);
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar banco ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createBank(bank: InsertBank): Promise<Bank> {
    console.log('Supabase: Criando novo banco');
    const { data, error } = await supabase
      .from('banks')
      .insert(bank)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar banco:', error);
      throw new Error(`Falha ao criar banco: ${error.message}`);
    }
    
    return data;
  }

  // =====================
  // Métodos para Propostas
  // =====================
  
  async getProposals(): Promise<Proposal[]> {
    console.log('Supabase: Buscando todas as propostas');
    const { data, error } = await supabase
      .from('proposals')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar propostas:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getProposal(id: number): Promise<Proposal | undefined> {
    console.log(`Supabase: Buscando proposta ID ${id}`);
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar proposta ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    console.log('Supabase: Criando nova proposta');
    const { data, error } = await supabase
      .from('proposals')
      .insert(proposal)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar proposta:', error);
      throw new Error(`Falha ao criar proposta: ${error.message}`);
    }
    
    return data;
  }
  
  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    console.log(`Supabase: Atualizando proposta ID ${id}`);
    const { data, error } = await supabase
      .from('proposals')
      .update(proposal)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao atualizar proposta ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async deleteProposal(id: number): Promise<boolean> {
    console.log(`Supabase: Excluindo proposta ID ${id}`);
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Erro ao excluir proposta ${id}:`, error);
      return false;
    }
    
    return true;
  }
  
  async getProposalsByClient(clientId: number): Promise<Proposal[]> {
    console.log(`Supabase: Buscando propostas do cliente ID ${clientId}`);
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('client_id', clientId);
      
    if (error) {
      console.error(`Erro ao buscar propostas do cliente ${clientId}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  async getProposalsByProduct(productId: number): Promise<Proposal[]> {
    console.log(`Supabase: Buscando propostas do produto ID ${productId}`);
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('product_id', productId);
      
    if (error) {
      console.error(`Erro ao buscar propostas do produto ${productId}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  async getProposalsByValue(minValue: number, maxValue?: number): Promise<Proposal[]> {
    console.log(`Supabase: Buscando propostas por valor entre ${minValue} e ${maxValue || 'máximo'}`);
    
    let query = supabase
      .from('proposals')
      .select('*')
      // Não podemos usar comparação direta pois o campo value é string
      // Precisaríamos converter este valor ou ajustar o schema
      
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar propostas por valor:', error);
      return [];
    }
    
    // Filtrar manualmente
    return (data || []).filter(p => {
      if (!p.value) return false;
      
      // Remover formatação e converter para número
      const numValue = Number(p.value.replace(/[^\d,.-]/g, '').replace(',', '.'));
      return numValue >= minValue && (!maxValue || numValue <= maxValue);
    });
  }
  
  async getProposalsByStatus(status: string): Promise<Proposal[]> {
    console.log(`Supabase: Buscando propostas com status "${status}"`);
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('status', status);
      
    if (error) {
      console.error(`Erro ao buscar propostas com status ${status}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  async getProposalsWithDetails(): Promise<ProposalWithDetails[]> {
    console.log('Supabase: Buscando propostas com detalhes');
    
    // Infelizmente não podemos fazer joins na API do Supabase diretamente
    // Então vamos buscar as propostas e depois enriquecer com os detalhes
    
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar propostas com detalhes:', error);
      return [];
    }
    
    if (!proposals || proposals.length === 0) {
      return [];
    }
    
    // Criar um mapa de IDs para buscar os relacionamentos de forma eficiente
    const clientIds = Array.from(new Set(proposals.map(p => p.client_id).filter(Boolean) as number[]));
    const productIds = Array.from(new Set(proposals.map(p => p.product_id).filter(Boolean) as number[]));
    const convenioIds = Array.from(new Set(proposals.map(p => p.convenio_id).filter(Boolean) as number[]));
    const bankIds = Array.from(new Set(proposals.map(p => p.bank_id).filter(Boolean) as number[]));
    
    // Buscar entidades relacionadas
    const [clients, products, convenios, banks] = await Promise.all([
      this.getClientsByIds(clientIds),
      this.getProductsByIds(productIds),
      this.getConveniosByIds(convenioIds),
      this.getBanksByIds(bankIds)
    ]);
    
    // Criar mapa de entidades para facilitar o lookup
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const productMap = new Map(products.map(p => [p.id, p]));
    const convenioMap = new Map(convenios.map(c => [c.id, c]));
    const bankMap = new Map(banks.map(b => [b.id, b]));
    
    // Enriquecer as propostas com os detalhes
    return proposals.map(proposal => ({
      ...proposal,
      client: proposal.client_id ? clientMap.get(proposal.client_id) : undefined,
      product: proposal.product_id ? productMap.get(proposal.product_id) : undefined,
      convenio: proposal.convenio_id ? convenioMap.get(proposal.convenio_id) : undefined,
      bank: proposal.bank_id ? bankMap.get(proposal.bank_id) : undefined
    }));
  }
  
  // Métodos auxiliares para buscar múltiplas entidades de uma vez
  private async getClientsByIds(ids: number[]): Promise<Client[]> {
    if (ids.length === 0) return [];
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .in('id', ids);
      
    if (error) {
      console.error('Erro ao buscar clientes por IDs:', error);
      return [];
    }
    
    return data || [];
  }
  
  private async getProductsByIds(ids: number[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', ids);
      
    if (error) {
      console.error('Erro ao buscar produtos por IDs:', error);
      return [];
    }
    
    return data || [];
  }
  
  private async getConveniosByIds(ids: number[]): Promise<Convenio[]> {
    if (ids.length === 0) return [];
    
    const { data, error } = await supabase
      .from('convenios')
      .select('*')
      .in('id', ids);
      
    if (error) {
      console.error('Erro ao buscar convênios por IDs:', error);
      return [];
    }
    
    return data || [];
  }
  
  private async getBanksByIds(ids: number[]): Promise<Bank[]> {
    if (ids.length === 0) return [];
    
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .in('id', ids);
      
    if (error) {
      console.error('Erro ao buscar bancos por IDs:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getProposalsByCreator(creatorId: string): Promise<Proposal[]> {
    console.log(`Supabase: Buscando propostas do criador ID ${creatorId}`);
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('created_by_id', creatorId);
      
    if (error) {
      console.error(`Erro ao buscar propostas do criador ${creatorId}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  async getProposalsByOrganization(organizationId: number): Promise<Proposal[]> {
    console.log(`Supabase: Buscando propostas da organização ID ${organizationId}`);
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('organization_id', organizationId);
      
    if (error) {
      console.error(`Erro ao buscar propostas da organização ${organizationId}:`, error);
      return [];
    }
    
    return data || [];
  }

  // =====================
  // Métodos para Usuários
  // =====================
  
  async getUsers(): Promise<User[]> {
    console.log('Supabase: Buscando todos os usuários');
    const { data, error } = await supabase
      .from('users')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getUserById(id: string | number): Promise<User | undefined> {
    console.log(`Supabase: Buscando usuário ID ${id}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar usuário ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log(`Supabase: Buscando usuário por email ${email}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar usuário por email ${email}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createUser(user: RegisterUser): Promise<User> {
    console.log('Supabase: Criando novo usuário');
    
    // 1. Criar o usuário na autenticação do Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      user_metadata: {
        name: user.name,
        role: user.role,
        organization_id: user.organizationId
      }
    });
    
    if (authError) {
      console.error('Erro ao criar usuário na autenticação:', authError);
      throw new Error(`Falha ao criar usuário: ${authError.message}`);
    }
    
    if (!authData?.user) {
      throw new Error('Falha ao criar usuário: Resposta inválida do Supabase Auth');
    }
    
    // Hash da senha para armazenamento
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    // 2. Criar perfil do usuário na tabela profiles
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sector: user.sector,
        organization_id: user.organizationId,
        password: hashedPassword
      })
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar perfil do usuário:', error);
      // Tentar reverter criação do usuário na autenticação
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Falha ao criar perfil do usuário: ${error.message}`);
    }
    
    return data;
  }
  
  async updateUser(id: string | number, userData: Partial<InsertUser>): Promise<User | undefined> {
    console.log(`Supabase: Atualizando usuário ID ${id}`);
    
    // Se houver senha, hash ela
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao atualizar usuário ${id}:`, error);
      return undefined;
    }
    
    // Se for atualização de email ou dados de usuário, atualizar também no Auth
    if (userData.email || userData.name || userData.role) {
      try {
        await supabase.auth.admin.updateUserById(id.toString(), {
          email: userData.email,
          user_metadata: {
            name: userData.name,
            role: userData.role
          }
        });
      } catch (authError) {
        console.error(`Erro ao atualizar usuário ${id} na autenticação:`, authError);
      }
    }
    
    return data;
  }
  
  async deleteUser(id: string | number): Promise<boolean> {
    console.log(`Supabase: Excluindo usuário ID ${id}`);
    
    // 1. Excluir perfil do usuário
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Erro ao excluir perfil do usuário ${id}:`, error);
      return false;
    }
    
    // 2. Excluir o usuário na autenticação do Supabase
    try {
      await supabase.auth.admin.deleteUser(id.toString());
    } catch (authError) {
      console.error(`Erro ao excluir usuário ${id} na autenticação:`, authError);
      return false;
    }
    
    return true;
  }
  
  async getUsersInOrganization(organizationId: number): Promise<User[]> {
    console.log(`Supabase: Buscando usuários da organização ID ${organizationId}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId);
      
    if (error) {
      console.error(`Erro ao buscar usuários da organização ${organizationId}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  // =====================
  // Métodos para Autenticação
  // =====================
  
  async loginUser(email: string, password: string): Promise<AuthData | null> {
    console.log(`Supabase: Autenticando usuário ${email}`);
    
    try {
      // 1. Autenticar com Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        console.error('Erro na autenticação:', authError);
        return null;
      }
      
      // 2. Buscar perfil do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations:organization_id(*)')
        .eq('id', authData.user.id)
        .single();
        
      if (userError || !userData) {
        console.error('Erro ao buscar perfil do usuário:', userError);
        return null;
      }
      
      // 3. Formatar dados para retorno
      const organization = userData.organizations || undefined;
      delete userData.organizations;
      
      return {
        token: authData.session.access_token,
        user: {
          ...userData,
          organization
        }
      };
    } catch (error) {
      console.error('Erro inesperado no login:', error);
      return null;
    }
  }
  
  async resetPassword(email: string): Promise<boolean> {
    console.log(`Supabase: Enviando reset de senha para ${email}`);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.PUBLIC_URL || ''}/reset-password`
    });
    
    if (error) {
      console.error(`Erro ao enviar reset de senha para ${email}:`, error);
      return false;
    }
    
    return true;
  }

  // =====================
  // Métodos para Organizações
  // =====================
  
  async getOrganizations(): Promise<Organization[]> {
    console.log('Supabase: Buscando todas as organizações');
    const { data, error } = await supabase
      .from('organizations')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar organizações:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getOrganizationById(id: number): Promise<Organization | undefined> {
    console.log(`Supabase: Buscando organização ID ${id}`);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar organização ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createOrganization(organizationData: InsertOrganization): Promise<Organization> {
    console.log('Supabase: Criando nova organização');
    const { data, error } = await supabase
      .from('organizations')
      .insert(organizationData)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar organização:', error);
      throw new Error(`Falha ao criar organização: ${error.message}`);
    }
    
    return data;
  }
  
  async updateOrganization(id: number, organizationData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    console.log(`Supabase: Atualizando organização ID ${id}`);
    const { data, error } = await supabase
      .from('organizations')
      .update(organizationData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao atualizar organização ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async deleteOrganization(id: number): Promise<boolean> {
    console.log(`Supabase: Excluindo organização ID ${id}`);
    
    // Verificar se há usuários vinculados
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', id);
      
    if (users && users.length > 0) {
      console.error(`Não é possível excluir organização ${id}: existem ${users.length} usuários vinculados`);
      return false;
    }
    
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Erro ao excluir organização ${id}:`, error);
      return false;
    }
    
    return true;
  }

  // =====================
  // Métodos para Templates de Formulários
  // =====================
  
  async getFormTemplates(): Promise<FormTemplate[]> {
    console.log('Supabase: Buscando todos os templates de formulários');
    const { data, error } = await supabase
      .from('form_templates')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar templates de formulários:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    console.log(`Supabase: Buscando template de formulário ID ${id}`);
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar template de formulário ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    console.log('Supabase: Criando novo template de formulário');
    const { data, error } = await supabase
      .from('form_templates')
      .insert(template)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar template de formulário:', error);
      throw new Error(`Falha ao criar template de formulário: ${error.message}`);
    }
    
    return data;
  }
  
  async updateFormTemplate(id: number, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    console.log(`Supabase: Atualizando template de formulário ID ${id}`);
    const { data, error } = await supabase
      .from('form_templates')
      .update(template)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao atualizar template de formulário ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async deleteFormTemplate(id: number): Promise<boolean> {
    console.log(`Supabase: Excluindo template de formulário ID ${id}`);
    const { error } = await supabase
      .from('form_templates')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Erro ao excluir template de formulário ${id}:`, error);
      return false;
    }
    
    return true;
  }
  
  async getFormTemplatesByOrganization(organizationId: number): Promise<FormTemplate[]> {
    console.log(`Supabase: Buscando templates de formulários da organização ID ${organizationId}`);
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('organization_id', organizationId);
      
    if (error) {
      console.error(`Erro ao buscar templates de formulários da organização ${organizationId}:`, error);
      return [];
    }
    
    return data || [];
  }

  // =====================
  // Métodos para Submissões de Formulários
  // =====================
  
  async getFormSubmissions(): Promise<FormSubmission[]> {
    console.log('Supabase: Buscando todas as submissões de formulários');
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar submissões de formulários:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    console.log(`Supabase: Buscando submissão de formulário ID ${id}`);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`Erro ao buscar submissão de formulário ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    console.log('Supabase: Criando nova submissão de formulário');
    const { data, error } = await supabase
      .from('form_submissions')
      .insert(submission)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar submissão de formulário:', error);
      throw new Error(`Falha ao criar submissão de formulário: ${error.message}`);
    }
    
    return data;
  }
  
  async updateFormSubmissionStatus(id: number, status: string, processedById?: number): Promise<FormSubmission | undefined> {
    console.log(`Supabase: Atualizando status da submissão de formulário ID ${id} para ${status}`);
    const { data, error } = await supabase
      .from('form_submissions')
      .update({
        status,
        processed_by_id: processedById,
        processed_at: processedById ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao atualizar status da submissão de formulário ${id}:`, error);
      return undefined;
    }
    
    return data;
  }
  
  async processFormSubmission(id: number, processedById: string | number): Promise<{client: Client, submission: FormSubmission} | undefined> {
    console.log(`Supabase: Processando submissão de formulário ID ${id}`);
    
    // 1. Buscar a submissão
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !submission) {
      console.error(`Erro ao buscar submissão de formulário ${id}:`, error);
      return undefined;
    }
    
    try {
      // 2. Extrair dados para criar cliente
      const formData = submission.form_data as Record<string, any>;
      
      const newClient: InsertClient = {
        name: formData.nome || formData.name || '',
        email: formData.email || '',
        phone: formData.telefone || formData.phone || '',
        cpf: formData.cpf || formData.documento || '',
        contact: formData.contato || '',
        company: formData.empresa || formData.company || '',
        createdById: processedById.toString(),
        organizationId: submission.organization_id
      };
      
      // 3. Criar o cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert(newClient)
        .select()
        .single();
        
      if (clientError || !client) {
        console.error(`Erro ao criar cliente a partir da submissão ${id}:`, clientError);
        return undefined;
      }
      
      // 4. Atualizar status da submissão
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('form_submissions')
        .update({
          status: 'processed',
          processed_by_id: processedById,
          processed_at: new Date().toISOString(),
          client_id: client.id
        })
        .eq('id', id)
        .select()
        .single();
        
      if (updateError || !updatedSubmission) {
        console.error(`Erro ao atualizar submissão ${id} após processamento:`, updateError);
        return undefined;
      }
      
      return {
        client,
        submission: updatedSubmission
      };
    } catch (error) {
      console.error(`Erro ao processar submissão de formulário ${id}:`, error);
      return undefined;
    }
  }
  
  async getFormSubmissionsByTemplate(templateId: number): Promise<FormSubmission[]> {
    console.log(`Supabase: Buscando submissões do template ID ${templateId}`);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('template_id', templateId);
      
    if (error) {
      console.error(`Erro ao buscar submissões do template ${templateId}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  async getFormSubmissionsByStatus(status: string): Promise<FormSubmission[]> {
    console.log(`Supabase: Buscando submissões com status "${status}"`);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('status', status);
      
    if (error) {
      console.error(`Erro ao buscar submissões com status ${status}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  async getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]> {
    console.log(`Supabase: Buscando submissões da organização ID ${organizationId}`);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('organization_id', organizationId);
      
    if (error) {
      console.error(`Erro ao buscar submissões da organização ${organizationId}:`, error);
      return [];
    }
    
    return data || [];
  }
  
  // Session store (implementação vazia, não será necessária com Supabase Auth)
  sessionStore = {
    touch: () => {},
    length: 0,
    all: (cb: (err: any, sessions: {[sid: string]: any}) => void) => { cb(null, {}); },
    clear: (cb: (err: any) => void) => { cb(null); },
    destroy: (sid: string, cb: (err: any) => void) => { cb(null); },
    get: (sid: string, cb: (err: any, session: any) => void) => { cb(null, null); },
    set: (sid: string, sess: any, cb: (err: any) => void) => { cb(null); }
  };
}

// Instância única do storage com Supabase
export const supabaseStorage = new SupabaseStorage();