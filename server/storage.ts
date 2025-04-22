import {
  type Client, type InsertClient,
  type Engagement, type InsertEngagement,
  type TimeLog, type InsertTimeLog,
  type Invoice, type InsertInvoice, type InvoiceWithLineItems,
  type TimeLogWithEngagement,
  type User, type InsertUser,
  engagements, timeLogs, invoices, users, clients
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, SQL } from "drizzle-orm";
import * as expressSession from "express-session";
import pgSimpleModule from "connect-pg-simple";
import { pool } from "./db";
import { type PgColumn } from "drizzle-orm/pg-core";

// Create connect-pg-simple after import
const connectPgSimple = pgSimpleModule(expressSession);

// Modify the interface with any CRUD methods
export interface IStorage {
  // Authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clients
  getClients(userId?: number): Promise<Client[]>;
  getClient(id: number, userId?: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>, userId?: number): Promise<Client | undefined>;
  deleteClient(id: number, userId?: number): Promise<boolean>;
  
  // Engagements
  getEngagements(userId?: number): Promise<Engagement[]>;
  getEngagement(id: number, userId?: number): Promise<Engagement | undefined>;
  getEngagementWithClient(id: number, userId?: number): Promise<(Engagement & { client?: any }) | undefined>;
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
  getInvoices(userId?: number): Promise<Invoice[]>;
  getInvoice(id: number, userId?: number): Promise<InvoiceWithLineItems | undefined>;
  getInvoicesByStatus(status: string, userId?: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId?: number): Promise<Invoice | undefined>;
  updateInvoiceStatus(id: number, status: string, userId?: number): Promise<Invoice | undefined>;
  deleteInvoice(id: number, userId?: number): Promise<boolean>;

  // Dashboard and Analytics
  getYtdRevenue(year: number, userId?: number): Promise<number>;
  getMonthlyRevenueBillable(year: number, userId?: number): Promise<{month: number, revenue: number, billableHours: number}[]>;
  getTotalHoursLogged(startDate: Date, endDate: Date, userId?: number): Promise<number>;
  getPendingInvoicesTotal(userId?: number): Promise<number>;
  
  // Session Store
  sessionStore: expressSession.Store;
}

export class DatabaseStorage implements IStorage {
  // Session store for authentication
  sessionStore: expressSession.Store;

