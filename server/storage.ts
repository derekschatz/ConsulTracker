import { and, asc, desc, eq, gt, gte, ilike, lt, lte, or, sql } from 'drizzle-orm';
import { db } from './db';
import {
  Client,
  Engagement,
  Invoice,
  InvoiceLineItem,
  InvoiceWithLineItems,
  TimeLog,
  clients,
  engagements,
  invoiceLineItems,
  invoices,
  timeLogs,
} from '@shared/schema';
import { Pool } from '@neondatabase/serverless';
import session from "express-session";
import connectPg from "connect-pg-simple";
import { PgSelect } from 'drizzle-orm/pg-core';

export class Storage {
  private pool: Pool;
  private sessionStore: session.Store;

  constructor(pool: Pool) {
    this.pool = pool;
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool: this.pool as any, // Type assertion needed due to connect-pg-simple's Pool type
      tableName: 'session'
    });
  }

  private async enrichInvoice(invoice: Invoice): Promise<InvoiceWithLineItems> {
    try {
      if (!invoice || !invoice.id) {
        console.error('Invalid invoice passed to enrichInvoice:', invoice);
        throw new Error('Invalid invoice data');
      }
      
      const lineItems = await db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, invoice.id))
        .execute();
      
      console.log(`Retrieved ${lineItems.length} line items for invoice ${invoice.id} (${invoice.invoiceNumber})`);
      
      const processedLineItems = lineItems.map(item => ({
        ...item,
        hours: Number(item.hours),
        rate: Number(item.rate).toFixed(2),
        amount: Number(item.amount).toFixed(2)
      }));
      
      const totalHours = processedLineItems.reduce((total, item) => total + item.hours, 0);
      
      return {
        ...invoice,
        amount: Number(invoice.amount).toFixed(2),
        lineItems: processedLineItems,
        totalHours: Number(totalHours.toFixed(2))
      };
    } catch (error) {
      console.error(`Error enriching invoice ${invoice?.id}:`, error);
      return {
        ...invoice,
        amount: Number(invoice.amount).toFixed(2),
        lineItems: [],
        totalHours: 0
      };
    }
  }

  async getEngagements(): Promise<Engagement[]> {
    const result = await db
      .select()
      .from(engagements)
      .execute();
    return result;
  }

  async getEngagement(id: number): Promise<Engagement | undefined> {
    const result = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, id))
      .execute();
    return result[0];
  }

  async getEngagementsByClient(clientName: string): Promise<Engagement[]> {
    const result = await db
      .select()
      .from(engagements)
      .where(eq(engagements.clientName, clientName))
      .execute();
    return result;
  }

  async getActiveEngagements(): Promise<Engagement[]> {
    const result = await db
      .select()
      .from(engagements)
      .where(eq(engagements.status, 'active'))
      .execute();
    return result;
  }

  async getTimeLogs(): Promise<TimeLog[]> {
    const result = await db
      .select()
      .from(timeLogs)
      .execute();
    return result;
  }

  async getTimeLogsByEngagement(engagementId: number): Promise<TimeLog[]> {
    const result = await db
      .select()
      .from(timeLogs)
      .where(eq(timeLogs.engagementId, engagementId))
      .execute();
    return result;
  }

  async getTimeLogsByDateRange(startDate: Date, endDate: Date): Promise<TimeLog[]> {
    const result = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          gte(timeLogs.date, startDate),
          lte(timeLogs.date, endDate)
        )
      )
      .execute();
    return result;
  }

  async getTimeLogsByEngagementAndDateRange(
    engagementId: number,
    startDate: Date,
    endDate: Date
  ): Promise<TimeLog[]> {
    const result = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.engagementId, engagementId),
          gte(timeLogs.date, startDate),
          lte(timeLogs.date, endDate)
        )
      )
      .execute();
    return result;
  }

  // ... rest of existing code ...
}
