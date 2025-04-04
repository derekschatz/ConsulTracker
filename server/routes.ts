import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEngagementSchema, 
  insertTimeLogSchema, 
  insertInvoiceSchema 
} from "@shared/schema";
import { z } from "zod";
import nodemailer from "nodemailer";
import { format, parse, isValid, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from 'date-fns';
import { pool } from './db';

// Helper function to get date range based on predefined ranges
function getDateRange(range: string, referenceDate: Date = new Date()): { startDate: Date; endDate: Date } {
  const today = referenceDate;
  
  switch (range) {
    case 'current':
      return {
        startDate: new Date(today.getFullYear(), 0, 1), // January 1st of current year
        endDate: new Date(today.getFullYear(), 11, 31, 23, 59, 59) // December 31st of current year
      };
    
    case 'last':
      return {
        startDate: new Date(today.getFullYear() - 1, 0, 1), // January 1st of last year
        endDate: new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59) // December 31st of last year
      };

    case 'week':
      return {
        startDate: startOfWeek(today, { weekStartsOn: 1 }),
        endDate: endOfWeek(today, { weekStartsOn: 1 })
      };
    
    case 'month':
      return {
        startDate: startOfMonth(today),
        endDate: endOfMonth(today)
      };
    
    case 'quarter':
      return {
        startDate: startOfQuarter(today),
        endDate: endOfQuarter(today)
      };
    
    case 'year':
      return {
        startDate: startOfYear(today),
        endDate: endOfYear(today)
      };
    
    case 'last3':
      return {
        startDate: startOfMonth(subMonths(today, 3)),
        endDate: endOfMonth(today)
      };
    
    case 'last6':
      return {
        startDate: startOfMonth(subMonths(today, 6)),
        endDate: endOfMonth(today)
      };
    
    case 'last12':
      return {
        startDate: startOfMonth(subMonths(today, 12)),
        endDate: endOfMonth(today)
      };
    
    case 'custom':
      // For custom ranges, the frontend should provide explicit startDate and endDate
      return {
        startDate: today,
        endDate: today
      };
    
    default:
      return {
        startDate: startOfYear(today),
        endDate: endOfYear(today)
      };
  }
}

// Helper function to validate and parse date strings
function parseAndValidateDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  const date = parse(dateString, 'yyyy-MM-dd', new Date());
  return isValid(date) ? date : null;
}

interface InvoiceItem {
  description: string;
  hours: number;
  amount: string;
  timeLogId: number;
  rate: string;
  invoiceId: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api

