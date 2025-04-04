import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEngagementSchema, 
  insertTimeLogSchema, 
  insertInvoiceSchema 
} from "@shared/schema";
import { z } from "zod";
import nodemailer from "nodemailer";

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api

  // Engagement routes
  app.get("/api/engagements", async (_req, res) => {
    try {
      const engagements = await storage.getEngagements();
      res.json(engagements);
    } catch (error) {
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

      let timeLogs;
      if (engagementId) {
        timeLogs = await storage.getTimeLogsByEngagement(engagementId);
      } else if (startDate && endDate) {
        timeLogs = await storage.getTimeLogsByDateRange(startDate, endDate);
      } else {
        timeLogs = await storage.getTimeLogs();
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
  app.get("/api/invoices", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;

      let invoices;
      if (status) {
        invoices = await storage.getInvoicesByStatus(status);
      } else {
        invoices = await storage.getInvoices();
      }

      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
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

  app.post("/api/invoices", async (req, res) => {
    try {
      const invoiceSchema = insertInvoiceSchema.extend({
        lineItems: z.array(z.object({
          timeLogId: z.number(),
          description: z.string(),
          hours: z.number(),
          rate: z.number(),
          amount: z.number()
        }))
      });
      
      const validationResult = invoiceSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid invoice data", errors: validationResult.error.errors });
      }

      const { lineItems, ...invoiceData } = validationResult.data;
      
      const invoice = await storage.createInvoice(invoiceData, lineItems);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to create invoice" });
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
      // Default to 2023 for demo data consistency if no year is provided
      const year = Number(req.query.year) || 2023;
      const revenue = await storage.getYtdRevenue(year);
      res.json({ revenue });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch YTD revenue" });
    }
  });

  app.get("/api/dashboard/monthly-revenue", async (req, res) => {
    try {
      // Default to 2023 for demo data consistency if no year is provided
      const year = Number(req.query.year) || 2023;
      const monthlyData = await storage.getMonthlyRevenueBillable(year);
      res.json(monthlyData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly revenue" });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Using 2023 as the reference year for our demo data
      const demoYear = 2023;
      const demoMonth = 9; // October (0-based index)
      
      // Calculate start and end of October 2023 (current month in demo data)
      const startOfMonth = new Date(demoYear, demoMonth, 1);
      const endOfMonth = new Date(demoYear, demoMonth + 1, 0, 23, 59, 59);
      
      // Calculate start and end of year 2023
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