  constructor() {
    this.sessionStore = new connectPgSimple({
      // @ts-ignore
      pool, // Ignore type error for pool
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

  // Client methods
  async getClients(userId?: number): Promise<Client[]> {
    if (userId !== undefined) {
      return await db.select().from(clients)
        .where(eq(clients.userId, userId))
        .orderBy(clients.name);
    }
    return await db.select().from(clients).orderBy(clients.name);
  }

  async getClient(id: number, userId?: number): Promise<Client | undefined> {
    let query = db.select().from(clients).where(eq(clients.id, id));
    
    if (userId !== undefined) {
      query = db.select().from(clients)
        .where(and(
          eq(clients.id, id),
          eq(clients.userId, userId)
        ));
    }
    
    const results = await query;
    return results.length > 0 ? results[0] : undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    // Ensure all billing fields are properly handled
    const clientData: InsertClient = {
      userId: client.userId,
      name: client.name,
      billingContactName: client.billingContactName || null, 
      billingContactEmail: client.billingContactEmail || null,
      billingAddress: client.billingAddress || null,
      billingCity: client.billingCity || null,
      billingState: client.billingState || null,
      billingZip: client.billingZip || null,
      billingCountry: client.billingCountry || null,
    };

    const [newClient] = await db.insert(clients).values(clientData).returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>, userId?: number): Promise<Client | undefined> {
    // Build the update query
    const query = db.update(clients).set(client);
    
    // Add appropriate where conditions
    if (userId !== undefined) {
      const [updatedClient] = await query
        .where(and(eq(clients.id, id), eq(clients.userId, userId)))
        .returning();
      return updatedClient;
    } else {
      const [updatedClient] = await query
        .where(eq(clients.id, id))
        .returning();
      return updatedClient;
    }
  }

  async deleteClient(id: number, userId?: number): Promise<boolean> {
    // Build the delete query
    const query = db.delete(clients);
    
    // Add appropriate where conditions
    if (userId !== undefined) {
      await query.where(and(eq(clients.id, id), eq(clients.userId, userId)));
    } else {
      await query.where(eq(clients.id, id));
    }
    
    return true; // Assuming success if no error thrown
  }

  // Engagement methods
  async getEngagements(userId?: number): Promise<Engagement[]> {
    try {
      let query;
      
      // Build a query with a join to clients table
      if (userId) {
        query = db.select({
          id: engagements.id,
          userId: engagements.userId,
          clientId: engagements.clientId,
          projectName: engagements.projectName,
          startDate: engagements.startDate,
          endDate: engagements.endDate,
          hourlyRate: engagements.hourlyRate,
          description: engagements.description,
          status: engagements.status,
          clientName: clients.name,
          clientEmail: clients.billingContactEmail
        })
        .from(engagements)
        .leftJoin(clients, eq(engagements.clientId, clients.id))
        .where(eq(engagements.userId, userId))
        .orderBy(desc(engagements.startDate));
      } else {
        query = db.select({
          id: engagements.id,
          userId: engagements.userId,
          clientId: engagements.clientId,
          projectName: engagements.projectName,
          startDate: engagements.startDate,
          endDate: engagements.endDate,
          hourlyRate: engagements.hourlyRate,
          description: engagements.description,
          status: engagements.status,
          clientName: clients.name,
          clientEmail: clients.billingContactEmail
        })
        .from(engagements)
        .leftJoin(clients, eq(engagements.clientId, clients.id))
        .orderBy(desc(engagements.startDate));
      }
      
      const results = await query;
      
      // Add debug logging
      console.log(`Retrieved ${results.length} engagements with client data via join`);
      console.log('Sample engagement data:', results.length > 0 ? results[0] : 'No results');
      
      return results as Engagement[];
    } catch (error) {
      console.error('Error fetching engagements with join:', error);
      
      // Fall back to the previous implementation if the join approach fails
      let engagementResults;
      
      if (userId) {
        engagementResults = await db.select().from(engagements)
          .where(eq(engagements.userId, userId))
          .orderBy(desc(engagements.startDate));
      } else {
        engagementResults = await db.select().from(engagements).orderBy(desc(engagements.startDate));
      }
      
      // Fetch client details for each engagement
      const enhancedEngagements = await Promise.all(engagementResults.map(async (engagement) => {
        try {
          if (engagement.clientId) {
            const clientResults = await db
              .select()
              .from(clients)
              .where(eq(clients.id, engagement.clientId));
              
            if (clientResults.length > 0) {
              const client = clientResults[0];
              // Add client details to the engagement
              return { 
                ...engagement,
                clientName: client.name,
                clientEmail: client.billingContactEmail || null
              };
            }
          }
          return engagement;
        } catch (error) {
          console.error('Error fetching client details for engagement:', error);
          return engagement;
        }
      }));
      
      return enhancedEngagements;
    }
  }

  async getEngagement(id: number, userId?: number): Promise<Engagement | undefined> {
    let query = db.select().from(engagements).where(eq(engagements.id, id));
    
    if (userId) {
      query = db.select().from(engagements)
        .where(and(
          eq(engagements.id, id),
          eq(engagements.userId, userId)
        ));
    }
    
    const results = await query;
    return results.length > 0 ? results[0] : undefined;
  }

  async getActiveEngagements(userId?: number): Promise<Engagement[]> {
    if (userId) {
      return await db.select().from(engagements)
        .where(and(
          eq(engagements.status, 'active'),
          eq(engagements.userId, userId)
        ))
        .orderBy(desc(engagements.startDate));
    }
    
    return await db.select().from(engagements)
      .where(eq(engagements.status, 'active'))
      .orderBy(desc(engagements.startDate));
  }

  async createEngagement(engagement: InsertEngagement): Promise<Engagement> {
    // Convert the engagement data to match DB schema
    const dbEngagement = {
      userId: engagement.userId,
      clientId: engagement.clientId,
      projectName: engagement.projectName,
      startDate: engagement.startDate,
      endDate: engagement.endDate,
      hourlyRate: String(engagement.hourlyRate), // Convert to string for numeric column
      description: engagement.description,
      status: engagement.status
    };
    
    // @ts-ignore - Ignore TypeScript error for hourlyRate type mismatch
    const [newEngagement] = await db.insert(engagements).values(dbEngagement).returning();
    return newEngagement;
  }

  async updateEngagement(id: number, engagement: Partial<InsertEngagement>, userId?: number): Promise<Engagement | undefined> {
    // Convert hourlyRate to string if it exists
    const updateData: Record<string, any> = {};
    
    if (engagement.userId !== undefined) updateData.userId = engagement.userId;
    if (engagement.clientId !== undefined) updateData.clientId = engagement.clientId;
    if (engagement.projectName !== undefined) updateData.projectName = engagement.projectName;
    if (engagement.startDate !== undefined) updateData.startDate = engagement.startDate;
    if (engagement.endDate !== undefined) updateData.endDate = engagement.endDate;
    if (engagement.hourlyRate !== undefined) updateData.hourlyRate = String(engagement.hourlyRate);
    if (engagement.description !== undefined) updateData.description = engagement.description;
    if (engagement.status !== undefined) updateData.status = engagement.status;
    
    // @ts-ignore - Ignore condition type errors
    const [updatedEngagement] = await db.update(engagements)
      .set(updateData)
      .where(userId !== undefined 
        ? and(eq(engagements.id, id), eq(engagements.userId, userId))
        : eq(engagements.id, id))
      .returning();
    
    return updatedEngagement;
  }

  async deleteEngagement(id: number, userId?: number): Promise<boolean> {
    let condition: SQL<unknown>;
    
    if (userId !== undefined) {
      // @ts-ignore - SQL typing issue with and()
      condition = and(
        eq(engagements.id, id),
        eq(engagements.userId, userId)
      );
    } else {
      condition = eq(engagements.id, id);
    }
    
    await db.delete(engagements).where(condition);
    return true; // Assuming success if no error thrown
  }

  // Time Logs methods
  async getTimeLogs(userId?: number): Promise<TimeLogWithEngagement[]> {
    let logs;
    
    if (userId !== undefined) {
      logs = await db.select().from(timeLogs)
        .where(eq(timeLogs.userId, userId))
        .orderBy(desc(timeLogs.date));
    } else {
      logs = await db.select().from(timeLogs)
        .orderBy(desc(timeLogs.date));
    }
    
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLogsByEngagement(engagementId: number, userId?: number): Promise<TimeLogWithEngagement[]> {
    let logs;
    
    if (userId !== undefined) {
      logs = await db.select().from(timeLogs)
        .where(and(
          eq(timeLogs.engagementId, engagementId),
          eq(timeLogs.userId, userId)
        ))
        .orderBy(desc(timeLogs.date));
    } else {
      logs = await db.select().from(timeLogs)
        .where(eq(timeLogs.engagementId, engagementId))
        .orderBy(desc(timeLogs.date));
    }
    
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLogsByDateRange(startDate: Date, endDate: Date, userId?: number): Promise<TimeLogWithEngagement[]> {
    let logs;
    
    if (userId !== undefined) {
      logs = await db.select().from(timeLogs)
        .where(and(
          gte(timeLogs.date, startDate),
          lte(timeLogs.date, endDate),
          eq(timeLogs.userId, userId)
        ))
        .orderBy(desc(timeLogs.date));
    } else {
      logs = await db.select().from(timeLogs)
        .where(and(
          gte(timeLogs.date, startDate),
          lte(timeLogs.date, endDate)
        ))
        .orderBy(desc(timeLogs.date));
    }
    
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLog(id: number, userId?: number): Promise<TimeLogWithEngagement | undefined> {
    let results;
    
    if (userId !== undefined) {
      results = await db.select().from(timeLogs)
        .where(and(
          eq(timeLogs.id, id),
          eq(timeLogs.userId, userId)
        ));
    } else {
      results = await db.select().from(timeLogs)
        .where(eq(timeLogs.id, id));
    }
    
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
    // Instead of condition reassignment, use conditional directly in the query
    const query = db.update(timeLogs).set(timeLog);
    
    if (userId !== undefined) {
      const [updatedTimeLog] = await query
        .where(and(eq(timeLogs.id, id), eq(timeLogs.userId, userId)))
        .returning();
      return updatedTimeLog;
    } else {
      const [updatedTimeLog] = await query
        .where(eq(timeLogs.id, id))
        .returning();
      return updatedTimeLog;
    }
  }

  async deleteTimeLog(id: number, userId?: number): Promise<boolean> {
    // Instead of condition reassignment, use conditional directly in the query
    const query = db.delete(timeLogs);
    
    if (userId !== undefined) {
      await query.where(and(eq(timeLogs.id, id), eq(timeLogs.userId, userId)));
    } else {
      await query.where(eq(timeLogs.id, id));
    }
    
    return true; // Assuming success if no error thrown
  }

  // Invoice methods
  async getInvoices(userId?: number): Promise<Invoice[]> {
    const query = db.select().from(invoices).orderBy(desc(invoices.issueDate));
    
    if (userId !== undefined) {
      return await query.where(eq(invoices.userId, userId));
    }
    
    return await query;
  }

  async getInvoice(id: number, userId?: number): Promise<InvoiceWithLineItems | undefined> {
    // @ts-ignore - Ignore SQL condition errors
    const results = await db.select().from(invoices)
      .where(userId !== undefined 
        ? and(eq(invoices.id, id), eq(invoices.userId, userId))
        : eq(invoices.id, id));
    
    if (results.length === 0) return undefined;
    
    // Convert Invoice to InvoiceWithLineItems
    const invoice = results[0] as Invoice;
    return {
      ...invoice,
      lineItems: [] // Add empty lineItems array to match expected interface
    };
  }

  async getInvoicesByStatus(status: string, userId?: number): Promise<Invoice[]> {
    if (userId !== undefined) {
      return await db.select().from(invoices)
        .where(and(
          eq(invoices.status, status),
          eq(invoices.userId, userId)
        ))
        .orderBy(desc(invoices.issueDate));
    }
    
    return await db.select().from(invoices)
      .where(eq(invoices.status, status))
      .orderBy(desc(invoices.issueDate));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    // If this invoice is linked to a client through an engagement, get the client information
    if (invoice.engagementId) {
      try {
        const engagement = await this.getEngagement(invoice.engagementId);
        if (engagement && engagement.clientId) {
          const client = await this.getClient(engagement.clientId);
          if (client) {
            // Add client name to the invoice
            invoice.clientName = client.name;
            
            // Add billing information from the client to the invoice
            invoice.billingContactName = client.billingContactName || null;
            invoice.billingContactEmail = client.billingContactEmail || null;
            invoice.billingAddress = client.billingAddress || null;
            invoice.billingCity = client.billingCity || null;
            invoice.billingState = client.billingState || null;
            invoice.billingZip = client.billingZip || null;
            invoice.billingCountry = client.billingCountry || null;
          }
        }
      } catch (error) {
        console.error("Error fetching client info for invoice:", error);
        // Continue creating the invoice even if client info can't be fetched
      }
    }
    
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoiceStatus(id: number, status: string, userId?: number): Promise<Invoice | undefined> {
    const query = db.update(invoices).set({ status });
    
    if (userId !== undefined) {
      const [updatedInvoice] = await query
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
        .returning();
      return updatedInvoice;
    } else {
      const [updatedInvoice] = await query
        .where(eq(invoices.id, id))
        .returning();
      return updatedInvoice;
    }
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId?: number): Promise<Invoice | undefined> {
    const query = db.update(invoices).set(invoice);
    
    if (userId !== undefined) {
      const [updatedInvoice] = await query
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
        .returning();
      return updatedInvoice;
    } else {
      const [updatedInvoice] = await query
        .where(eq(invoices.id, id))
        .returning();
      return updatedInvoice;
    }
  }

  async deleteInvoice(id: number, userId?: number): Promise<boolean> {
    const query = db.delete(invoices);
    
    if (userId !== undefined) {
      await query.where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    } else {
      await query.where(eq(invoices.id, id));
    }
    
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
      total: sql<number>`sum(${invoices.totalAmount})`
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

    try {
      console.log(`Getting revenue from paid invoices for year: ${year}, userId: ${userId || 'all'}`);
      
      // Get revenue from paid invoices
      const yearCondition = sql`extract(year from ${invoices.issueDate}) = ${year}`;
      const invoiceBaseQuery = db.select({
        month: sql<number>`extract(month from ${invoices.issueDate}) - 1`,
        amount: invoices.totalAmount
      }).from(invoices);
      
      let paidInvoices;
      if (userId !== undefined) {
        paidInvoices = await invoiceBaseQuery.where(
          and(
            eq(invoices.status, 'paid'),
            yearCondition,
            eq(invoices.userId, userId)
          )
        );
      } else {
        paidInvoices = await invoiceBaseQuery.where(
          and(
            eq(invoices.status, 'paid'),
            yearCondition
          )
        );
      }

      console.log(`Found ${paidInvoices.length} paid invoices`);

      for (const invoice of paidInvoices) {
        if (invoice && invoice.month !== null && invoice.month !== undefined) {
          const month = invoice.month;
          if (month >= 0 && month < 12) {
            // Ensure we're using a number for the calculation
            result[month].revenue += Number(invoice.amount) || 0;
          }
        }
      }

      // Get billable hours from time logs
      console.log(`Getting billable hours for year: ${year}, userId: ${userId || 'all'}`);
      
      const timeLogYearCondition = sql`extract(year from ${timeLogs.date}) = ${year}`;
      const logBaseQuery = db.select({
        month: sql<number>`extract(month from ${timeLogs.date}) - 1`,
        hours: timeLogs.hours
      }).from(timeLogs);
      
      let yearLogs;
      if (userId !== undefined) {
        yearLogs = await logBaseQuery.where(
          and(
            timeLogYearCondition,
            eq(timeLogs.userId, userId)
          )
        );
      } else {
        yearLogs = await logBaseQuery.where(timeLogYearCondition);
      }

      console.log(`Found ${yearLogs.length} time logs for the year`);

      for (const log of yearLogs) {
        if (log && log.month !== null && log.month !== undefined) {
          const month = log.month;
          if (month >= 0 && month < 12) {
            result[month].billableHours += Number(log.hours) || 0;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error in getMonthlyRevenueBillable:', error);
      // Return empty data on error, to avoid breaking the UI
      return result; 
    }
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
    const statusCondition = sql`(${invoices.status} = 'submitted' OR ${invoices.status} = 'overdue')`;
    const query = db.select({
      total: sql<number>`COALESCE(sum(${invoices.totalAmount}), 0)`
    }).from(invoices);
    
    // Add debug logging
    console.log(`Getting pending invoices total for userId: ${userId || 'all'}`);
    
    let result;
    if (userId !== undefined) {
      result = await query.where(and(statusCondition, eq(invoices.userId, userId)));
    } else {
      result = await query.where(statusCondition);
    }

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
    const engagementResults = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, timeLog.engagementId));
    
    let engagement: Engagement;
    
    if (engagementResults.length > 0) {
      engagement = engagementResults[0];
      
      // Fetch client name if needed
      if (engagement.clientId) {
        const clientResults = await db
          .select()
          .from(clients)
          .where(eq(clients.id, engagement.clientId));
          
        if (clientResults.length > 0) {
          const client = clientResults[0];
          // Add client name to the engagement
          engagement = { 
            ...engagement,
            clientName: client.name
          } as Engagement;
        }
      }
    } else {
      // Fallback if engagement doesn't exist
      // Create a compatible object that matches the Engagement type with the new clientId field
      engagement = {
        id: timeLog.engagementId,
        userId: timeLog.userId,
        clientId: 0, // Use 0 instead of null for clientId
        projectName: "Unknown Project",
        hourlyRate: "0", // Keep as string since that's what Drizzle expects for numeric type
        startDate: new Date(),
        endDate: new Date(),
        description: null,
        status: "unknown"
      } as unknown as Engagement;
    }

    // Convert both hourlyRate and hours to numbers for calculation
    const hourlyRate = Number(engagement.hourlyRate);
    const hours = Number(timeLog.hours);
    const billableAmount = hours * hourlyRate;
    
    return {
      ...timeLog,
      engagement,
      billableAmount
    };
  }

  // Get engagement with client details
  async getEngagementWithClient(id: number, userId?: number): Promise<(Engagement & { client?: any }) | undefined> {
    try {
      // First, get the engagement
      let query = db.select().from(engagements).where(eq(engagements.id, id));
      
      if (userId !== undefined) {
        query = db.select().from(engagements)
          .where(and(
            eq(engagements.id, id),
            eq(engagements.userId, userId)
          ));
      }
      
      const engagementResults = await query;
      
      if (engagementResults.length === 0) return undefined;
      
      const engagement = engagementResults[0];
      
      // If there's a clientId, fetch the client
      let client = undefined;
      if (engagement.clientId) {
        const clientResults = await db.select().from(clients)
          .where(eq(clients.id, engagement.clientId));
        
        if (clientResults.length > 0) {
          client = clientResults[0];
        }
      }
      
      // Return the combined result
      return {
        ...engagement,
        client
      };
    } catch (error) {
      console.error("Error fetching engagement with client:", error);
      return undefined;
    }
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
