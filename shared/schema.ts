import { pgTable, text, serial, integer, timestamp, numeric, doublePrecision, varchar, boolean } from "drizzle-orm/pg-core";
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
  
  // Normalize all dates to midnight to avoid time-of-day comparisons
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  // For debugging
  console.log('Status check:', {
    today: normalizedToday.toISOString().split('T')[0],
    start: normalizedStart.toISOString().split('T')[0],
    end: normalizedEnd.toISOString().split('T')[0]
  });
  
  if (normalizedToday > normalizedEnd) {
    return 'completed';
  } else if (normalizedToday < normalizedStart) {
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

// Define engagement type enum
export const engagementTypeEnum = z.enum(['hourly', 'project']);
export type EngagementType = z.infer<typeof engagementTypeEnum>;

// Client table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  billingContactName: text("billing_contact_name"),
  billingContactEmail: text("billing_contact_email"),
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country"),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  engagements: many(engagements)
}));

export const insertClientSchema = createInsertSchema(clients).pick({
  userId: true,
  name: true,
  billingContactName: true,
  billingContactEmail: true,
  billingAddress: true,
  billingCity: true,
  billingState: true,
  billingZip: true,
  billingCountry: true,
});

// Engagements table
export const engagements = pgTable("engagements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  projectName: text("project_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  engagementType: text("engagement_type").notNull().default('hourly'),
  hourlyRate: numeric("hourly_rate"),
  projectAmount: numeric("project_amount"),
  description: text("description"),
  status: text("status").notNull().default('active'),
  netTerms: integer("net_terms").default(30),
});

export const engagementsRelations = relations(engagements, ({ many, one }) => ({
  timeLogs: many(timeLogs),
  invoices: many(invoices),
  client: one(clients, {
    fields: [engagements.clientId],
    references: [clients.id]
  })
}));

export const insertEngagementSchema = z.object({
  userId: z.number(),
  clientId: z.number(),
  projectName: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  engagementType: engagementTypeEnum.default('hourly'),
  hourlyRate: z.number().positive('Hourly rate must be positive').optional().nullable(),
  projectAmount: z.number().positive('Project amount must be positive').optional().nullable(),
  description: z.string().optional(),
  status: z.string().default('active'),
  netTerms: z.number().int().min(1).default(30)
}).refine(
  (data) => {
    if (data.engagementType === 'hourly') {
      return data.hourlyRate !== undefined && data.hourlyRate !== null;
    } else if (data.engagementType === 'project') {
      return data.projectAmount !== undefined && data.projectAmount !== null;
    }
    return false;
  },
  {
    message: "Hourly rate is required for hourly engagements, or project amount is required for project engagements",
    path: ['engagementType'],
  }
);

// Time logs table
export const timeLogs = pgTable("time_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  engagementId: integer("engagement_id").notNull(),
  date: timestamp("date").notNull(),
  hours: doublePrecision("hours").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  engagement: one(engagements, {
    fields: [timeLogs.engagementId],
    references: [engagements.id]
  })
}));

export const insertTimeLogSchema = z.object({
  userId: z.number(),
  engagementId: z.number(),
  date: z.date(),
  hours: z.number()
    .positive('Hours must be positive')
    .max(8, 'Hours cannot exceed 8 per entry'),
  description: z.string().nullable().optional()
});

// Invoices table - updated with totalHours and renamed amount to totalAmount for clarity
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  engagementId: integer("engagement_id").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  totalHours: doublePrecision("total_hours").notNull(),
  status: text("status").notNull().default('submitted'),
  notes: text("notes"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  projectName: text("project_name"),
  billingContactName: text("billing_contact_name"),
  billingContactEmail: text("billing_contact_email"),
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country"),
});

export const invoicesRelations = relations(invoices, ({ one }) => ({
  engagement: one(engagements, {
    fields: [invoices.engagementId],
    references: [engagements.id]
  })
}));

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  userId: true,
  invoiceNumber: true,
  clientName: true,
  engagementId: true,
  issueDate: true,
  dueDate: true,
  totalAmount: true,
  totalHours: true,
  status: true,
  notes: true,
  periodStart: true,
  periodEnd: true,
  projectName: true,
  billingContactName: true,
  billingContactEmail: true,
  billingAddress: true,
  billingCity: true,
  billingState: true,
  billingZip: true,
  billingCountry: true,
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

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  used: boolean("used").notNull().default(false),
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
}));

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

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Extended types with computed fields
export type TimeLogWithEngagement = TimeLog & {
  engagement: Engagement;
  billableAmount: number;
  clientName?: string;
};

// Add interface for line items
export interface InvoiceLineItem {
  id?: number;
  invoiceId: number;
  timeLogId?: number;
  description: string;
  hours: number;
  rate: number | string;
  amount: number | string;
}

// Extended invoice type with line items for client code
export interface InvoiceWithLineItems extends Invoice {
  lineItems: InvoiceLineItem[];
  line_items?: InvoiceLineItem[]; // For backward compatibility
}
