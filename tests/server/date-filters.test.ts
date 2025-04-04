import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { registerRoutes } from '../../server/routes';
import express from 'express';
import { storage } from '../../server/storage';

describe('Date Filtering Tests', () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  // Mock data for testing
  const testEngagements = [
    {
      id: 1,
      clientName: "Client 2023",
      projectName: "Project Past",
      startDate: "2023-01-01T00:00:00.000Z",
      endDate: "2023-12-31T23:59:59.999Z",
      status: "completed"
    },
    {
      id: 2,
      clientName: "Client 2024-2025",
      projectName: "Project Overlap",
      startDate: "2024-06-01T00:00:00.000Z",
      endDate: "2025-06-30T23:59:59.999Z",
      status: "active"
    },
    {
      id: 3,
      clientName: "Client 2025",
      projectName: "Project Current",
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-12-31T23:59:59.999Z",
      status: "active"
    },
    {
      id: 4,
      clientName: "Client April 2025",
      projectName: "Project This Month",
      startDate: "2025-04-01T00:00:00.000Z",
      endDate: "2025-04-30T23:59:59.999Z",
      status: "active"
    }
  ];

  // Mock storage getEngagements
  vi.spyOn(storage, 'getEngagements').mockResolvedValue(testEngagements);

  describe('Current Year Filter (2025)', () => {
    it('should return engagements that overlap with 2025', async () => {
      const response = await request(app)
        .get('/api/engagements')
        .query({ dateRange: 'current' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3); // Should include IDs 2, 3, and 4
      expect(response.body.map((e: any) => e.id)).toEqual(expect.arrayContaining([2, 3, 4]));
    });
  });

  describe('This Month Filter (April 2025)', () => {
    it('should return engagements that overlap with April 2025', async () => {
      const response = await request(app)
        .get('/api/engagements')
        .query({ dateRange: 'month' });

      expect(response.status).toBe(200);
      expect(response.body.map((e: any) => e.id)).toEqual(expect.arrayContaining([2, 3, 4]));
    });
  });

  describe('Custom Date Range', () => {
    it('should return engagements that overlap with the specified date range', async () => {
      const response = await request(app)
        .get('/api/engagements')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1); // Should only include ID 2
      expect(response.body[0].id).toBe(2);
    });

    it('should handle invalid date formats gracefully', async () => {
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