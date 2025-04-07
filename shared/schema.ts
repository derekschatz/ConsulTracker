import { pgTable, text, serial, integer, timestamp, numeric, doublePrecision, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Define engagement status enum
export const engagementStatusEnum = z.enum(['active', 'completed', 'upcoming']);
export type EngagementStatus = z.infer<typeof engagementStatusEnum>;

/**
 * Calculate the engagement status based on start and end dates
 * @param startDate The engagement start date
 * @param endDate The engagement end date
 * @returns The calculated engagement status
 */
export function calculateEngagementStatus(startDate: Date, endDate: Date): EngagementStatus {
  const today = new Date();
  
  if (today > endDate) {
    return 'completed';
  } else if (today < startDate) {
    return 'upcoming';
  } else {
    return 'active';
  }
}

// Define invoice status enum
// submitted: initial status when invoice is created
// paid: marked as paid by user
// overdue: automatically set when due date passes (for submitted invoices)
export const invoiceStatusEnum = z.enum(['submitted', 'paid', 'overdue']);
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;

// Client table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  engagements: many(engagements)
}));

export const insertClientSchema = createInsertSchema(clients).pick({
  userId: true,
  name: true,
});

// Engagements table
export const engagements = pgTable("engagements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clientName: text("client_name").notNull(),
  projectName: text("project_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  hourlyRate: numeric("hourly_rate").notNull(),
  description: text("description"),
  status: text("status").notNull().default('active')
});

export const engagementsRelations = relations(engagements, ({ many }) => ({
  timeLogs: many(timeLogs),
  invoices: many(invoices)
}));

export const insertEngagementSchema = createInsertSchema(engagements).pick({
  userId: true,
  clientName: true,
  projectName: true,
  startDate: true,
  endDate: true, 
  hourlyRate: true,
  description: true,
  status: true,
});

// Time logs table
export const timeLogs = pgTable("time_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  engagementId: integer("engagement_id").notNull(),
  date: timestamp("date").notNull(),
  hours: doublePrecision("hours").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  engagement: one(engagements, {
    fields: [timeLogs.engagementId],
    references: [engagements.id]
  })
}));

export const insertTimeLogSchema = createInsertSchema(timeLogs).pick({
  userId: true,
  engagementId: true,
  date: true,
  hours: true,
  description: true,
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  engagementId: integer("engagement_id").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull().default('submitted'),
  notes: text("notes"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  projectName: text("project_name"),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  engagement: one(engagements, {
    fields: [invoices.engagementId],
    references: [engagements.id]
  }),
  lineItems: many(invoiceLineItems)
}));

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  userId: true,
  invoiceNumber: true,
  clientName: true,
  engagementId: true,
  issueDate: true,
  dueDate: true,
  amount: true,
  status: true,
  notes: true,
  periodStart: true,
  periodEnd: true,
  projectName: true,
});

// Invoice line items table
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  timeLogId: integer("time_log_id"), // Making this optional to support manual line items
  description: text("description").notNull(),
  hours: doublePrecision("hours").notNull(),
  rate: numeric("rate").notNull(),
  amount: numeric("amount").notNull(),
});

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id]
  }),
  timeLog: one(timeLogs, {
    fields: [invoiceLineItems.timeLogId],
    references: [timeLogs.id]
  })
}));

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).pick({
  invoiceId: true,
  timeLogId: true,
  description: true,
  hours: true,
  rate: true,
  amount: true,
});

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
});

// Type definitions
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Engagement = typeof engagements.$inferSelect;
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;

export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Extended types with computed fields
export type TimeLogWithEngagement = TimeLog & {
  engagement: Engagement;
  billableAmount: number;
};

export type InvoiceWithLineItems = Invoice & {
  lineItems: InvoiceLineItem[];
  totalHours: number;
};
