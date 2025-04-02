import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export enum UserRole {
  AGENT = 'agent',
  MANAGER = 'manager',
  SUPERADMIN = 'superadmin'
}

// Organization table - Para agrupar usuários da mesma empresa/organização
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"), // Endereço da empresa
  phone: text("phone"), // Telefone de contato
  cnpj: text("cnpj"), // CNPJ da empresa
  email: text("email"), // Email de contato
  website: text("website"), // Site da empresa
  description: text("description"), // Descrição ou observações
  logo: text("logo"), // URL da logo
  createdAt: timestamp("created_at").defaultNow()
});

// User sectors enum
export enum UserSector {
  COMMERCIAL = 'Comercial',
  OPERATIONAL = 'Operacional',
  FINANCIAL = 'Financeiro'
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Note: Não armazenamos senhas diretamente, o Supabase fará isso por nós 
  role: text("role").notNull().default(UserRole.AGENT),
  sector: text("sector"), // Setor: Comercial, Operacional, Financeiro
  organizationId: integer("organization_id").references(() => organizations.id), // ID da organização do usuário
  password: text("password"), // Armazenado com hash
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Convenios (agreements) table
export const convenios = pgTable("convenios", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price")
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price")
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cpf: text("cpf"),
  phone: text("phone"),
  convenioId: integer("convenio_id").references(() => convenios.id),
  birthDate: text("birth_date"),
  contact: text("contact"),
  email: text("email"),
  company: text("company"),
  createdById: integer("created_by_id").references(() => users.id), // ID do usuário que criou o cliente
  organizationId: integer("organization_id").references(() => organizations.id), // ID da organização do cliente
  createdAt: timestamp("created_at").defaultNow()
});

// Banks table
export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price")
});

// Proposals table
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  productId: integer("product_id").references(() => products.id),
  convenioId: integer("convenio_id").references(() => convenios.id),
  bankId: integer("bank_id").references(() => banks.id),
  value: text("value"),
  comments: text("comments"),
  status: text("status").notNull(), // 'em_negociacao', 'aceita', 'em_analise', 'recusada'
  createdById: integer("created_by_id").references(() => users.id), // ID do usuário que criou a proposta
  organizationId: integer("organization_id").references(() => organizations.id), // ID da organização da proposta
  createdAt: timestamp("created_at").defaultNow()
});

// Kanban table
export const kanban = pgTable("kanban", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  column: text("column").notNull(), // 'lead', 'qualificacao', 'negociacao', 'fechamento'
  position: integer("position").notNull() // Order in column
});

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertConvenioSchema = createInsertSchema(convenios).omit({ id: true });
export const insertBankSchema = createInsertSchema(banks).omit({ id: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true });
export const insertKanbanSchema = createInsertSchema(kanban).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });

// Schemas personalizados
export const userPasswordSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export const registerUserSchema = insertUserSchema.merge(userPasswordSchema);

// Select types
export type Client = typeof clients.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Convenio = typeof convenios.$inferSelect;
export type Bank = typeof banks.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type Kanban = typeof kanban.$inferSelect;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;

// Insert types
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertConvenio = z.infer<typeof insertConvenioSchema>;
export type InsertBank = z.infer<typeof insertBankSchema>;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type InsertKanban = z.infer<typeof insertKanbanSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

// Extended types
export type ClientWithKanban = Client & {
  kanban?: Kanban;
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
