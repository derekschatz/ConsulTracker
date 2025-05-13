import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../db';
import { storage } from '../storage';

describe('Invoice Creation', () => {
  let userId: number;
  let engagementId: number;
  let timeLogId: number;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      'INSERT INTO users (username, password, name) VALUES ($1, $2, $3) RETURNING id',
      ['testuser', 'password', 'Test User']
    );
    userId = userResult.rows[0].id;

    // Create test engagement
    const engagementResult = await pool.query(
      'INSERT INTO engagements (user_id, client_name, project_name, start_date, end_date, hourly_rate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, 'Test Client', 'Test Project', '2025-01-01', '2025-12-31', 100]
    );
    engagementId = engagementResult.rows[0].id;

    // Create test time log
    const timeLogResult = await pool.query(
      'INSERT INTO time_logs (user_id, engagement_id, date, hours, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, engagementId, '2025-03-31', 8, 'Test work']
    );
    timeLogId = timeLogResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id = $1)', [userId]);
    await pool.query('DELETE FROM invoices WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM time_logs WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM engagements WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  it('should create an invoice with correct total amount and hours', async () => {
    // Create invoice
    const invoiceData = {
      userId,
      engagementId,
      timeLogs: [{
        id: timeLogId,
        hours: 8,
        description: 'Test work',
        date: '2025-03-31',
        engagement: {
          hourlyRate: 100
        }
      }]
    };

    // Insert invoice
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.id).toBeDefined();

    // Verify invoice details
    const invoice = await storage.getInvoice(result.id);
    expect(invoice).toBeDefined();
    expect(invoice?.totalAmount).toBe(800); // 8 hours * $100/hour
    expect(invoice?.lineItems).toHaveLength(1);
    expect(Number(invoice?.lineItems[0].amount)).toBe(800);
    expect(invoice?.lineItems[0].hours).toBe(8);
    expect(Number(invoice?.lineItems[0].rate)).toBe(100);
  });

  it('should handle multiple time logs correctly', async () => {
    // Create additional time log
    const timeLog2Result = await pool.query(
      'INSERT INTO time_logs (user_id, engagement_id, date, hours, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, engagementId, '2025-03-31', 4, 'Additional work']
    );
    const timeLog2Id = timeLog2Result.rows[0].id;

    // Create invoice with multiple time logs
    const invoiceData = {
      userId,
      engagementId,
      timeLogs: [
        {
          id: timeLogId,
          hours: 8,
          description: 'Test work',
          date: '2025-03-31',
          engagement: {
            hourlyRate: 100
          }
        },
        {
          id: timeLog2Id,
          hours: 4,
          description: 'Additional work',
          date: '2025-03-31',
          engagement: {
            hourlyRate: 100
          }
        }
      ]
    };

    // Insert invoice
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    expect(response.status).toBe(200);
    const result = await response.json();

    // Verify invoice details
    const invoice = await storage.getInvoice(result.id);
    expect(invoice).toBeDefined();
    expect(invoice?.totalAmount).toBe(1200); // (8 + 4) hours * $100/hour
    expect(invoice?.lineItems).toHaveLength(2);
    expect(invoice?.lineItems.reduce((sum, item) => sum + Number(item.amount), 0)).toBe(1200);
    expect(invoice?.lineItems.reduce((sum, item) => sum + item.hours, 0)).toBe(12);
  });
}); 