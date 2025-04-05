import { 
  clients, 
  products, 
  convenios, 
  banks, 
  proposals,
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

export { supabaseStorage as storage } from './services/supabase-storage';
