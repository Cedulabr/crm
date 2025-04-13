import { z } from "zod";

// User roles
export enum UserRole {
  AGENT = 'agent',
  MANAGER = 'manager',
  SUPERADMIN = 'superadmin'
}

// User sectors enum
export enum UserSector {
  COMMERCIAL = 'Comercial',
  OPERATIONAL = 'Operacional',
  FINANCIAL = 'Financeiro'
}

// Definição de tipos de dados para uso com Supabase
// Os nomes de campos em camelCase são usados no frontend, mas o banco usa snake_case

export interface Organization {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  cnpj?: string;
  email?: string;
  website?: string;
  description?: string;
  logo?: string;
  created_at?: string;
  // Campos em camelCase para uso no frontend
  createdAt?: string;
}

export interface User {
  id: string; // UUID do Supabase
  name: string;
  email: string;
  role: string;
  sector?: string;
  organization_id?: number;
  password?: string; // Usado apenas para armazenamento local, nunca enviado para Supabase
  created_at?: string;
  updated_at?: string;
  // Campos em camelCase para uso no frontend
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Convenio {
  id: number;
  name: string;
  price?: string;
}

export interface Product {
  id: number;
  name: string;
  price?: string;
}

export interface Client {
  id: number;
  name: string;
  cpf?: string;
  phone?: string;
  convenio_id?: number;
  birth_date?: string;
  contact?: string;
  email?: string;
  company?: string;
  created_by_id?: string; // UUID do usuário que criou
  organization_id?: number;
  created_at?: string;
  // Campos em camelCase para uso no frontend
  convenioId?: number;
  birthDate?: string;
  createdById?: string;
  organizationId?: number;
  createdAt?: string;
}

export interface Bank {
  id: number;
  name: string;
  price?: string;
}

export interface Proposal {
  id: number;
  client_id?: number;
  product_id?: number;
  convenio_id?: number;
  bank_id?: number;
  value?: string;
  comments?: string;
  status: string; // 'em_negociacao', 'aceita', 'em_analise', 'recusada'
  created_by_id?: string; // UUID do usuário que criou
  organization_id?: number;
  created_at?: string;
  // Campos em camelCase para uso no frontend
  clientId?: number;
  productId?: number;
  convenioId?: number;
  bankId?: number;
  createdById?: string;
  organizationId?: number;
  createdAt?: string;
}

// Tipos de campos de formulário
export enum FormFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  EMAIL = 'email',
  PHONE = 'phone',
  DATE = 'date',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  TEXTAREA = 'textarea',
  CPF = 'cpf',
  CNPJ = 'cnpj',
  CURRENCY = 'currency'
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean | null;
  placeholder?: string;
  helpText?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface FormTemplate {
  id: number;
  name: string;
  description?: string;
  kanban_column?: string;
  fields?: FormField[];
  active?: boolean;
  created_by_id?: string; // UUID do usuário que criou
  organization_id?: number;
  created_at?: string;
  updated_at?: string;
  // Campos em camelCase para uso no frontend
  kanbanColumn?: string;
  createdById?: string;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormSubmission {
  id: number;
  form_template_id?: number;
  data: any; // Dados submetidos no formulário
  form_data?: Record<string, any>; // Formato alternativo de dados do formulário (compatibilidade) 
  client_id?: number;
  status?: string; // 'novo', 'processado', 'rejeitado'
  processed_by_id?: string; // UUID do usuário que processou
  organization_id?: number;
  created_at?: string;
  updated_at?: string;
  // Campos em camelCase para uso no frontend
  formTemplateId?: number;
  formData?: Record<string, any>; // Formato camelCase para dados do formulário
  clientId?: number;
  processedById?: string;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Schemas Zod para validação

export const userPasswordSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export const insertClientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  convenioId: z.number().optional(),
  birthDate: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email("Email inválido").optional(),
  company: z.string().optional(),
  createdById: z.string().optional(),
  organizationId: z.number().optional(),
});

export const insertProductSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  price: z.string().optional(),
});

export const insertConvenioSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  price: z.string().optional(),
});

export const insertBankSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  price: z.string().optional(),
});

export const insertProposalSchema = z.object({
  clientId: z.number().optional(),
  productId: z.number().optional(),
  convenioId: z.number().optional(),
  bankId: z.number().optional(),
  value: z.string().optional(),
  comments: z.string().optional(),
  status: z.string().min(1, "Status é obrigatório"),
  createdById: z.string().optional(),
  organizationId: z.number().optional(),
});

export const insertUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  role: z.string().default(UserRole.AGENT),
  sector: z.string().optional(),
  organizationId: z.number().optional(),
  password: z.string().optional(), // Campo opcional, mas importante para algumas operações
});

export const registerUserSchema = insertUserSchema.merge(userPasswordSchema);

export const insertOrganizationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  address: z.string().optional(),
  phone: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email("Email inválido").optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
});

export const insertFormTemplateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  kanbanColumn: z.string().default("lead"),
  fields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    type: z.nativeEnum(FormFieldType),
    required: z.boolean().default(false),
    options: z.array(z.object({
      label: z.string(),
      value: z.string()
    })).optional(),
    defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    validation: z.object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional()
    }).optional()
  })).optional(),
  active: z.boolean().default(true),
  createdById: z.string().optional(),
  organizationId: z.number().optional(),
});

export const insertFormSubmissionSchema = z.object({
  formTemplateId: z.number().optional(),
  data: z.any(),
  status: z.string().default("novo"),
  organizationId: z.number().optional(),
});

// Define tipos para inserção
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertConvenio = z.infer<typeof insertConvenioSchema>;
export type InsertBank = z.infer<typeof insertBankSchema>;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;

// Tipos estendidos para uso na aplicação
export type ClientWithStats = Client & {
  proposalCount?: number;
  totalValue?: string | number | null;
};

export type ClientWithProposals = Client & {
  proposals?: Proposal[];
};

export type ProposalWithDetails = Proposal & {
  client?: Client;
  product?: Product;
  convenio?: Convenio;
  bank?: Bank;
};

export type UserWithOrganization = User & {
  organization?: Organization;
};

export type AuthData = {
  token: string;
  user: UserWithOrganization;
};
