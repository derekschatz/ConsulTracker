import {
  type Client, type InsertClient,
  type Engagement, type InsertEngagement,
  type TimeLog, type InsertTimeLog,
  type Invoice, type InsertInvoice,
  type InvoiceLineItem, type InsertInvoiceLineItem,
  type TimeLogWithEngagement, type InvoiceWithLineItems,
  engagements, timeLogs, invoices, invoiceLineItems
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// Modify the interface with any CRUD methods
export interface IStorage {
  // Engagements
  getEngagements(): Promise<Engagement[]>;
  getEngagement(id: number): Promise<Engagement | undefined>;
  getActiveEngagements(): Promise<Engagement[]>;
  createEngagement(engagement: InsertEngagement): Promise<Engagement>;
  updateEngagement(id: number, engagement: Partial<InsertEngagement>): Promise<Engagement | undefined>;
  deleteEngagement(id: number): Promise<boolean>;

  // Time Logs
  getTimeLogs(): Promise<TimeLogWithEngagement[]>;
  getTimeLogsByEngagement(engagementId: number): Promise<TimeLogWithEngagement[]>;
  getTimeLogsByDateRange(startDate: Date, endDate: Date): Promise<TimeLogWithEngagement[]>;
  getTimeLog(id: number): Promise<TimeLogWithEngagement | undefined>;
  createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog>;
  updateTimeLog(id: number, timeLog: Partial<InsertTimeLog>): Promise<TimeLog | undefined>;
  deleteTimeLog(id: number): Promise<boolean>;

  // Invoices
  getInvoices(): Promise<InvoiceWithLineItems[]>;
  getInvoice(id: number): Promise<InvoiceWithLineItems | undefined>;
  getInvoicesByStatus(status: string): Promise<InvoiceWithLineItems[]>;
  createInvoice(invoice: InsertInvoice, lineItems: InsertInvoiceLineItem[]): Promise<InvoiceWithLineItems>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  // Dashboard and Analytics
  getYtdRevenue(year: number): Promise<number>;
  getMonthlyRevenueBillable(year: number): Promise<{month: number, revenue: number, billableHours: number}[]>;
  getTotalHoursLogged(startDate: Date, endDate: Date): Promise<number>;
  getPendingInvoicesTotal(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Engagement methods
  async getEngagements(): Promise<Engagement[]> {
    return await db.select().from(engagements).orderBy(desc(engagements.startDate));
  }

  async getEngagement(id: number): Promise<Engagement | undefined> {
    const results = await db.select().from(engagements).where(eq(engagements.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getActiveEngagements(): Promise<Engagement[]> {
    return await db.select().from(engagements)
      .where(eq(engagements.status, 'active'))
      .orderBy(desc(engagements.startDate));
  }

  async createEngagement(engagement: InsertEngagement): Promise<Engagement> {
    const [newEngagement] = await db.insert(engagements).values(engagement).returning();
    return newEngagement;
  }

  async updateEngagement(id: number, engagement: Partial<InsertEngagement>): Promise<Engagement | undefined> {
    const [updatedEngagement] = await db.update(engagements)
      .set(engagement)
      .where(eq(engagements.id, id))
      .returning();
    return updatedEngagement;
  }

  async deleteEngagement(id: number): Promise<boolean> {
    const result = await db.delete(engagements).where(eq(engagements.id, id));
    return true; // Assuming success if no error thrown
  }

  // Time Logs methods
  async getTimeLogs(): Promise<TimeLogWithEngagement[]> {
    const logs = await db.select().from(timeLogs).orderBy(desc(timeLogs.date));
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLogsByEngagement(engagementId: number): Promise<TimeLogWithEngagement[]> {
    const logs = await db.select().from(timeLogs)
      .where(eq(timeLogs.engagementId, engagementId))
      .orderBy(desc(timeLogs.date));
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLogsByDateRange(startDate: Date, endDate: Date): Promise<TimeLogWithEngagement[]> {
    const logs = await db.select().from(timeLogs)
      .where(and(
        gte(timeLogs.date, startDate),
        lte(timeLogs.date, endDate)
      ))
      .orderBy(desc(timeLogs.date));
    return Promise.all(logs.map(log => this.enrichTimeLog(log)));
  }

  async getTimeLog(id: number): Promise<TimeLogWithEngagement | undefined> {
    const results = await db.select().from(timeLogs).where(eq(timeLogs.id, id));
    if (results.length === 0) return undefined;
    return this.enrichTimeLog(results[0]);
  }

  async createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog> {
    const [newTimeLog] = await db.insert(timeLogs).values(timeLog).returning();
    return newTimeLog;
  }

  async updateTimeLog(id: number, timeLog: Partial<InsertTimeLog>): Promise<TimeLog | undefined> {
    const [updatedTimeLog] = await db.update(timeLogs)
      .set(timeLog)
      .where(eq(timeLogs.id, id))
      .returning();
    return updatedTimeLog;
  }

  async deleteTimeLog(id: number): Promise<boolean> {
    await db.delete(timeLogs).where(eq(timeLogs.id, id));
    return true; // Assuming success if no error thrown
  }

  // Invoice methods
  async getInvoices(): Promise<InvoiceWithLineItems[]> {
    const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.issueDate));
    return Promise.all(allInvoices.map(invoice => this.enrichInvoice(invoice)));
  }

  async getInvoice(id: number): Promise<InvoiceWithLineItems | undefined> {
    const results = await db.select().from(invoices).where(eq(invoices.id, id));
    if (results.length === 0) return undefined;
    return this.enrichInvoice(results[0]);
  }

  async getInvoicesByStatus(status: string): Promise<InvoiceWithLineItems[]> {
    const statusInvoices = await db.select().from(invoices)
      .where(eq(invoices.status, status))
      .orderBy(desc(invoices.issueDate));
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

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const [updatedInvoice] = await db.update(invoices)
      .set({ status })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    // Delete related line items first
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    // Then delete the invoice
    await db.delete(invoices).where(eq(invoices.id, id));
    return true; // Assuming success if no error thrown
  }

  // Dashboard and Analytics methods
  async getYtdRevenue(year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const result = await db.select({
      total: sql<number>`sum(${invoices.amount})`
    })
    .from(invoices)
    .where(and(
      eq(invoices.status, 'paid'),
      gte(invoices.issueDate, startOfYear),
      lte(invoices.issueDate, endOfYear)
    ));

    return result[0]?.total || 0;
  }

  async getMonthlyRevenueBillable(year: number): Promise<{month: number, revenue: number, billableHours: number}[]> {
    // Initialize months
    const result: {month: number, revenue: number, billableHours: number}[] = [];
    for (let month = 0; month < 12; month++) {
      result.push({ month, revenue: 0, billableHours: 0 });
    }

    // Get revenue from paid invoices
    const paidInvoices = await db.select({
      month: sql<number>`extract(month from ${invoices.issueDate}) - 1`,
      amount: invoices.amount
    })
    .from(invoices)
    .where(and(
      eq(invoices.status, 'paid'),
      sql`extract(year from ${invoices.issueDate}) = ${year}`
    ));

    for (const invoice of paidInvoices) {
      const month = invoice.month;
      if (month >= 0 && month < 12) {
        result[month].revenue += Number(invoice.amount);
      }
    }

    // Get billable hours from time logs
    const yearLogs = await db.select({
      month: sql<number>`extract(month from ${timeLogs.date}) - 1`,
      hours: timeLogs.hours
    })
    .from(timeLogs)
    .where(sql`extract(year from ${timeLogs.date}) = ${year}`);

    for (const log of yearLogs) {
      const month = log.month;
      if (month >= 0 && month < 12) {
        result[month].billableHours += Number(log.hours);
      }
    }

    return result;
  }

  async getTotalHoursLogged(startDate: Date, endDate: Date): Promise<number> {
    const result = await db.select({
      total: sql<number>`sum(${timeLogs.hours})`
    })
    .from(timeLogs)
    .where(and(
      gte(timeLogs.date, startDate),
      lte(timeLogs.date, endDate)
    ));

    return result[0]?.total || 0;
  }

  async getPendingInvoicesTotal(): Promise<number> {
    const result = await db.select({
      total: sql<number>`sum(${invoices.amount})`
    })
    .from(invoices)
    .where(sql`${invoices.status} = 'pending' OR ${invoices.status} = 'overdue'`);

    return result[0]?.total || 0;
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
    // Get the line items for this invoice
    const lineItems = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoice.id));
    const totalHours = lineItems.reduce((total, item) => total + Number(item.hours), 0);
    
    return {
      ...invoice,
      lineItems,
      totalHours
    };
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
