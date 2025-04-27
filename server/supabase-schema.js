/**
 * Supabase Schema Configuration
 * 
 * This file provides a simplified schema configuration for Supabase migration.
 * It contains JavaScript versions of the table definitions to avoid TypeScript errors.
 */

const { pgTable, text, serial, integer, timestamp, numeric, varchar } = require('drizzle-orm/pg-core');

// Define tables using JavaScript to avoid TypeScript errors
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  country: text('country'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  billingContactName: text('billing_contact_name'),
  billingContactEmail: text('billing_contact_email'),
  billingAddress: text('billing_address'),
  billingCity: text('billing_city'),
  billingState: text('billing_state'),
  billingZip: text('billing_zip'),
  billingCountry: text('billing_country'),
});

const engagements = pgTable('engagements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  clientId: integer('client_id').notNull(),
  projectName: text('project_name').notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  hourlyRate: numeric('hourly_rate'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  type: text('type').default('hourly'),
  totalCost: numeric('total_cost'),
});

const timeLogs = pgTable('time_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  engagementId: integer('engagement_id').notNull(),
  date: timestamp('date').notNull(),
  hours: numeric('hours').notNull(),
  description: text('description'),
  billable: integer('billable').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  clientId: integer('client_id'),
  engagementId: integer('engagement_id'),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  totalAmount: numeric('total_amount'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  billingContactName: text('billing_contact_name'),
  billingContactEmail: text('billing_contact_email'),
  billingAddress: text('billing_address'),
  billingCity: text('billing_city'),
  billingState: text('billing_state'),
  billingZip: text('billing_zip'),
  billingCountry: text('billing_country'),
  milestoneName: text('milestone_name'),
  amountDue: numeric('amount_due'),
});

const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity').notNull(),
  rate: numeric('rate'),
  amount: numeric('amount').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const businessInfo = pgTable('business_info', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  businessName: text('business_name'),
  businessEmail: text('business_email'),
  businessPhone: text('business_phone'),
  businessAddress: text('business_address'),
  businessCity: text('business_city'),
  businessState: text('business_state'),
  businessZip: text('business_zip'),
  businessCountry: text('business_country'),
  businessLogo: text('business_logo'),
  paymentInstructions: text('payment_instructions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

module.exports = {
  users,
  clients,
  engagements,
  timeLogs,
  invoices,
  invoiceItems,
  businessInfo
}; 