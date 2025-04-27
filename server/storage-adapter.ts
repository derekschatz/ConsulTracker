/**
 * Storage Adapter
 * 
 * This file adapts the existing storage implementation to match our 
 * DatabaseStorage interface. It serves as a compatibility layer.
 */

import { storage } from './storage';
import { 
  DatabaseStorage, 
  User, 
  Client, 
  Engagement, 
  TimeLog, 
  Invoice, 
  InvoiceLineItem,
  InvoiceWithLineItems,
  TimeLogWithEngagement,
  EngagementWithClient
} from './database-storage';

/**
 * Adapter to make the existing storage compatible with our interface
 */
class StorageAdapter implements DatabaseStorage {
  // Authentication
  async getUser(id: number): Promise<User | undefined> {
    return storage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return storage.getUserByUsername(username);
  }

  async createUser(user: Partial<User>): Promise<User> {
    return storage.createUser(user as any);
  }
  
  // Clients
  async getClients(userId?: number): Promise<Client[]> {
    return storage.getClients(userId);
  }

  async getClient(id: number, userId?: number): Promise<Client | undefined> {
    return storage.getClient(id, userId);
  }

  async createClient(client: Partial<Client>): Promise<Client> {
    return storage.createClient(client as any);
  }

  async updateClient(id: number, client: Partial<Client>, userId?: number): Promise<Client | undefined> {
    return storage.updateClient(id, client as any, userId);
  }

  async deleteClient(id: number, userId?: number): Promise<boolean> {
    return storage.deleteClient(id, userId);
  }
  
  // Engagements
  async getEngagements(userId?: number): Promise<Engagement[]> {
    return storage.getEngagements(userId);
  }

  async getEngagement(id: number, userId?: number): Promise<Engagement | undefined> {
    return storage.getEngagement(id, userId);
  }

  async getEngagementWithClient(id: number, userId?: number): Promise<EngagementWithClient | undefined> {
    return storage.getEngagementWithClient(id, userId) as EngagementWithClient;
  }

  async getActiveEngagements(userId?: number): Promise<Engagement[]> {
    return storage.getActiveEngagements(userId);
  }

  async createEngagement(engagement: Partial<Engagement>): Promise<Engagement> {
    return storage.createEngagement(engagement as any);
  }

  async updateEngagement(id: number, engagement: Partial<Engagement>, userId?: number): Promise<Engagement | undefined> {
    return storage.updateEngagement(id, engagement as any, userId);
  }

  async deleteEngagement(id: number, userId?: number): Promise<boolean> {
    return storage.deleteEngagement(id, userId);
  }

  // Time Logs
  async getTimeLogs(userId?: number): Promise<TimeLogWithEngagement[]> {
    return storage.getTimeLogs(userId) as TimeLogWithEngagement[];
  }

  async getTimeLog(id: number, userId?: number): Promise<TimeLog | undefined> {
    return storage.getTimeLog(id, userId);
  }

  async getTimeLogsByEngagement(engagementId: number, userId?: number): Promise<TimeLog[]> {
    return storage.getTimeLogsByEngagement(engagementId, userId);
  }

  async createTimeLog(timeLog: Partial<TimeLog>): Promise<TimeLog> {
    return storage.createTimeLog(timeLog as any);
  }

  async updateTimeLog(id: number, timeLog: Partial<TimeLog>, userId?: number): Promise<TimeLog | undefined> {
    return storage.updateTimeLog(id, timeLog as any, userId);
  }

  async deleteTimeLog(id: number, userId?: number): Promise<boolean> {
    return storage.deleteTimeLog(id, userId);
  }

  // Invoices
  async getInvoices(userId?: number): Promise<Invoice[]> {
    return storage.getInvoices(userId);
  }

  async getInvoice(id: number, userId?: number): Promise<Invoice | undefined> {
    return storage.getInvoice(id, userId);
  }

  async getInvoiceWithLineItems(id: number, userId?: number): Promise<InvoiceWithLineItems | undefined> {
    // Adapt the existing storage method or implement a new one
    const invoice = await storage.getInvoice(id, userId);
    if (!invoice) return undefined;
    
    const lineItems = await this.getInvoiceLineItems(id);
    return { ...invoice, lineItems } as InvoiceWithLineItems;
  }

  async createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
    return storage.createInvoice(invoice as any);
  }

  async updateInvoice(id: number, invoice: Partial<Invoice>, userId?: number): Promise<Invoice | undefined> {
    return storage.updateInvoice(id, invoice as any, userId);
  }

  async deleteInvoice(id: number, userId?: number): Promise<boolean> {
    return storage.deleteInvoice(id, userId);
  }
  
  // Invoice Line Items
  async getInvoiceLineItems(invoiceId: number): Promise<InvoiceLineItem[]> {
    // You may need to implement these if they don't exist in the original storage
    return storage.getInvoiceItems(invoiceId);
  }

  async createInvoiceLineItem(lineItem: Partial<InvoiceLineItem>): Promise<InvoiceLineItem> {
    return storage.createInvoiceItem(lineItem as any);
  }

  async updateInvoiceLineItem(id: number, lineItem: Partial<InvoiceLineItem>): Promise<InvoiceLineItem | undefined> {
    return storage.updateInvoiceItem(id, lineItem as any);
  }

  async deleteInvoiceLineItem(id: number): Promise<boolean> {
    return storage.deleteInvoiceItem(id);
  }
}

// Export a singleton instance
export const storageAdapter = new StorageAdapter(); 