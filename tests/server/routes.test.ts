import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import seed from '../../server/seed';
import { pool } from '../../server/db';
import type { TimeLog, Invoice, Engagement } from '../../shared/schema';

const app = express();
registerRoutes(app);

describe('API Routes', () => {
  beforeEach(async () => {
    // Clear and seed database before each test
    await pool.query('TRUNCATE time_logs, invoices, engagements CASCADE');
    await seed();
  });

  describe('Time Log Filters', () => {
    it('should filter time logs by date range', async () => {
      const response = await request(app)
        .get('/api/time-logs')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((log: TimeLog) => {
        const logDate = new Date(log.date);
        expect(logDate >= new Date('2024-01-01')).toBe(true);
        expect(logDate <= new Date('2024-12-31')).toBe(true);
      });
    });

    it('should filter time logs by engagement ID', async () => {
      // First get an engagement ID from the database
      const engagementResult = await pool.query('SELECT id FROM engagements LIMIT 1');
      const engagementId = engagementResult.rows[0].id;

      const response = await request(app)
        .get('/api/time-logs')
        .query({ engagementId });
      
      expect(response.status).toBe(200);
      response.body.forEach((log: TimeLog) => {
        expect(log.engagementId).toBe(engagementId);
      });
    });
  });

  describe('Invoice Filters', () => {
    it('should filter invoices by status', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .query({ status: 'PAID' });
      
      expect(response.status).toBe(200);
      response.body.forEach((invoice: Invoice) => {
        expect(invoice.status).toBe('PAID');
      });
    });

    it('should filter invoices by date range', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });
      
      expect(response.status).toBe(200);
      response.body.forEach((invoice: Invoice) => {
        const invoiceDate = new Date(invoice.issueDate);
        expect(invoiceDate >= new Date('2024-01-01')).toBe(true);
        expect(invoiceDate <= new Date('2024-12-31')).toBe(true);
      });
    });
  });

  describe('Engagement Filters', () => {
    it('should filter engagements by status', async () => {
      const response = await request(app)
        .get('/api/engagements')
        .query({ status: 'ACTIVE' });
      
      expect(response.status).toBe(200);
      response.body.forEach((engagement: Engagement) => {
        expect(engagement.status).toBe('ACTIVE');
      });
    });

    it('should handle multiple filters simultaneously', async () => {
      const response = await request(app)
        .get('/api/engagements')
        .query({
          status: 'ACTIVE',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });
      
      expect(response.status).toBe(200);
      response.body.forEach((engagement: Engagement) => {
        expect(engagement.status).toBe('ACTIVE');
        const startDate = new Date(engagement.startDate);
        expect(startDate >= new Date('2024-01-01')).toBe(true);
        expect(startDate <= new Date('2024-12-31')).toBe(true);
      });
    });

    it('should handle invalid date ranges gracefully', async () => {
      const response = await request(app)
        .get('/api/engagements')
        .query({
          startDate: 'invalid-date',
          endDate: '2024-12-31'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 