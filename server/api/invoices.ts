import express, { Request, Response } from 'express';
import { pool } from '../db';
import { z } from 'zod';
import { invoiceTypeEnum } from '../../shared/schema';

// Use a compatible User type for augmentation
declare global {
  namespace Express {
    interface User {
      id: number;
      [key: string]: any;
    }
    interface Request {
      isAuthenticated(): boolean;
      user?: User;
    }
  }
}

const router = express.Router();

// Create invoice endpoint
router.post('/', async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to create invoices" });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // Parse and validate request body
    const bodySchema = z.object({
      engagementId: z.number(),
      timeLogs: z.array(z.any()).optional().default([]),
      invoiceAmount: z.number().optional(),
      periodStart: z.string().optional(),
      periodEnd: z.string().optional()
    });

    const validatedBody = bodySchema.parse(req.body);
    const { engagementId, timeLogs = [], invoiceAmount, periodStart, periodEnd } = validatedBody;

    // Get engagement details including engagement_type
    const engagementResult = await pool.query(
      'SELECT client_name, project_name, hourly_rate, engagement_type, net_terms FROM engagements WHERE id = $1 AND user_id = $2',
      [engagementId, userId]
    );
    
    if (engagementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Engagement not found' });
    }
    
    const engagement = engagementResult.rows[0];
    const clientName = engagement.client_name;
    const projectName = engagement.project_name;
    const invoiceType = engagement.engagement_type;
    
    // Validate invoice type
    const validationType = invoiceTypeEnum.safeParse(invoiceType);
    if (!validationType.success) {
      return res.status(400).json({ error: 'Invalid engagement type' });
    }

    // Calculate total invoice amount based on type
    const totalAmount = invoiceType === 'hourly'
      ? timeLogs.reduce((sum: number, log: any) => sum + (parseFloat(log.amount) || 0), 0)
      : invoiceAmount || 0;

    const totalHours = invoiceType === 'hourly'
      ? timeLogs.reduce((sum: number, log: any) => sum + (parseFloat(log.hours) || 0), 0)
      : 0;

    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + (engagement.net_terms || 30));

    // Create invoice with invoice_type
    const invoiceResult = await pool.query(
      `INSERT INTO invoices (
        engagement_id, status, issue_date, due_date, invoice_number, 
        client_name, total_amount, total_hours, period_start, period_end, 
        project_name, user_id, invoice_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING id`,
      [
        engagementId, 
        'submitted', 
        today, 
        dueDate, 
        `INV-${Date.now().toString().slice(-6)}`,
        clientName,
        totalAmount,
        totalHours,
        periodStart ? new Date(periodStart) : today,
        periodEnd ? new Date(periodEnd) : today,
        projectName,
        userId,
        invoiceType
      ]
    );
    
    const invoiceId = invoiceResult.rows[0].id;

    // Only create invoice items for hourly invoices with time logs
    if (invoiceType === 'hourly' && timeLogs.length > 0) {
      const invoiceItems = timeLogs.map((log: any) => ({
        description: log.description,
        hours: log.hours,
        amount: log.amount ? log.amount.toString() : '0',
        timeLogId: log.timeLogId || log.id,
        rate: log.rate ? log.rate.toString() : engagement.hourly_rate.toString(),
        invoiceId
      }));

      await pool.query(
        'INSERT INTO invoice_line_items (description, hours, amount, time_log_id, rate, invoice_id) VALUES ' +
        invoiceItems.map((_: any, i: number) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', '),
        invoiceItems.flatMap((item: any) => [item.description, item.hours, item.amount, item.timeLogId, item.rate, item.invoiceId])
      );
    } else if (invoiceType === 'project') {
      // Create a single line item for project-based invoices
      await pool.query(
        'INSERT INTO invoice_line_items (description, hours, amount, rate, invoice_id) VALUES ($1, $2, $3, $4, $5)',
        [
          `Project fee for ${projectName}`,
          0,
          totalAmount.toString(),
          totalAmount.toString(),
          invoiceId
        ]
      );
    }

    res.status(200).json({ id: invoiceId });
  } catch (error) {
    console.error('Error creating invoice:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

export default router; 