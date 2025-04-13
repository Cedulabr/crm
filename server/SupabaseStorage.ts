import { 
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
import { IStorage } from "./storage";
import supabase, { isSupabaseConfigured } from "./supabaseClient";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Funções auxiliares para lidar com hash de senhas
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Implementação da interface IStorage usando Supabase
 */
export class SupabaseStorage implements IStorage {
  constructor() {
    // Executar inicialização quando a classe for instanciada
    this.initialize();
  }

  /**
   * Inicializa o armazenamento e garante a conexão
   */
  private async initialize() {
    // Verificar se o Supabase está configurado
    if (!isSupabaseConfigured()) {
      console.warn("⚠️ Supabase não está configurado. Operações de armazenamento estarão limitadas.");
      return;
    }

    // Verificar conexão com o Supabase
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      
      if (error) {
        console.error("❌ Erro ao conectar ao Supabase:", error.message);
      } else {
        // Conexão bem-sucedida
        console.log("Inicialização de dados padrão concluída!");
      }
    } catch (err) {
      console.error("❌ Erro na inicialização:", err);
    }
  }

  /**
   * Adaptador para mapear entre nomes de campos camelCase (código) e snake_case (banco de dados)
   */
  private snakeToCamel(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    
    // Se for um array, converter cada item
    if (Array.isArray(obj)) {
      return obj.map(item => this.snakeToCamel(item));
    }
    
    // Se for um objeto, converter cada propriedade
    const converted: Record<string, any> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Converter snake_case para camelCase
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        
        // Recursivamente converter valores aninhados
        converted[camelKey] = this.snakeToCamel(obj[key]);
      }
    }
    
    return converted;
  }

  /**
   * Adaptador para mapear entre nomes de campos camelCase (código) e snake_case (banco de dados)
   */
  private camelToSnake(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    
    // Se for um array, converter cada item
    if (Array.isArray(obj)) {
      return obj.map(item => this.camelToSnake(item));
    }
    
    // Se for um objeto, converter cada propriedade
    const converted: Record<string, any> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && key !== 'password') { // Nunca incluir senha no resultado
        // Converter camelCase para snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        // Recursivamente converter valores aninhados
        converted[snakeKey] = this.camelToSnake(obj[key]);
      }
    }
    
    return converted;
  }

  // CLIENTS
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter clientes:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter cliente ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const snakeClient = this.camelToSnake(client);
    
    const { data, error } = await supabase
      .from('clients')
      .insert(snakeClient)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar cliente:', error);
      throw new Error(`Falha ao criar cliente: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const snakeClient = this.camelToSnake(client);
    
    const { data, error } = await supabase
      .from('clients')
      .update(snakeClient)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar cliente ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async deleteClient(id: number): Promise<boolean> {
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

  async getClientsByCreator(creatorId: string | number): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('created_by_id', creatorId);
    
    if (error) {
      console.error(`Erro ao obter clientes do criador ${creatorId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getClientsByOrganization(organizationId: number): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error(`Erro ao obter clientes da organização ${organizationId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  // PRODUCTS
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter produtos:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter produto ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const snakeProduct = this.camelToSnake(product);
    
    const { data, error } = await supabase
      .from('products')
      .insert(snakeProduct)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar produto:', error);
      throw new Error(`Falha ao criar produto: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  // CONVENIOS
  async getConvenios(): Promise<Convenio[]> {
    const { data, error } = await supabase
      .from('convenios')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter convênios:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getConvenio(id: number): Promise<Convenio | undefined> {
    const { data, error } = await supabase
      .from('convenios')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter convênio ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createConvenio(convenio: InsertConvenio): Promise<Convenio> {
    const snakeConvenio = this.camelToSnake(convenio);
    
    const { data, error } = await supabase
      .from('convenios')
      .insert(snakeConvenio)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar convênio:', error);
      throw new Error(`Falha ao criar convênio: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  // BANKS
  async getBanks(): Promise<Bank[]> {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter bancos:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getBank(id: number): Promise<Bank | undefined> {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter banco ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    const snakeBank = this.camelToSnake(bank);
    
    const { data, error } = await supabase
      .from('banks')
      .insert(snakeBank)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar banco:', error);
      throw new Error(`Falha ao criar banco: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  // PROPOSALS
  async getProposals(): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter propostas:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter proposta ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const snakeProposal = this.camelToSnake(proposal);
    
    const { data, error } = await supabase
      .from('proposals')
      .insert(snakeProposal)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar proposta:', error);
      throw new Error(`Falha ao criar proposta: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const snakeProposal = this.camelToSnake(proposal);
    
    const { data, error } = await supabase
      .from('proposals')
      .update(snakeProposal)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar proposta ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async deleteProposal(id: number): Promise<boolean> {
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
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) {
      console.error(`Erro ao obter propostas do cliente ${clientId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getProposalsByProduct(productId: number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('product_id', productId);
    
    if (error) {
      console.error(`Erro ao obter propostas do produto ${productId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getProposalsByValue(minValue: number, maxValue?: number): Promise<Proposal[]> {
    let query = supabase
      .from('proposals')
      .select('*')
      .gte('value', minValue);
    
    if (maxValue !== undefined) {
      query = query.lte('value', maxValue);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Erro ao obter propostas por valor:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getProposalsByStatus(status: string): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('status', status);
    
    if (error) {
      console.error(`Erro ao obter propostas com status ${status}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getProposalsWithDetails(): Promise<ProposalWithDetails[]> {
    // Usando JOIN entre propostas, clientes e produtos
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        clients:client_id (*),
        products:product_id (*)
      `);
    
    if (error) {
      console.error('Erro ao obter propostas com detalhes:', error);
      return [];
    }
    
    // Transformar o resultado para match com a interface ProposalWithDetails
    return (data || []).map(item => {
      const proposal = this.snakeToCamel(item);
      
      // Ajustar estrutura para formato esperado pela interface
      return {
        ...proposal,
        client: proposal.clients, // Renomear de acordo com a interface
        product: proposal.products, // Renomear de acordo com a interface
        clients: undefined, // Remover propriedades extras
        products: undefined // Remover propriedades extras
      };
    });
  }

  async getProposalsByCreator(creatorId: string | number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('created_by_id', creatorId);
    
    if (error) {
      console.error(`Erro ao obter propostas do criador ${creatorId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getProposalsByOrganization(organizationId: number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error(`Erro ao obter propostas da organização ${organizationId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  // USERS
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter usuários:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getUserById(id: string | number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter usuário ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      // Não logar erro para procura por email que pode não existir
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createUser(user: RegisterUser): Promise<User> {
    // Hash a senha antes de armazenar
    const hashedUser = {
      ...user,
      password: await hashPassword(user.password)
    };
    
    const snakeUser = this.camelToSnake(hashedUser);
    
    // Primeiro criar o usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          name: user.name,
          role: user.role,
          organization_id: user.organizationId
        }
      }
    });
    
    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      throw new Error(`Falha ao criar usuário: ${authError.message}`);
    }
    
    // Se já existir um usuário com este ID, atualiza o perfil
    const userId = authData.user?.id;
    
    if (!userId) {
      throw new Error('Falha ao obter ID do usuário após cadastro');
    }
    
    // Agora criar/atualizar o perfil na tabela users
    const { data, error } = await supabase
      .from('users')
      .upsert({
        ...snakeUser,
        id: userId
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar perfil de usuário:', error);
      throw new Error(`Falha ao criar perfil: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  async updateUser(id: string | number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const updateData = { ...userData };
    
    // Se houver senha, realizar hash
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }
    
    const snakeUserData = this.camelToSnake(updateData);
    
    const { data, error } = await supabase
      .from('users')
      .update(snakeUserData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar usuário ${id}:`, error);
      return undefined;
    }
    
    // Se estiver atualizando dados principais, atualizar também no Auth
    if (userData.email || userData.password) {
      // Obter dados atuais do usuário
      const currentUser = await this.getUserById(id);
      
      if (currentUser) {
        const updateAuth: any = {};
        
        if (userData.email) {
          updateAuth.email = userData.email;
        }
        
        if (userData.password) {
          updateAuth.password = userData.password; // Senha em texto plano para o Auth
        }
        
        // Atualizar metadados
        const { error: authError } = await supabase.auth.admin.updateUserById(
          id.toString(),
          updateAuth
        );
        
        if (authError) {
          console.error(`Erro ao atualizar Auth do usuário ${id}:`, authError);
        }
      }
    }
    
    return this.snakeToCamel(data);
  }

  async deleteUser(id: string | number): Promise<boolean> {
    // Primeiro remover o usuário do Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(
      id.toString()
    );
    
    if (authError) {
      console.error(`Erro ao excluir usuário ${id} do Auth:`, authError);
      return false;
    }
    
    // Remover o perfil da tabela users
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir perfil do usuário ${id}:`, error);
      return false;
    }
    
    return true;
  }

  async getUsersInOrganization(organizationId: number): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error(`Erro ao obter usuários da organização ${organizationId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async loginUser(email: string, password: string): Promise<AuthData | null> {
    // Usar o método de login do Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Erro ao fazer login:', error);
      return null;
    }
    
    // Obter perfil do usuário da tabela users
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      console.error('Usuário autenticado, mas perfil não encontrado');
      return null;
    }
    
    // Retornar token e dados do usuário
    return {
      token: data.session?.access_token || '',
      user: this.snakeToCamel(user)
    };
  }

  async resetPassword(email: string): Promise<boolean> {
    // Usar o recurso de reset de senha do Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      console.error('Erro ao solicitar reset de senha:', error);
      return false;
    }
    
    return true;
  }

  // ORGANIZATIONS
  async getOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter organizações:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter organização ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createOrganization(organizationData: InsertOrganization): Promise<Organization> {
    const snakeOrganization = this.camelToSnake(organizationData);
    
    const { data, error } = await supabase
      .from('organizations')
      .insert(snakeOrganization)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar organização:', error);
      throw new Error(`Falha ao criar organização: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  async updateOrganization(id: number, organizationData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const snakeOrganization = this.camelToSnake(organizationData);
    
    const { data, error } = await supabase
      .from('organizations')
      .update(snakeOrganization)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar organização ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async deleteOrganization(id: number): Promise<boolean> {
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

  // FORM TEMPLATES
  async getFormTemplates(): Promise<FormTemplate[]> {
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter templates de formulário:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter template de formulário ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const snakeTemplate = this.camelToSnake(template);
    
    const { data, error } = await supabase
      .from('form_templates')
      .insert(snakeTemplate)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar template de formulário:', error);
      throw new Error(`Falha ao criar template: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  async updateFormTemplate(id: number, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    const snakeTemplate = this.camelToSnake(template);
    
    const { data, error } = await supabase
      .from('form_templates')
      .update(snakeTemplate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar template de formulário ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async deleteFormTemplate(id: number): Promise<boolean> {
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
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error(`Erro ao obter templates da organização ${organizationId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  // FORM SUBMISSIONS
  async getFormSubmissions(): Promise<FormSubmission[]> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao obter submissões de formulário:', error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao obter submissão de formulário ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    const snakeSubmission = this.camelToSnake(submission);
    
    const { data, error } = await supabase
      .from('form_submissions')
      .insert(snakeSubmission)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar submissão de formulário:', error);
      throw new Error(`Falha ao criar submissão: ${error.message}`);
    }
    
    return this.snakeToCamel(data);
  }

  async updateFormSubmissionStatus(id: number, status: string, processedById?: number): Promise<FormSubmission | undefined> {
    const updateData: any = { status };
    
    if (processedById) {
      updateData.processed_by_id = processedById;
      updateData.processed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('form_submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar status da submissão ${id}:`, error);
      return undefined;
    }
    
    return this.snakeToCamel(data);
  }

  async processFormSubmission(id: number, processedById: string | number): Promise<{client: Client, submission: FormSubmission} | undefined> {
    // Obter submissão
    const submission = await this.getFormSubmission(id);
    
    if (!submission) {
      console.error(`Submissão ${id} não encontrada`);
      return undefined;
    }
    
    // Criar cliente a partir dos dados da submissão
    const formData = submission.formData || {};
    
    try {
      // Criar cliente com os dados do formulário
      const newClient: InsertClient = {
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        cpf: formData.cpf || '',
        company: formData.company,
        contact: formData.contact,
        birthDate: formData.birthDate,
        convenioId: formData.convenioId ? Number(formData.convenioId) : undefined,
        organizationId: submission.organizationId,
        createdById: processedById.toString()
      };
      
      // Criar cliente no banco
      const client = await this.createClient(newClient);
      
      // Atualizar status da submissão
      const updatedSubmission = await this.updateFormSubmissionStatus(
        id, 
        'processed', 
        typeof processedById === 'string' ? parseInt(processedById) : processedById
      );
      
      if (!updatedSubmission) {
        throw new Error('Erro ao atualizar status da submissão');
      }
      
      return {
        client,
        submission: updatedSubmission
      };
    } catch (error) {
      console.error(`Erro ao processar submissão ${id}:`, error);
      return undefined;
    }
  }

  async getFormSubmissionsByTemplate(templateId: number): Promise<FormSubmission[]> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('template_id', templateId);
    
    if (error) {
      console.error(`Erro ao obter submissões do template ${templateId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getFormSubmissionsByStatus(status: string): Promise<FormSubmission[]> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('status', status);
    
    if (error) {
      console.error(`Erro ao obter submissões com status ${status}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }

  async getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error(`Erro ao obter submissões da organização ${organizationId}:`, error);
      return [];
    }
    
    return this.snakeToCamel(data || []);
  }
}

// Instância única para toda a aplicação
export const supabaseStorage = new SupabaseStorage();