  // Engagement routes
  app.get("/api/engagements", async (req, res) => {
    try {
      // Get all engagements first
      let engagements = await storage.getEngagements();
      
      // Apply status filter if provided
      const status = req.query.status as string | undefined;
      if (status && status !== 'all') {
        engagements = engagements.filter(engagement => engagement.status === status);
      }
      
      // Apply client filter if provided
      const clientName = req.query.client as string | undefined;
      if (clientName && clientName !== 'all') {
        engagements = engagements.filter(engagement => engagement.clientName === clientName);
      }
      
      // Apply date range filter if provided
      const dateRange = req.query.dateRange as string | undefined;
      const startDateParam = req.query.startDate as string | undefined;
      const endDateParam = req.query.endDate as string | undefined;

      if (startDateParam && endDateParam) {
        // Use custom date range if provided
        // Create date objects by parsing the YYYY-MM-DD format
        const startDateParts = startDateParam.split('-').map(Number);
        const endDateParts = endDateParam.split('-').map(Number);
        
        // Create date objects using year, month (0-based), and day
        const startDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);
        const endDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);
        
        // Set time components appropriately for day-level comparison
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ error: 'Invalid date format' });
        }

        console.log('Server processing custom date range:', {
          startParam: startDateParam,
          endParam: endDateParam,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        engagements = engagements.filter(engagement => {
          const engagementStartRaw = new Date(engagement.startDate);
          const engagementEndRaw = new Date(engagement.endDate);
          
          // Create clean date objects with consistent time components
          const engagementStart = new Date(
            engagementStartRaw.getFullYear(), 
            engagementStartRaw.getMonth(), 
            engagementStartRaw.getDate()
          );
          engagementStart.setHours(0, 0, 0, 0);
          
          const engagementEnd = new Date(
            engagementEndRaw.getFullYear(), 
            engagementEndRaw.getMonth(), 
            engagementEndRaw.getDate()
          );
          engagementEnd.setHours(23, 59, 59, 999);
          
          // Custom range: either the start date or end date is within the selected range
          // or the range completely encompasses the engagement
          return (
            (engagementStart >= startDate && engagementStart <= endDate) || // Start date within range
            (engagementEnd >= startDate && engagementEnd <= endDate) || // End date within range
            (engagementStart <= startDate && engagementEnd >= endDate) // Engagement spans the entire range
          );
        });
      } else if (dateRange) {
        // Use predefined date range
        if (dateRange === 'all') {
          // For 'all', we don't apply any date filtering
          // No need to filter - show all engagements
        } else {
          const { startDate, endDate } = getDateRange(dateRange);
          
          // Special handling for different date ranges
          if (dateRange === 'current') {
            // Current Year: include engagements that overlap with the current year
            const currentYear = startDate.getFullYear();
            const yearStart = new Date(currentYear, 0, 1);
            yearStart.setHours(0, 0, 0, 0); // Set to start of day
            const yearEnd = new Date(currentYear, 11, 31);
            yearEnd.setHours(23, 59, 59, 999); // Set to end of day

            engagements = engagements.filter(engagement => {
              const engagementStart = new Date(engagement.startDate);
              engagementStart.setHours(0, 0, 0, 0); // Set to start of day
              const engagementEnd = new Date(engagement.endDate);
              engagementEnd.setHours(23, 59, 59, 999); // Set to end of day
              
              // Include if:
              // 1. Engagement starts during the year, or
              // 2. Engagement ends during the year, or
              // 3. Engagement spans the entire year
              return (
                (engagementStart >= yearStart && engagementStart <= yearEnd) || // Starts in year
                (engagementEnd >= yearStart && engagementEnd <= yearEnd) || // Ends in year
                (engagementStart <= yearStart && engagementEnd >= yearEnd) // Spans year
              );
            });
          } else if (dateRange === 'last') {
            // Last Year: include engagements that overlap with last year
            const lastYear = startDate.getFullYear();
            const yearStart = new Date(lastYear, 0, 1);
            yearStart.setHours(0, 0, 0, 0); // Set to start of day
            const yearEnd = new Date(lastYear, 11, 31);
            yearEnd.setHours(23, 59, 59, 999); // Set to end of day

            engagements = engagements.filter(engagement => {
              const engagementStart = new Date(engagement.startDate);
              engagementStart.setHours(0, 0, 0, 0); // Set to start of day
              const engagementEnd = new Date(engagement.endDate);
              engagementEnd.setHours(23, 59, 59, 999); // Set to end of day
              
              // Include if:
              // 1. Engagement starts during the year, or
              // 2. Engagement ends during the year, or
              // 3. Engagement spans the entire year
              return (
                (engagementStart >= yearStart && engagementStart <= yearEnd) || // Starts in year
                (engagementEnd >= yearStart && engagementEnd <= yearEnd) || // Ends in year
                (engagementStart <= yearStart && engagementEnd >= yearEnd) // Spans year
              );
            });
          } else if (dateRange === 'month') {
            // This Month: include engagements that overlap with the current month
            const currentMonth = startDate.getMonth();
            const currentYear = startDate.getFullYear();
            const monthStart = new Date(currentYear, currentMonth, 1);
            monthStart.setHours(0, 0, 0, 0); // Set to start of day
            const monthEnd = new Date(currentYear, currentMonth + 1, 0);
            monthEnd.setHours(23, 59, 59, 999); // Set to end of day

            engagements = engagements.filter(engagement => {
              const engagementStart = new Date(engagement.startDate);
              engagementStart.setHours(0, 0, 0, 0); // Set to start of day
              const engagementEnd = new Date(engagement.endDate);
              engagementEnd.setHours(23, 59, 59, 999); // Set to end of day
              
              // Include if:
              // 1. Engagement starts during the month, or
              // 2. Engagement ends during the month, or
              // 3. Engagement spans the entire month
              return (
                (engagementStart >= monthStart && engagementStart <= monthEnd) || // Starts in month
                (engagementEnd >= monthStart && engagementEnd <= monthEnd) || // Ends in month
                (engagementStart <= monthStart && engagementEnd >= monthEnd) // Spans month
              );
            });
          } else {
            // Default filtering for other date ranges
            engagements = engagements.filter(engagement => {
              const engagementStart = new Date(engagement.startDate);
              const engagementEnd = new Date(engagement.endDate);
              
              // Include engagement if it overlaps with the date range
              return (
                (engagementStart >= startDate && engagementStart <= endDate) ||
                (engagementEnd >= startDate && engagementEnd <= endDate) ||
                (engagementStart <= startDate && engagementEnd >= endDate)
              );
            });
          }
        }
      }
      
      res.json(engagements);
    } catch (error) {
      console.error("Error fetching engagements:", error);
      res.status(500).json({ message: "Failed to fetch engagements" });
    }
  });

  app.get("/api/engagements/active", async (_req, res) => {
    try {
      const engagements = await storage.getActiveEngagements();
      res.json(engagements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active engagements" });
    }
  });

  app.get("/api/engagements/:id", async (req, res) => {
    try {
      const engagement = await storage.getEngagement(Number(req.params.id));
      if (!engagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      res.json(engagement);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch engagement" });
    }
  });

  app.post("/api/engagements", async (req, res) => {
    try {
      const validationResult = insertEngagementSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid engagement data", errors: validationResult.error.errors });
      }

      const engagement = await storage.createEngagement(validationResult.data);
      res.status(201).json(engagement);
    } catch (error) {
      res.status(500).json({ message: "Failed to create engagement" });
    }
  });

  app.put("/api/engagements/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const validationResult = insertEngagementSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid engagement data", errors: validationResult.error.errors });
      }

      const updatedEngagement = await storage.updateEngagement(id, validationResult.data);
      if (!updatedEngagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      res.json(updatedEngagement);
    } catch (error) {
      res.status(500).json({ message: "Failed to update engagement" });
    }
  });

  app.delete("/api/engagements/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteEngagement(id);
      if (!success) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete engagement" });
    }
  });

  // Time Log routes
  app.get("/api/time-logs", async (req, res) => {
    try {
      const engagementId = req.query.engagementId ? Number(req.query.engagementId) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const search = req.query.search as string | undefined;

      let timeLogs;
      if (engagementId) {
        timeLogs = await storage.getTimeLogsByEngagement(engagementId);
      } else if (startDate && endDate) {
        timeLogs = await storage.getTimeLogsByDateRange(startDate, endDate);
      } else {
        timeLogs = await storage.getTimeLogs();
      }

      // Apply search filter if present
      if (search) {
        const searchLower = search.toLowerCase();
        timeLogs = timeLogs.filter(log => 
          log.description.toLowerCase().includes(searchLower) ||
          log.engagement.clientName.toLowerCase().includes(searchLower) ||
          log.engagement.projectName.toLowerCase().includes(searchLower)
        );
      }

      res.json(timeLogs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  app.get("/api/time-logs/:id", async (req, res) => {
    try {
      const timeLog = await storage.getTimeLog(Number(req.params.id));
      if (!timeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }
      res.json(timeLog);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time log" });
    }
  });

  app.post("/api/time-logs", async (req, res) => {
    try {
      const validationResult = insertTimeLogSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid time log data", errors: validationResult.error.errors });
      }

      const timeLog = await storage.createTimeLog(validationResult.data);
      res.status(201).json(timeLog);
    } catch (error) {
      res.status(500).json({ message: "Failed to create time log" });
    }
  });

  app.put("/api/time-logs/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const validationResult = insertTimeLogSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid time log data", errors: validationResult.error.errors });
      }

      const updatedTimeLog = await storage.updateTimeLog(id, validationResult.data);
      if (!updatedTimeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }
      res.json(updatedTimeLog);
    } catch (error) {
      res.status(500).json({ message: "Failed to update time log" });
    }
  });

  app.delete("/api/time-logs/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteTimeLog(id);
      if (!success) {
        return res.status(404).json({ message: "Time log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time log" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req: Request, res: Response) => {
    try {
      const { status, client, dateRange, startDate, endDate } = req.query;
      let query = `
        SELECT i.*, e.client_name, e.project_name
        FROM invoices i
        JOIN engagements e ON i.engagement_id = e.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Apply status filter
      if (status && status !== 'all') {
        query += ` AND i.status = $${params.length + 1}`;
        params.push(status);
      }

      // Apply client filter
      if (client && client !== 'all') {
        query += ` AND e.client_name = $${params.length + 1}`;
        params.push(client);
      }

      // Apply date range filter
      if (dateRange === 'custom' && startDate && endDate) {
        query += ` AND i.issue_date >= $${params.length + 1} AND i.issue_date <= $${params.length + 2}`;
        params.push(startDate as string, endDate as string);
      } else if (dateRange && dateRange !== 'all') {
        const { startDate: rangeStart, endDate: rangeEnd } = getDateRange(dateRange as string);
        query += ` AND i.issue_date >= $${params.length + 1} AND i.issue_date <= $${params.length + 2}`;
        params.push(
          format(rangeStart, 'yyyy-MM-dd'),
          format(rangeEnd, 'yyyy-MM-dd 23:59:59')
        );
      }

      query += ' ORDER BY i.issue_date DESC';

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(Number(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post('/api/invoices', async (req: Request, res: Response) => {
    try {
      const { engagementId, timeLogs } = req.body;

      // Create invoice
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 30); // Due date 30 days from now
      
      const invoiceResult = await pool.query(
        'INSERT INTO invoices (engagement_id, status, issue_date, due_date, invoice_number, client_name, amount, period_start, period_end) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [
          engagementId, 
          'pending', 
          today, 
          dueDate, 
          `INV-${Date.now().toString().slice(-6)}`, // Generate simple invoice number
          'Client', // This will be updated after we get engagement details
          0, // Initial amount, will be calculated from line items
          today, // Using today as period start
          today  // Using today as period end (will be updated)
        ]
      );
      const invoiceId = invoiceResult.rows[0].id;

      // Create invoice items from time logs
      const invoiceItems = timeLogs.map((log: any) => ({
        description: log.description,
        hours: log.hours,
        amount: log.amount.toString(),
        timeLogId: log.timeLogId,
        rate: log.rate.toString(),
        invoiceId
      }));

      // Insert invoice items
      await pool.query(
        'INSERT INTO invoice_items (description, hours, amount, time_log_id, rate, invoice_id) VALUES ' +
        invoiceItems.map((_: any, i: number) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', '),
        invoiceItems.flatMap((item: InvoiceItem) => [item.description, item.hours, item.amount, item.timeLogId, item.rate, item.invoiceId])
      );

      res.json({ id: invoiceId });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  app.put("/api/invoices/:id/status", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const statusSchema = z.object({ status: z.string() });
      
      const validationResult = statusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid status data", errors: validationResult.error.errors });
      }

      const updatedInvoice = await storage.updateInvoiceStatus(id, validationResult.data.status);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteInvoice(id);
      if (!success) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/ytd-revenue", async (req, res) => {
    try {
      // Default to 2025 for current year if no year is provided
      const year = Number(req.query.year) || 2025;
      const revenue = await storage.getYtdRevenue(year);
      res.json({ revenue });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch YTD revenue" });
    }
  });

  app.get("/api/dashboard/monthly-revenue", async (req, res) => {
    try {
      // Default to 2025 for current year if no year is provided
      const year = Number(req.query.year) || 2025;
      const monthlyData = await storage.getMonthlyRevenueBillable(year);
      res.json(monthlyData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly revenue" });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Using 2025 as the reference year for current data
      const demoYear = 2025;
      const demoMonth = 3; // April (0-based index)
      
      // Calculate start and end of April 2025 (current month)
      const startOfMonth = new Date(demoYear, demoMonth, 1);
      const endOfMonth = new Date(demoYear, demoMonth + 1, 0, 23, 59, 59);
      
      // Calculate start and end of year 2025
      const startOfYear = new Date(demoYear, 0, 1);
      const endOfYear = new Date(demoYear, 11, 31, 23, 59, 59);

      // Get stats in parallel
      const [
        activeEngagements,
        ytdRevenue,
        monthlyHours,
        pendingInvoicesTotal
      ] = await Promise.all([
        storage.getActiveEngagements(),
        storage.getYtdRevenue(demoYear),
        storage.getTotalHoursLogged(startOfMonth, endOfMonth),
        storage.getPendingInvoicesTotal()
      ]);

      res.json({
        ytdRevenue,
        activeEngagements: activeEngagements.length,
        monthlyHours,
        pendingInvoicesTotal
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Email invoice endpoint
  app.post("/api/invoices/:id/email", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const emailSchema = z.object({
        to: z.string().email(),
        subject: z.string().optional(),
        message: z.string().optional()
      });

      const validationResult = emailSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid email data", errors: validationResult.error.errors });
      }

      const { to, subject, message } = validationResult.data;
      
      // Get email configuration from environment variables
      const emailUser = process.env.EMAIL_USER || "";
      const emailPass = process.env.EMAIL_PASS || "";
      const emailHost = process.env.EMAIL_HOST || "smtp.example.com";
      
      // Setup nodemailer if credentials are provided
      if (emailUser && emailPass) {
        const transporter = nodemailer.createTransport({
          host: emailHost,
          port: 587,
          secure: false,
          auth: {
            user: emailUser,
            pass: emailPass
          }
        });

        // Email content with invoice details
        const emailSubject = subject || `Invoice #${invoice.invoiceNumber} from Your Consulting Service`;
        const emailText = message || `Please find attached invoice #${invoice.invoiceNumber} for ${invoice.clientName} in the amount of $${invoice.amount}.`;

        // In a real app, we would generate a PDF and attach it
        // For now, just send email text
        await transporter.sendMail({
          from: emailUser,
          to,
          subject: emailSubject,
          text: emailText,
          html: `<p>${emailText}</p><p>Invoice Details:</p>
                <ul>
                  <li>Invoice Number: ${invoice.invoiceNumber}</li>
                  <li>Client: ${invoice.clientName}</li>
                  <li>Amount: $${invoice.amount}</li>
                  <li>Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}</li>
                  <li>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</li>
                </ul>`
        });

        res.json({ message: "Email sent successfully" });
      } else {
        // If email credentials aren't provided, return a simulation success
        res.json({ 
          message: "Email would be sent (email credentials not configured)",
          details: {
            to,
            subject: subject || `Invoice #${invoice.invoiceNumber} from Your Consulting Service`,
            invoiceNumber: invoice.invoiceNumber
          }
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to send invoice email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
