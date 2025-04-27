/**
 * Database Storage Interface
 * 
 * This file defines the interface for database storage operations.
 */

// Define basic types for database entities
export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
}

export interface Client {
  id: number;
  userId: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  notes?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
}

export interface Engagement {
  id: number;
  userId: number;
  clientId: number;
  projectName: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  hourlyRate?: string;
  totalCost?: string;
  status: string;
  type: string;
}

export interface TimeLog {
  id: number;
  userId: number;
  engagementId: number;
  date: Date;
  hours: number;
  description?: string;
  billable: boolean;
}

export interface Invoice {
  id: number;
  userId: number;
  invoiceNumber: string;
  clientId?: number;
  engagementId?: number;
  issueDate: Date;
  dueDate: Date;
  status: string;
  notes?: string;
  totalAmount?: string;
  periodStart?: Date;
  periodEnd?: Date;
  billingContactName?: string;
  billingContactEmail?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  milestoneName?: string;
  amountDue?: string;
}

export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  rate?: number;
  amount: number;
  timeLogId?: number;
}

export interface InvoiceWithLineItems extends Invoice {
  lineItems: InvoiceLineItem[];
}

export interface TimeLogWithEngagement extends TimeLog {
  engagement?: Engagement;
}

export interface EngagementWithClient extends Engagement {
  client?: Client;
}

// Main database storage interface
export interface DatabaseStorage {
  // Authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  
  // Clients
  getClients(userId?: number): Promise<Client[]>;
  getClient(id: number, userId?: number): Promise<Client | undefined>;
  createClient(client: Partial<Client>): Promise<Client>;
  updateClient(id: number, client: Partial<Client>, userId?: number): Promise<Client | undefined>;
  deleteClient(id: number, userId?: number): Promise<boolean>;
  
  // Engagements
  getEngagements(userId?: number): Promise<Engagement[]>;
  getEngagement(id: number, userId?: number): Promise<Engagement | undefined>;
  getEngagementWithClient(id: number, userId?: number): Promise<EngagementWithClient | undefined>;
  getActiveEngagements(userId?: number): Promise<Engagement[]>;
  createEngagement(engagement: Partial<Engagement>): Promise<Engagement>;
  updateEngagement(id: number, engagement: Partial<Engagement>, userId?: number): Promise<Engagement | undefined>;
  deleteEngagement(id: number, userId?: number): Promise<boolean>;

  // Time Logs
  getTimeLogs(userId?: number): Promise<TimeLogWithEngagement[]>;
  getTimeLog(id: number, userId?: number): Promise<TimeLog | undefined>;
  getTimeLogsByEngagement(engagementId: number, userId?: number): Promise<TimeLog[]>;
  createTimeLog(timeLog: Partial<TimeLog>): Promise<TimeLog>;
  updateTimeLog(id: number, timeLog: Partial<TimeLog>, userId?: number): Promise<TimeLog | undefined>;
  deleteTimeLog(id: number, userId?: number): Promise<boolean>;

  // Invoices
  getInvoices(userId?: number): Promise<Invoice[]>;
  getInvoice(id: number, userId?: number): Promise<Invoice | undefined>;
  getInvoiceWithLineItems(id: number, userId?: number): Promise<InvoiceWithLineItems | undefined>;
  createInvoice(invoice: Partial<Invoice>): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>, userId?: number): Promise<Invoice | undefined>;
  deleteInvoice(id: number, userId?: number): Promise<boolean>;
  
  // Invoice Line Items
  getInvoiceLineItems(invoiceId: number): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(lineItem: Partial<InvoiceLineItem>): Promise<InvoiceLineItem>;
  updateInvoiceLineItem(id: number, lineItem: Partial<InvoiceLineItem>): Promise<InvoiceLineItem | undefined>;
  deleteInvoiceLineItem(id: number): Promise<boolean>;
} 