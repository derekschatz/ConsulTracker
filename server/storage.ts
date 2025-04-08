import {
  type Client, type InsertClient,
  type Engagement, type InsertEngagement,
  type TimeLog, type InsertTimeLog,
  type Invoice, type InsertInvoice,
  type InvoiceLineItem, type InsertInvoiceLineItem,
  type TimeLogWithEngagement, type InvoiceWithLineItems,
  type User, type InsertUser,
  engagements, timeLogs, invoices, invoiceLineItems, users
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Modify the interface with any CRUD methods
export interface IStorage {
  // Authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Engagements
  getEngagements(userId?: number): Promise<Engagement[]>;
  getEngagement(id: number, userId?: number): Promise<Engagement | undefined>;
  getActiveEngagements(userId?: number): Promise<Engagement[]>;
  createEngagement(engagement: InsertEngagement): Promise<Engagement>;
  updateEngagement(id: number, engagement: Partial<InsertEngagement>, userId?: number): Promise<Engagement | undefined>;
  deleteEngagement(id: number, userId?: number): Promise<boolean>;

  // Time Logs
  getTimeLogs(userId?: number): Promise<TimeLogWithEngagement[]>;
  getTimeLogsByEngagement(engagementId: number, userId?: number): Promise<TimeLogWithEngagement[]>;
  getTimeLogsByDateRange(startDate: Date, endDate: Date, userId?: number): Promise<TimeLogWithEngagement[]>;
  getTimeLog(id: number, userId?: number): Promise<TimeLogWithEngagement | undefined>;
  createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog>;
  updateTimeLog(id: number, timeLog: Partial<InsertTimeLog>, userId?: number): Promise<TimeLog | undefined>;
  deleteTimeLog(id: number, userId?: number): Promise<boolean>;

  // Invoices
  getInvoices(userId?: number): Promise<InvoiceWithLineItems[]>;
  getInvoice(id: number, userId?: number): Promise<InvoiceWithLineItems | undefined>;
  getInvoicesByStatus(status: string, userId?: number): Promise<InvoiceWithLineItems[]>;
  createInvoice(invoice: InsertInvoice, lineItems: InsertInvoiceLineItem[]): Promise<InvoiceWithLineItems>;
  updateInvoiceStatus(id: number, status: string, userId?: number): Promise<Invoice | undefined>;
  deleteInvoice(id: number, userId?: number): Promise<boolean>;

  // Dashboard and Analytics
  getYtdRevenue(year: number, userId?: number): Promise<number>;
  getMonthlyRevenueBillable(year: number, userId?: number): Promise<{month: number, revenue: number, billableHours: number}[]>;
  getTotalHoursLogged(startDate: Date, endDate: Date, userId?: number): Promise<number>;
  getPendingInvoicesTotal(userId?: number): Promise<number>;
  
  // Session Store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  // Session store for authentication
  sessionStore: session.Store;

  constructor() {
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Engagement methods
  async getEngagements(userId?: number): Promise<Engagement[]> {
    if (userId) {
      return await db.select().from(engagements)
        .where(eq(engagements.userId, userId))
        .orderBy(desc(engagements.startDate));
    }
    return await db.select().from(engagements).orderBy(desc(engagements.startDate));
  }

  async getEngagement(id: number, userId?: number): Promise<Engagement | undefined> {
    let query = db.select().from(engagements).where(eq(engagements.id, id));
    if (userId) {
      query = query.where(eq(engagements.userId, userId));
    }
    const results = await query;
    return results.length > 0 ? results[0] : undefined;
  }

  async getActiveEngagements(userId?: number): Promise<Engagement[]> {
    let query = db.select().from(engagements)
      .where(eq(engagements.status, 'active'));
      
    if (userId) {
      query = query.where(eq(engagements.userId, userId));
    }
    
    return await query.orderBy(desc(engagements.startDate));
  }

  async createEngagement(engagement: InsertEngagement): Promise<Engagement> {
    const [newEngagement] = await db.insert(engagements).values(engagement).returning();
    return newEngagement;
  }

  async updateEngagement(id: number, engagement: Partial<InsertEngagement>, userId?: number): Promise<Engagement | undefined> {
    let condition = eq(engagements.id, id);
    if (userId) {
      condition = and(condition, eq(engagements.userId, userId));
    }
    
    const [updatedEngagement] = await db.update(engagements)
      .set(engagement)
      .where(condition)
      .returning();
    return updatedEngagement;
  }

  async deleteEngagement(id: number, userId?: number): Promise<boolean> {
    let condition = eq(engagements.id, id);
    if (userId) {
      condition = and(condition, eq(engagements.userId, userId));
    }
    
    const result = await db.delete(engagements).where(condition);
    return true; // Assuming success if no error thrown
  }

  // Time Logs methods
  async getTimeLogs(userId?: number): Promise<TimeLogWithEngagement[]> {
    let query = db.select().from(timeLogs);
    if (userId) {
      query = query.where(eq(timeLogs.userId, userId));
    }
    const logs = await query.orderBy(desc(timeLogs.date));
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLogsByEngagement(engagementId: number, userId?: number): Promise<TimeLogWithEngagement[]> {
    let query = db.select().from(timeLogs)
      .where(eq(timeLogs.engagementId, engagementId));
      
    if (userId) {
      query = query.where(eq(timeLogs.userId, userId));
    }
    
    const logs = await query.orderBy(desc(timeLogs.date));
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLogsByDateRange(startDate: Date, endDate: Date, userId?: number): Promise<TimeLogWithEngagement[]> {
    let conditions = and(
      gte(timeLogs.date, startDate),
      lte(timeLogs.date, endDate)
    );
    
    if (userId) {
      conditions = and(conditions, eq(timeLogs.userId, userId));
    }
    
    const logs = await db.select().from(timeLogs)
      .where(conditions)
      .orderBy(desc(timeLogs.date));
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLog(id: number, userId?: number): Promise<TimeLogWithEngagement | undefined> {
    let query = db.select().from(timeLogs).where(eq(timeLogs.id, id));
    if (userId) {
      query = query.where(eq(timeLogs.userId, userId));
    }
    const results = await query;
    if (results.length === 0) return undefined;
    return this.enrichTimeLog(results[0]);
  }

  async createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog> {
    console.log('Storage: Inserting time log into database:', timeLog);
    try {
      const [newTimeLog] = await db.insert(timeLogs).values(timeLog).returning();
      console.log('Storage: Time log created successfully:', newTimeLog);
      return newTimeLog;
    } catch (error) {
      console.error('Storage: Error creating time log:', error);
      throw error;
    }
  }

  async updateTimeLog(id: number, timeLog: Partial<InsertTimeLog>, userId?: number): Promise<TimeLog | undefined> {
    let condition = eq(timeLogs.id, id);
    if (userId) {
      condition = and(condition, eq(timeLogs.userId, userId));
    }
    
    const [updatedTimeLog] = await db.update(timeLogs)
      .set(timeLog)
      .where(condition)
      .returning();
    return updatedTimeLog;
  }

  async deleteTimeLog(id: number, userId?: number): Promise<boolean> {
    let condition = eq(timeLogs.id, id);
    if (userId) {
      condition = and(condition, eq(timeLogs.userId, userId));
    }
    
    await db.delete(timeLogs).where(condition);
    return true; // Assuming success if no error thrown
  }

  // Invoice methods
  async getInvoices(userId?: number): Promise<InvoiceWithLineItems[]> {
    let query = db.select().from(invoices);
    if (userId) {
      query = query.where(eq(invoices.userId, userId));
    }
    const allInvoices = await query.orderBy(desc(invoices.issueDate));
    return Promise.all(allInvoices.map(invoice => this.enrichInvoice(invoice)));
  }

  async getInvoice(id: number, userId?: number): Promise<InvoiceWithLineItems | undefined> {
    let query = db.select().from(invoices).where(eq(invoices.id, id));
    if (userId) {
      query = query.where(eq(invoices.userId, userId));
    }
    const results = await query;
    if (results.length === 0) return undefined;
    return this.enrichInvoice(results[0]);
  }

  async getInvoicesByStatus(status: string, userId?: number): Promise<InvoiceWithLineItems[]> {
    let query = db.select().from(invoices).where(eq(invoices.status, status));
    if (userId) {
      query = query.where(eq(invoices.userId, userId));
    }
    const statusInvoices = await query.orderBy(desc(invoices.issueDate));
    return Promise.all(statusInvoices.map(invoice => this.enrichInvoice(invoice)));
  }

  async createInvoice(invoice: InsertInvoice, lineItems: InsertInvoiceLineItem[]): Promise<InvoiceWithLineItems> {
    // Insert invoice
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    
    // Insert line items with the invoice ID
    if (lineItems.length > 0) {
      const lineItemsWithInvoiceId = lineItems.map(item => ({
        ...item,
        invoiceId: newInvoice.id
      }));
      await db.insert(invoiceLineItems).values(lineItemsWithInvoiceId);
    }
    
    return this.enrichInvoice(newInvoice);
  }

  async updateInvoiceStatus(id: number, status: string, userId?: number): Promise<Invoice | undefined> {
    let condition = eq(invoices.id, id);
    if (userId) {
      condition = and(condition, eq(invoices.userId, userId));
    }
    
    const [updatedInvoice] = await db.update(invoices)
      .set({ status })
      .where(condition)
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number, userId?: number): Promise<boolean> {
    let condition = eq(invoiceLineItems.invoiceId, id);
    
    // For invoice condition, add user ID check if provided
    let invoiceCondition = eq(invoices.id, id);
    if (userId) {
      invoiceCondition = and(invoiceCondition, eq(invoices.userId, userId));
    }
    
    // Delete related line items first
    await db.delete(invoiceLineItems).where(condition);
    // Then delete the invoice
    await db.delete(invoices).where(invoiceCondition);
    return true; // Assuming success if no error thrown
  }

  // Dashboard and Analytics methods
  async getYtdRevenue(year: number, userId?: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    let conditions = and(
      eq(invoices.status, 'paid'),
      gte(invoices.issueDate, startOfYear),
      lte(invoices.issueDate, endOfYear)
    );
    
    if (userId) {
      conditions = and(conditions, eq(invoices.userId, userId));
    }

    const result = await db.select({
      total: sql<number>`sum(${invoices.amount})`
    })
    .from(invoices)
    .where(conditions);

    return result[0]?.total || 0;
  }

  async getMonthlyRevenueBillable(year: number, userId?: number): Promise<{month: number, revenue: number, billableHours: number}[]> {
    // Initialize months
    const result: {month: number, revenue: number, billableHours: number}[] = [];
    for (let month = 0; month < 12; month++) {
      result.push({ month, revenue: 0, billableHours: 0 });
    }

    // Get revenue from paid invoices
    let invoiceConditions = and(
      eq(invoices.status, 'paid'),
      sql`extract(year from ${invoices.issueDate}) = ${year}`
    );
    
    if (userId) {
      invoiceConditions = and(invoiceConditions, eq(invoices.userId, userId));
    }
    
    const paidInvoices = await db.select({
      month: sql<number>`extract(month from ${invoices.issueDate}) - 1`,
      amount: invoices.amount
    })
    .from(invoices)
    .where(invoiceConditions);

    for (const invoice of paidInvoices) {
      const month = invoice.month;
      if (month >= 0 && month < 12) {
        result[month].revenue += Number(invoice.amount);
      }
    }

    // Get billable hours from time logs
    let logConditions = sql`extract(year from ${timeLogs.date}) = ${year}`;
    
    if (userId) {
      logConditions = and(logConditions, eq(timeLogs.userId, userId));
    }
    
    const yearLogs = await db.select({
      month: sql<number>`extract(month from ${timeLogs.date}) - 1`,
      hours: timeLogs.hours
    })
    .from(timeLogs)
    .where(logConditions);

    for (const log of yearLogs) {
      const month = log.month;
      if (month >= 0 && month < 12) {
        result[month].billableHours += Number(log.hours);
      }
    }

    return result;
  }

  async getTotalHoursLogged(startDate: Date, endDate: Date, userId?: number): Promise<number> {
    let conditions = and(
      gte(timeLogs.date, startDate),
      lte(timeLogs.date, endDate)
    );
    
    if (userId) {
      conditions = and(conditions, eq(timeLogs.userId, userId));
    }
    
    const result = await db.select({
      total: sql<number>`sum(${timeLogs.hours})`
    })
    .from(timeLogs)
    .where(conditions);

    return result[0]?.total || 0;
  }

  async getPendingInvoicesTotal(userId?: number): Promise<number> {
    // Use the correct status enum values from the schema
    let conditions = sql`(${invoices.status} = 'submitted' OR ${invoices.status} = 'overdue')`;
    
    if (userId) {
      conditions = and(conditions, eq(invoices.userId, userId));
    }
    
    // Add debug logging
    console.log(`Getting pending invoices total for userId: ${userId || 'all'}`);
    
    const result = await db.select({
      total: sql<number>`COALESCE(sum(${invoices.amount}), 0)`
    })
    .from(invoices)
    .where(conditions);

    // The COALESCE ensures that NULL is converted to 0
    // But we'll still add a fallback to handle any unexpected results
    const total = result[0]?.total !== null && result[0]?.total !== undefined ? 
      result[0].total : 0;
      
    console.log(`Pending invoices total: ${total}`);
    return total;
  }

  // Helper methods
  private async enrichTimeLog(timeLog: TimeLog): Promise<TimeLogWithEngagement> {
    // Get the engagement for this time log
    let engagement: Engagement | undefined;
    const engagementResults = await db.select().from(engagements).where(eq(engagements.id, timeLog.engagementId));
    
    if (engagementResults.length > 0) {
      engagement = engagementResults[0];
    } else {
      // Fallback if engagement doesn't exist
      engagement = {
        id: timeLog.engagementId,
        clientName: "Unknown Client",
        projectName: "Unknown Project",
        hourlyRate: "0",
        startDate: new Date(),
        endDate: new Date(),
        description: "",
        status: "unknown"
      } as Engagement;
    }

    const billableAmount = Number(timeLog.hours) * Number(engagement.hourlyRate);
    
    return {
      ...timeLog,
      engagement,
      billableAmount
    };
  }

  private async enrichInvoice(invoice: Invoice): Promise<InvoiceWithLineItems> {
    try {
      if (!invoice || !invoice.id) {
        console.error('Invalid invoice passed to enrichInvoice:', invoice);
        throw new Error('Invalid invoice data');
      }
      
      // Get the line items for this invoice
      const lineItems = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoice.id));
      
      console.log(`Retrieved ${lineItems.length} line items for invoice ${invoice.id} (${invoice.invoiceNumber})`);
      
      // Convert numeric types to ensure consistency
      const processedLineItems = lineItems.map(item => ({
        ...item,
        // Ensure numeric values are properly converted
        hours: Number(item.hours),
        rate: item.rate.toString(),
        amount: item.amount.toString()
      }));
      
      const totalHours = processedLineItems.reduce((total, item) => total + Number(item.hours), 0);
      
      return {
        ...invoice,
        lineItems: processedLineItems,
        totalHours
      };
    } catch (error) {
      console.error(`Error enriching invoice ${invoice?.id}:`, error);
      // Return basic data without line items rather than failing completely
      return {
        ...invoice,
        lineItems: [],
        totalHours: 0
      };
    }
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
