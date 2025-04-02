import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  status: text("status").notNull(), // 'em_negociacao', 'aceita', 'em_analise', 'recusada'
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

// Select types
export type Client = typeof clients.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Convenio = typeof convenios.$inferSelect;
export type Bank = typeof banks.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type Kanban = typeof kanban.$inferSelect;

// Insert types
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertConvenio = z.infer<typeof insertConvenioSchema>;
export type InsertBank = z.infer<typeof insertBankSchema>;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type InsertKanban = z.infer<typeof insertKanbanSchema>;

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
