import { pool } from '../db';
import { z } from 'zod';
import { invoiceTypeEnum } from '../../shared/schema';

// Define types
interface TimeLog {
  description: string;
  hours: number;
  amount: number;
  timeLogId?: number;
  rate?: number;
}

interface CreateInvoiceParams {
  engagementId: number;
  userId: number;
  timeLogs?: TimeLog[];
  invoiceAmount?: number;
  periodStart?: Date;
  periodEnd?: Date;
  notes?: string;
}

export async function createInvoice(params: CreateInvoiceParams) {
  const {
    engagementId,
    userId,
    timeLogs = [],
    invoiceAmount,
    periodStart = new Date(),
    periodEnd = new Date(),
    notes = ""
  } = params;

  // Get engagement details
  const engagementResult = await pool.query(
    'SELECT client_name, project_name, hourly_rate, engagement_type FROM engagements WHERE id = $1 AND user_id = $2',
    [engagementId, userId]
  );

  if (engagementResult.rows.length === 0) {
    throw new Error('Engagement not found');
  }

  const engagement = engagementResult.rows[0];
  const invoiceType = engagement.engagement_type;

  // Validate invoice type
  const validationType = invoiceTypeEnum.safeParse(invoiceType);
  if (!validationType.success) {
    throw new Error('Invalid engagement type');
  }

  // Calculate totals based on invoice type
  const totalAmount = invoiceType === 'hourly'
    ? timeLogs.reduce((sum, log) => sum + (log.amount || 0), 0)
    : invoiceAmount || 0;

  const totalHours = invoiceType === 'hourly'
    ? timeLogs.reduce((sum, log) => sum + (log.hours || 0), 0)
    : 0;

  // Create invoice
  const invoiceResult = await pool.query(
    `INSERT INTO invoices (
      engagement_id, status, issue_date, due_date, invoice_number,
      client_name, total_amount, total_hours, period_start, period_end,
      project_name, user_id, invoice_type, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id`,
    [
      engagementId,
      'submitted',
      new Date(),
      new Date(new Date().setDate(new Date().getDate() + 30)), // Default 30 days
      `INV-${Date.now().toString().slice(-6)}`,
      engagement.client_name,
      totalAmount,
      totalHours,
      periodStart,
      periodEnd,
      engagement.project_name,
      userId,
      invoiceType,
      notes
    ]
  );

  const invoiceId = invoiceResult.rows[0].id;

  // Create line items based on invoice type
  if (invoiceType === 'hourly' && timeLogs.length > 0) {
    const lineItems = timeLogs.map(log => ({
      description: log.description,
      hours: log.hours,
      amount: log.amount.toString(),
      timeLogId: log.timeLogId,
      rate: (log.rate || engagement.hourly_rate).toString(),
      invoiceId
    }));

    await pool.query(
      'INSERT INTO invoice_line_items (description, hours, amount, time_log_id, rate, invoice_id) VALUES ' +
      lineItems.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', '),
      lineItems.flatMap(item => [item.description, item.hours, item.amount, item.timeLogId, item.rate, item.invoiceId])
    );
  } else if (invoiceType === 'project') {
    await pool.query(
      'INSERT INTO invoice_line_items (description, hours, amount, rate, invoice_id) VALUES ($1, $2, $3, $4, $5)',
      [
        `Project fee for ${engagement.project_name}`,
        0,
        totalAmount.toString(),
        totalAmount.toString(),
        invoiceId
      ]
    );
  }

  return { id: invoiceId };
} 