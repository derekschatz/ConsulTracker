import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEngagementSchema, 
  insertTimeLogSchema, 
  insertInvoiceSchema,
  calculateEngagementStatus
} from "@shared/schema";
import { setupAuth } from "./auth";
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
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);
      
      return {
        startDate: weekStart,
        endDate: weekEnd
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
    
    case 'all':
      // Return a very broad date range to get all invoices
      return {
        startDate: new Date(1970, 0, 1), // From the beginning of time (approx)
        endDate: new Date(2099, 11, 31, 23, 59, 59) // Far into the future
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
  // Set up authentication
  setupAuth(app);
  
  // prefix all routes with /api

  // Engagement routes
  app.get("/api/engagements", async (req, res) => {
    try {
      // Get all engagements first
      let engagements = await storage.getEngagements();
      
      // Update status for all engagements based on current date and their date ranges
      engagements = engagements.map(engagement => {
        const currentStatus = calculateEngagementStatus(
          new Date(engagement.startDate), 
          new Date(engagement.endDate)
        );
        
        // Create a new object with updated status
        return {
          ...engagement,
          status: currentStatus
        };
      });
      
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
        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ error: 'Invalid date format' });
        }

        engagements = engagements.filter(engagement => {
          const engagementStart = new Date(engagement.startDate);
          const engagementEnd = new Date(engagement.endDate);
          // Include engagement if it overlaps with the date range
          return !(engagementEnd < startDate || engagementStart > endDate);
        });
      } else if (dateRange) {
        // Use predefined date range
        const { startDate, endDate } = getDateRange(dateRange);
        engagements = engagements.filter(engagement => {
          const engagementStart = new Date(engagement.startDate);
          const engagementEnd = new Date(engagement.endDate);
          // Include engagement if it overlaps with the date range
          return !(engagementEnd < startDate || engagementStart > endDate);
        });
      }
      
      res.json(engagements);
    } catch (error) {
      console.error("Error fetching engagements:", error);
      res.status(500).json({ message: "Failed to fetch engagements" });
    }
  });

  app.get("/api/engagements/active", async (_req, res) => {
    try {
      let engagements = await storage.getActiveEngagements();
      
      // Update status for all engagements based on current date and their date ranges
      engagements = engagements.map(engagement => {
        const currentStatus = calculateEngagementStatus(
          new Date(engagement.startDate), 
          new Date(engagement.endDate)
        );
        
        // Create a new object with updated status
        return {
          ...engagement,
          status: currentStatus
        };
      });
      
      // Filter to only return truly active engagements based on calculated status
      engagements = engagements.filter(engagement => engagement.status === 'active');
      
      res.json(engagements);
    } catch (error) {
      console.error("Error fetching active engagements:", error);
      res.status(500).json({ message: "Failed to fetch active engagements" });
    }
  });

  app.get("/api/engagements/:id", async (req, res) => {
    try {
      const engagement = await storage.getEngagement(Number(req.params.id));
      if (!engagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      
      // Update status based on current date and engagement dates
      const currentStatus = calculateEngagementStatus(
        new Date(engagement.startDate), 
        new Date(engagement.endDate)
      );
      
      // Create a new object with updated status
      const updatedEngagement = {
        ...engagement,
        status: currentStatus
      };
      
      res.json(updatedEngagement);
    } catch (error) {
      console.error("Error fetching engagement:", error);
      res.status(500).json({ message: "Failed to fetch engagement" });
    }
  });

  app.post("/api/engagements", async (req, res) => {
    try {
      const validationResult = insertEngagementSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid engagement data", errors: validationResult.error.errors });
      }
      
      // Calculate the status based on start and end dates
      const status = calculateEngagementStatus(
        new Date(validationResult.data.startDate),
        new Date(validationResult.data.endDate)
      );
      
      // Override any status provided with the calculated one
      const data = {
        ...validationResult.data,
        status
      };

      const engagement = await storage.createEngagement(data);
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
      
      // Get the input data
      const inputData = validationResult.data;
      
      // Only calculate status if both dates are provided in this update
      if (inputData.startDate !== undefined && inputData.endDate !== undefined) {
        // Calculate the status based on start and end dates
        const status = calculateEngagementStatus(
          new Date(inputData.startDate), 
          new Date(inputData.endDate)
        );
        
        // Override the status in the input data
        inputData.status = status;
      } 
      // If only one date is provided, we need to get the other one from the database
      else if (inputData.startDate !== undefined || inputData.endDate !== undefined) {
        // Get the current engagement
        const currentEngagement = await storage.getEngagement(id);
        if (!currentEngagement) {
          return res.status(404).json({ message: "Engagement not found" });
        }
        
        // Get the dates (use the new one if provided, otherwise use the existing one)
        const startDate = inputData.startDate ? new Date(inputData.startDate) : new Date(currentEngagement.startDate);
        const endDate = inputData.endDate ? new Date(inputData.endDate) : new Date(currentEngagement.endDate);
        
        // Calculate the status based on the combined dates
        const status = calculateEngagementStatus(startDate, endDate);
        
        // Override the status in the input data
        inputData.status = status;
      }

      const updatedEngagement = await storage.updateEngagement(id, inputData);
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
      const clientName = req.query.client as string | undefined;
      const dateRange = req.query.dateRange as string | undefined;
      const startDateParam = req.query.startDate as string | undefined;
      const endDateParam = req.query.endDate as string | undefined;
      const search = req.query.search as string | undefined;

      console.log('Time log request params:', {
        engagementId,
        clientName,
        dateRange,
        startDate: startDateParam,
        endDate: endDateParam,
        search
      });
      
      let timeLogs;
      let startDate, endDate;

      if (startDateParam && endDateParam) {
        // Use explicit date parameters
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        console.log('Using explicit date range:', startDate, 'to', endDate);
      } else if (dateRange) {
        // Use predefined date range
        const range = getDateRange(dateRange);
        startDate = range.startDate;
        endDate = range.endDate;
        console.log('Using date range:', dateRange, startDate, 'to', endDate);
      } else {
        // Default to all time logs
        timeLogs = await storage.getTimeLogs();
        console.log('Getting all time logs');
      }

      // Get logs filtered by date range if we have dates
      if (startDate && endDate) {
        timeLogs = await storage.getTimeLogsByDateRange(startDate, endDate);
      } else if (engagementId) {
        // Filter by specific engagement ID
        timeLogs = await storage.getTimeLogsByEngagement(engagementId);
      } else if (!timeLogs) {
        // If we haven't loaded logs yet, get all of them
        timeLogs = await storage.getTimeLogs();
      }
      
      // If client filter is applied, filter the results by client name
      if (timeLogs && clientName && clientName !== 'all') {
        timeLogs = timeLogs.filter(log => log.engagement.clientName === clientName);
      }

      // Apply search filter if present
      if (timeLogs && search) {
        const searchLower = search.toLowerCase();
        timeLogs = timeLogs.filter(log => 
          log.description.toLowerCase().includes(searchLower) ||
          log.engagement.clientName.toLowerCase().includes(searchLower) ||
          log.engagement.projectName.toLowerCase().includes(searchLower)
        );
      }

      res.json(timeLogs || []);
    } catch (error) {
      console.error("Error fetching time logs:", error);
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
  
  // Function to check and update overdue invoices
  const checkAndUpdateOverdueInvoices = async () => {
    try {
      const today = new Date();
      
      // Find invoices that are past due date and not already marked as overdue or paid
      const overdueInvoices = await pool.query(
        'SELECT id FROM invoices WHERE due_date < $1 AND status = $2',
        [today, 'submitted']
      );
      
      // Update any overdue invoices
      for (const invoice of overdueInvoices.rows) {
        await pool.query(
          'UPDATE invoices SET status = $1 WHERE id = $2',
          ['overdue', invoice.id]
        );
        console.log(`Updated invoice ${invoice.id} to overdue status`);
      }
      
      return overdueInvoices.rows.length;
    } catch (error) {
      console.error('Error checking overdue invoices:', error);
      return 0;
    }
  };
  
  app.get("/api/invoices", async (req: Request, res: Response) => {
    try {
      // Check for overdue invoices before returning results
      await checkAndUpdateOverdueInvoices();
      
      const { status, client, dateRange, startDate, endDate } = req.query;
      let query = `
        SELECT i.*
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
        query += ` AND i.client_name = $${params.length + 1}`;
        params.push(client);
      }

      // Apply date range filter
      if (dateRange === 'custom' && startDate && endDate) {
        // Format the custom date range with time to include the full end date
        const formattedStartDate = `${startDate as string} 00:00:00`;
        const formattedEndDate = `${endDate as string} 23:59:59`;
        
        query += ` AND i.issue_date >= $${params.length + 1} AND i.issue_date <= $${params.length + 2}`;
        params.push(formattedStartDate, formattedEndDate);
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
      const invoiceId = Number(req.params.id);
      
      if (isNaN(invoiceId) || invoiceId <= 0) {
        console.error(`Invalid invoice ID requested: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid invoice ID format" });
      }
      
      console.log(`Fetching invoice details for ID: ${invoiceId}`);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        console.error(`Invoice not found with ID: ${invoiceId}`);
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Verify invoice has required fields
      if (!invoice.invoiceNumber || !invoice.clientName) {
        console.error(`Invoice ${invoiceId} has missing required fields:`, invoice);
        return res.status(500).json({ message: "Invoice data is incomplete" });
      }
      
      // Verify line items
      if (!Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) {
        console.warn(`Invoice ${invoiceId} (${invoice.invoiceNumber}) has no line items`);
        // Continue anyway, client will handle this case
      }
      
      console.log(`Successfully retrieved invoice ${invoiceId} (${invoice.invoiceNumber}) with ${invoice.lineItems.length} line items`);
      res.json(invoice);
    } catch (error) {
      console.error(`Error fetching invoice ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch invoice", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post('/api/invoices', async (req: Request, res: Response) => {
    try {
      const { engagementId, timeLogs = [] } = req.body;

      // Validate required fields
      if (!engagementId) {
        return res.status(400).json({ error: 'Engagement ID is required' });
      }

      // Create invoice
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 30); // Due date 30 days from now
      
      // Get engagement details
      const engagementResult = await pool.query(
        'SELECT client_name, project_name, hourly_rate FROM engagements WHERE id = $1',
        [engagementId]
      );
      
      if (engagementResult.rows.length === 0) {
        return res.status(404).json({ error: 'Engagement not found' });
      }
      
      const engagement = engagementResult.rows[0];
      const clientName = engagement.client_name;
      const projectName = engagement.project_name;
      
      // Calculate total invoice amount
      const totalAmount = timeLogs.reduce((sum: number, log: any) => 
        sum + (parseFloat(log.amount) || 0), 0);
      
      const invoiceResult = await pool.query(
        'INSERT INTO invoices (engagement_id, status, issue_date, due_date, invoice_number, client_name, amount, period_start, period_end, project_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
        [
          engagementId, 
          'submitted', 
          today, 
          dueDate, 
          `INV-${Date.now().toString().slice(-6)}`, // Generate simple invoice number
          clientName,
          totalAmount,
          req.body.periodStart || today, 
          req.body.periodEnd || today,
          projectName
        ]
      );
      
      const invoiceId = invoiceResult.rows[0].id;

      // Only create invoice items if there are time logs
      if (timeLogs.length > 0) {
        // Create invoice items from time logs
        const invoiceItems = timeLogs.map((log: any) => ({
          description: log.description,
          hours: log.hours,
          amount: log.amount ? log.amount.toString() : '0',
          timeLogId: log.timeLogId || log.id, // Support both formats
          rate: log.rate ? log.rate.toString() : engagement.hourly_rate.toString(),
          invoiceId
        }));

        // Insert invoice items
        await pool.query(
          'INSERT INTO invoice_line_items (description, hours, amount, time_log_id, rate, invoice_id) VALUES ' +
          invoiceItems.map((_: any, i: number) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', '),
          invoiceItems.flatMap((item: InvoiceItem) => [item.description, item.hours, item.amount, item.timeLogId, item.rate, item.invoiceId])
        );
      }

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

      // Generate PDF for attachment
      console.log("Generating PDF attachment...");
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // Add invoice details to PDF
      pdf.setFontSize(16);
      pdf.text(`INVOICE #${invoice.invoiceNumber}`, 105, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Client: ${invoice.clientName}`, 20, 40);
      pdf.text(`Amount: $${invoice.amount}`, 20, 50);
      pdf.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 20, 60);
      pdf.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, 70);
      
      // Line items table
      pdf.setFontSize(12);
      pdf.text("Service Items:", 20, 90);
      
      let yPos = 100;
      pdf.setFontSize(10);
      
      // Table header
      pdf.text("Description", 20, yPos);
      pdf.text("Hours", 120, yPos);
      pdf.text("Rate", 140, yPos);
      pdf.text("Amount", 170, yPos);
      
      yPos += 10;
      
      // Table data
      invoice.lineItems.forEach(item => {
        pdf.text(item.description.substring(0, 50), 20, yPos);
        pdf.text(item.hours.toString(), 120, yPos);
        pdf.text(`$${item.rate}`, 140, yPos);
        pdf.text(`$${item.amount}`, 170, yPos);
        yPos += 10;
      });
      
      // Total
      yPos += 10;
      pdf.text(`Total Amount: $${invoice.amount}`, 120, yPos);
      
      // Convert PDF to base64
      const pdfBase64 = pdf.output('datauristring');
      
      // Return the PDF data and email details
      const emailSubject = `Invoice #${invoice.invoiceNumber} from Your Consulting Service`;
      const emailBody = `Please find attached invoice #${invoice.invoiceNumber} for ${invoice.clientName} in the amount of $${invoice.amount}.
      
Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Client: ${invoice.clientName}
- Amount: $${invoice.amount}
- Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}
- Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`;
      
      res.json({ 
        message: "PDF generated successfully",
        pdfData: pdfBase64,
        emailSubject,
        emailBody,
        filename: `Invoice-${invoice.invoiceNumber}.pdf`
      });
    } catch (error) {
      console.error("General error:", error);
      res.status(500).json({ 
        message: "Failed to generate invoice PDF",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
