import {
  type Client, type InsertClient,
  type Engagement, type InsertEngagement,
  type TimeLog, type InsertTimeLog,
  type Invoice, type InsertInvoice,
  type InvoiceLineItem, type InsertInvoiceLineItem,
  type TimeLogWithEngagement, type InvoiceWithLineItems,
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private engagements: Map<number, Engagement>;
  private timeLogs: Map<number, TimeLog>;
  private invoices: Map<number, Invoice>;
  private invoiceLineItems: Map<number, InvoiceLineItem[]>;
  
  private currentEngagementId: number;
  private currentTimeLogId: number;
  private currentInvoiceId: number;
  private currentInvoiceLineItemId: number;

  constructor() {
    this.engagements = new Map();
    this.timeLogs = new Map();
    this.invoices = new Map();
    this.invoiceLineItems = new Map();
    
    this.currentEngagementId = 1;
    this.currentTimeLogId = 1;
    this.currentInvoiceId = 1;
    this.currentInvoiceLineItemId = 1;

    // Add some initial sample data for testing
    this.initializeSampleData();
  }

  // Initialize some sample data
  private initializeSampleData() {
    // Create some sample engagements
    const acmeEngagement = this.createEngagement({
      clientName: "Acme Corp",
      projectName: "Website Redesign",
      startDate: new Date("2023-08-15"),
      endDate: new Date("2023-12-31"),
      hourlyRate: 125,
      description: "Complete website redesign and development",
      status: "active"
    });

    const techStartEngagement = this.createEngagement({
      clientName: "TechStart",
      projectName: "Strategy Consulting",
      startDate: new Date("2023-07-01"),
      endDate: new Date("2023-10-31"),
      hourlyRate: 150,
      description: "Business strategy and market analysis",
      status: "active"
    });

    const globalFirmEngagement = this.createEngagement({
      clientName: "GlobalFirm",
      projectName: "UX Research",
      startDate: new Date("2023-10-01"),
      endDate: new Date("2024-01-31"),
      hourlyRate: 145,
      description: "User experience research and design recommendations",
      status: "upcoming"
    });

    const innovateEngagement = this.createEngagement({
      clientName: "Innovate Inc",
      projectName: "Development Support",
      startDate: new Date("2023-05-15"),
      endDate: new Date("2023-09-30"),
      hourlyRate: 135,
      description: "Technical consulting and development support",
      status: "completed"
    });

    // Create some sample time logs
    this.createTimeLog({
      engagementId: techStartEngagement.id,
      date: new Date("2023-10-05"),
      hours: 4.5,
      description: "Strategy session and document preparation"
    });

    this.createTimeLog({
      engagementId: acmeEngagement.id,
      date: new Date("2023-10-04"),
      hours: 6.0,
      description: "UI design review and revisions"
    });

    this.createTimeLog({
      engagementId: globalFirmEngagement.id,
      date: new Date("2023-10-03"),
      hours: 3.5,
      description: "Kickoff meeting and initial research"
    });

    this.createTimeLog({
      engagementId: techStartEngagement.id,
      date: new Date("2023-10-02"),
      hours: 5.5,
      description: "Market analysis and competitor research"
    });

    this.createTimeLog({
      engagementId: acmeEngagement.id,
      date: new Date("2023-10-01"),
      hours: 7.0,
      description: "Frontend development and testing"
    });

    // Create some sample invoices
    const acmeInvoice = this.createInvoice(
      {
        invoiceNumber: "INV-024",
        clientName: "Acme Corp",
        engagementId: acmeEngagement.id,
        issueDate: new Date("2023-10-01"),
        dueDate: new Date("2023-10-15"),
        amount: 7850,
        status: "pending",
        notes: "September services",
        periodStart: new Date("2023-09-01"),
        periodEnd: new Date("2023-09-30")
      },
      []
    );

    const techstartInvoice = this.createInvoice(
      {
        invoiceNumber: "INV-023",
        clientName: "TechStart",
        engagementId: techStartEngagement.id,
        issueDate: new Date("2023-09-30"),
        dueDate: new Date("2023-10-14"),
        amount: 12250,
        status: "pending",
        notes: "September services",
        periodStart: new Date("2023-09-01"),
        periodEnd: new Date("2023-09-30")
      },
      []
    );

    const globalfirmInvoice = this.createInvoice(
      {
        invoiceNumber: "INV-022",
        clientName: "GlobalFirm",
        engagementId: globalFirmEngagement.id,
        issueDate: new Date("2023-09-15"),
        dueDate: new Date("2023-09-30"),
        amount: 8700,
        status: "overdue",
        notes: "Initial consultation",
        periodStart: new Date("2023-09-01"),
        periodEnd: new Date("2023-09-15")
      },
      []
    );

    // Add paid invoices
    this.createInvoice(
      {
        invoiceNumber: "INV-021",
        clientName: "Acme Corp",
        engagementId: acmeEngagement.id,
        issueDate: new Date("2023-09-01"),
        dueDate: new Date("2023-09-15"),
        amount: 6875,
        status: "paid",
        notes: "August services",
        periodStart: new Date("2023-08-01"),
        periodEnd: new Date("2023-08-31")
      },
      []
    );

    this.createInvoice(
      {
        invoiceNumber: "INV-020",
        clientName: "TechStart",
        engagementId: techStartEngagement.id,
        issueDate: new Date("2023-08-31"),
        dueDate: new Date("2023-09-14"),
        amount: 11625,
        status: "paid",
        notes: "August services",
        periodStart: new Date("2023-08-01"),
        periodEnd: new Date("2023-08-31")
      },
      []
    );
  }

  // Engagement methods
  async getEngagements(): Promise<Engagement[]> {
    return Array.from(this.engagements.values());
  }

  async getEngagement(id: number): Promise<Engagement | undefined> {
    return this.engagements.get(id);
  }

  async getActiveEngagements(): Promise<Engagement[]> {
    return Array.from(this.engagements.values()).filter(
      (engagement) => engagement.status === 'active'
    );
  }

  async createEngagement(engagement: InsertEngagement): Promise<Engagement> {
    const id = this.currentEngagementId++;
    const newEngagement = { ...engagement, id } as Engagement;
    this.engagements.set(id, newEngagement);
    return newEngagement;
  }

  async updateEngagement(id: number, engagement: Partial<InsertEngagement>): Promise<Engagement | undefined> {
    const existingEngagement = this.engagements.get(id);
    if (!existingEngagement) return undefined;

    const updatedEngagement = { ...existingEngagement, ...engagement };
    this.engagements.set(id, updatedEngagement);
    return updatedEngagement;
  }

  async deleteEngagement(id: number): Promise<boolean> {
    return this.engagements.delete(id);
  }

  // Time Logs methods
  async getTimeLogs(): Promise<TimeLogWithEngagement[]> {
    return Array.from(this.timeLogs.values())
      .map((timeLog) => this.enrichTimeLog(timeLog))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTimeLogsByEngagement(engagementId: number): Promise<TimeLogWithEngagement[]> {
    return Array.from(this.timeLogs.values())
      .filter((timeLog) => timeLog.engagementId === engagementId)
      .map((timeLog) => this.enrichTimeLog(timeLog))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTimeLogsByDateRange(startDate: Date, endDate: Date): Promise<TimeLogWithEngagement[]> {
    return Array.from(this.timeLogs.values())
      .filter((timeLog) => {
        const logDate = new Date(timeLog.date);
        return logDate >= startDate && logDate <= endDate;
      })
      .map((timeLog) => this.enrichTimeLog(timeLog))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTimeLog(id: number): Promise<TimeLogWithEngagement | undefined> {
    const timeLog = this.timeLogs.get(id);
    if (!timeLog) return undefined;
    return this.enrichTimeLog(timeLog);
  }

  async createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog> {
    const id = this.currentTimeLogId++;
    const newTimeLog = { 
      ...timeLog, 
      id, 
      createdAt: new Date() 
    } as TimeLog;
    
    this.timeLogs.set(id, newTimeLog);
    return newTimeLog;
  }

  async updateTimeLog(id: number, timeLog: Partial<InsertTimeLog>): Promise<TimeLog | undefined> {
    const existingTimeLog = this.timeLogs.get(id);
    if (!existingTimeLog) return undefined;

    const updatedTimeLog = { ...existingTimeLog, ...timeLog };
    this.timeLogs.set(id, updatedTimeLog);
    return updatedTimeLog;
  }

  async deleteTimeLog(id: number): Promise<boolean> {
    return this.timeLogs.delete(id);
  }

  // Invoice methods
  async getInvoices(): Promise<InvoiceWithLineItems[]> {
    return Array.from(this.invoices.values())
      .map((invoice) => this.enrichInvoice(invoice))
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }

  async getInvoice(id: number): Promise<InvoiceWithLineItems | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    return this.enrichInvoice(invoice);
  }

  async getInvoicesByStatus(status: string): Promise<InvoiceWithLineItems[]> {
    return Array.from(this.invoices.values())
      .filter((invoice) => invoice.status === status)
      .map((invoice) => this.enrichInvoice(invoice))
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }

  async createInvoice(invoice: InsertInvoice, lineItems: InsertInvoiceLineItem[]): Promise<InvoiceWithLineItems> {
    const id = this.currentInvoiceId++;
    const newInvoice = { ...invoice, id } as Invoice;
    this.invoices.set(id, newInvoice);

    // Create and store line items
    const invoiceLineItems: InvoiceLineItem[] = [];
    for (const lineItem of lineItems) {
      const lineItemId = this.currentInvoiceLineItemId++;
      const newLineItem = { ...lineItem, id: lineItemId, invoiceId: id } as InvoiceLineItem;
      invoiceLineItems.push(newLineItem);
    }
    this.invoiceLineItems.set(id, invoiceLineItems);

    return this.enrichInvoice(newInvoice);
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const existingInvoice = this.invoices.get(id);
    if (!existingInvoice) return undefined;

    const updatedInvoice = { ...existingInvoice, status };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    this.invoiceLineItems.delete(id);
    return this.invoices.delete(id);
  }

  // Dashboard and Analytics methods
  async getYtdRevenue(year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const paidInvoices = Array.from(this.invoices.values()).filter(
      (invoice) => 
        invoice.status === 'paid' && 
        new Date(invoice.issueDate) >= startOfYear && 
        new Date(invoice.issueDate) <= endOfYear
    );

    return paidInvoices.reduce((total, invoice) => total + Number(invoice.amount), 0);
  }

  async getMonthlyRevenueBillable(year: number): Promise<{month: number, revenue: number, billableHours: number}[]> {
    const result: {month: number, revenue: number, billableHours: number}[] = [];
    
    // Initialize months
    for (let month = 0; month < 12; month++) {
      result.push({ month, revenue: 0, billableHours: 0 });
    }

    // Calculate revenue from paid invoices
    const paidInvoices = Array.from(this.invoices.values()).filter(
      (invoice) => 
        invoice.status === 'paid' && 
        new Date(invoice.issueDate).getFullYear() === year
    );

    for (const invoice of paidInvoices) {
      const month = new Date(invoice.issueDate).getMonth();
      result[month].revenue += Number(invoice.amount);
    }

    // Calculate billable hours from time logs
    const yearLogs = Array.from(this.timeLogs.values()).filter(
      (log) => new Date(log.date).getFullYear() === year
    );

    for (const log of yearLogs) {
      const month = new Date(log.date).getMonth();
      result[month].billableHours += Number(log.hours);
    }

    return result;
  }

  async getTotalHoursLogged(startDate: Date, endDate: Date): Promise<number> {
    const logs = Array.from(this.timeLogs.values()).filter(
      (log) => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      }
    );

    return logs.reduce((total, log) => total + Number(log.hours), 0);
  }

  async getPendingInvoicesTotal(): Promise<number> {
    const pendingInvoices = Array.from(this.invoices.values()).filter(
      (invoice) => invoice.status === 'pending' || invoice.status === 'overdue'
    );

    return pendingInvoices.reduce((total, invoice) => total + Number(invoice.amount), 0);
  }

  // Helper methods
  private enrichTimeLog(timeLog: TimeLog): TimeLogWithEngagement {
    const engagement = this.engagements.get(timeLog.engagementId);
    if (!engagement) {
      throw new Error(`Engagement not found for timeLog: ${timeLog.id}`);
    }

    const billableAmount = Number(timeLog.hours) * Number(engagement.hourlyRate);
    
    return {
      ...timeLog,
      engagement,
      billableAmount
    };
  }

  private enrichInvoice(invoice: Invoice): InvoiceWithLineItems {
    const lineItems = this.invoiceLineItems.get(invoice.id) || [];
    const totalHours = lineItems.reduce((total, item) => total + Number(item.hours), 0);
    
    return {
      ...invoice,
      lineItems,
      totalHours
    };
  }
}

export const storage = new MemStorage();
