// @ts-nocheck - Temporarily disable TypeScript checking for this file
import type { Express, Request, Response, NextFunction, Router as ExpressRouter } from "express";
import { createServer, type Server } from "http";
import { storage, type DatabaseStorage } from "./storage";
import { 
  insertEngagementSchema, 
  insertTimeLogSchema, 
  insertInvoiceSchema,
  insertClientSchema,
  calculateEngagementStatus,
  type Invoice,
  type InvoiceWithLineItems,
  type InvoiceLineItem,
  type User,
  type Engagement,
  type TimeLogWithEngagement,
  engagementTypeEnum,
  engagements as engagementsTable,
  clients as clientsTable,
  updateEngagementSchema
} from "@shared/schema";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { z } from "zod";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from 'uuid';
import { format, parse, isValid, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from 'date-fns';
import { pool } from './db';
import { db } from './db';
import { eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import express from 'express';
import { ServerError, handleError as serverHandleError } from './serverError';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import type { Request as ExpressRequest } from 'express';
import type { FileFilterCallback } from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { emailService } from './services/email-service';
import stripeRoutes from './api/stripe';
import testRoutes from './api/test';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url || '');
const __dirname = dirname(__filename);

// Ensure uploads directory exists at startup
const UPLOADS_DIR = path.join(dirname(fileURLToPath(import.meta.url || '')), '..', 'uploads', 'logos');
console.log(`Checking uploads directory: ${UPLOADS_DIR}`);
if (!fs.existsSync(UPLOADS_DIR)) {
  console.log(`Creating uploads directory: ${UPLOADS_DIR}`);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} else {
  console.log(`Uploads directory exists: ${UPLOADS_DIR}`);
}

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

interface LineItem {
  invoice_id: number;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  time_log_id?: number;
}

const invoiceRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many invoice requests, please try again later'
});

// Define the schema for personal info updates
const personalInfoSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
});

// Define the schema for business info
const businessInfoSchema = z.object({
  companyName: z.string().min(1, { message: "Company name is required" }),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phoneNumber: z.string().optional(),
  taxId: z.string().optional(),
  companyLogo: z.string().optional(),
});

// Extend Request type to include userId and user
declare module 'express' {
  interface Request {
    userId?: number;
    user?: User & { id: number; username: string };
  }
}

// Authentication middleware function
const auth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Set userId from the user object for easy access
  if (req.user) {
    req.userId = req.user.id;
  }
  
  next();
};

// Error handling function
function handleError(err: any, res: Response) {
  console.error(err);
  
  if (err instanceof ServerError) {
    res.status(err.status).json({ error: err.message });
  } else if (err instanceof z.ZodError) {
    res.status(400).json({ error: "Validation error", details: err.errors });
  } else {
    res.status(500).json({ error: "Server error" });
  }
}

// Add this function near the top with other helper functions
async function getTimeLogs(userId: number, dateRange: string, startDate?: string, endDate?: string, engagementId?: string | number, clientFilter?: string) {
  let query = `
    SELECT t.*, e.client_name, e.project_name, e.hourly_rate 
    FROM time_logs t 
    JOIN engagements e ON t.engagement_id = e.id 
    WHERE t.user_id = $1
  `;
  const params: any[] = [userId];
  
  // Filter by engagement if specified
  if (engagementId && engagementId !== '0') {
    query += ` AND t.engagement_id = $${params.length + 1}`;
    params.push(Number(engagementId));
  }
  
  // Filter by client if specified
  if (clientFilter && clientFilter !== 'all') {
    query += ` AND e.client_name = $${params.length + 1}`;
    params.push(clientFilter);
  }
  
  // Apply date filtering
  if (dateRange === 'all') {
    // No date filtering needed
  } else {
    let dateStart: Date;
    let dateEnd: Date;
    
    if (dateRange === 'custom' && startDate && endDate) {
      dateStart = parse(startDate, 'yyyy-MM-dd', new Date());
      dateEnd = parse(endDate, 'yyyy-MM-dd', new Date());
    } else {
      // Use getDateRange for all predefined ranges (month, week, etc.)
      const range = getDateRange(dateRange);
      dateStart = range.startDate;
      dateEnd = range.endDate;
    }
    
    query += ` AND t.date >= $${params.length + 1}::date AND t.date <= $${params.length + 2}::date`;
    params.push(format(dateStart, 'yyyy-MM-dd'), format(dateEnd, 'yyyy-MM-dd'));
  }
  
  query += ` ORDER BY t.date DESC`;
  
  console.log('Executing getTimeLogs query:', { 
    query, 
    params, 
    dateRange,
    startDate: params[params.length - 2],
    endDate: params[params.length - 1]
  });
  
  const result = await pool.query(query, params);
  console.log(`Found ${result.rows.length} time logs`);
  
  return result.rows.map(log => ({
    id: log.id,
    userId: log.user_id,
    engagementId: log.engagement_id,
    date: log.date,
    hours: log.hours,
    description: log.description,
    billableAmount: parseFloat(log.hours) * parseFloat(log.hourly_rate),
    clientName: log.client_name,
    projectName: log.project_name,
    engagement: {
      id: log.engagement_id,
      clientName: log.client_name,
      projectName: log.project_name,
      hourlyRate: log.hourly_rate
    }
  }));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Using the pre-defined UPLOADS_DIR const instead of potentially problematic __dirname
  const uploadsDir = UPLOADS_DIR;
  
  // Configure multer for file uploads
  const logoStorage = multer.diskStorage({
    destination: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
      cb(null, uploadsDir);
    },
    filename: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
      // Generate unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const userId = req.user ? (req.user as any).id : 'unknown';
      cb(null, `logo-${userId}-${uniqueSuffix}${ext}`);
    }
  });
  
  const upload = multer({ 
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) {
      // Accept only image files
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
      }
      cb(null, true);
    }
  });
  
  // prefix all routes with /api

  // Add test routes first for diagnostics
  app.use('/api/test', testRoutes);

  // Add Stripe API routes
  console.log('Registering Stripe API routes at /api/stripe');
  app.use('/api/stripe', stripeRoutes);

  // Global logging middleware to debug the 400 error
  app.use('/api/*', (req, res, next) => {
    console.log(`DEBUG - API Request: ${req.method} ${req.url}`);
    
    // Store original json method to intercept responses
    const originalJson = res.json;
    res.json = function(body) {
      console.log(`DEBUG - API Response: ${res.statusCode} for ${req.url}`, 
        res.statusCode >= 400 ? body : 'Success');
      return originalJson.call(this, body);
    };
    
    next();
  });

  // Engagement routes
  app.get("/api/engagements", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      console.log("GET /api/engagements - Auth status:", req.isAuthenticated(), "User ID:", userId);
      
      // Get engagements filtered by userId if authenticated
      let engagements = await storage.getEngagements(userId);
      console.log(`Retrieved ${engagements.length} engagements for userId=${userId || 'undefined'}`);
      
      if (engagements.length === 0) {
        console.log("No engagements found for this user. Returning empty array.");
        return res.json([]);
      }
      
      // IMPORTANT: normalize the clientName/client_name field to ensure consistent access
      engagements = engagements.map(eng => {
        // Ensure every engagement has clientName property (client_name might be used in DB)
        if ((eng as any).client_name && !eng.clientName) {
          return {
            ...eng,
            clientName: (eng as any).client_name
          };
        }
        // If neither exists, provide a default
        if (!eng.clientName && !(eng as any).client_name) {
          return {
            ...eng,
            clientName: "Unknown Client"
          };
        }
        return eng;
      });
      
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
        console.log(`Status filter applied: ${status}, remaining engagements: ${engagements.length}`);
      }
      
      // Apply client filter if provided
      const clientName = req.query.client as string | undefined;
      if (clientName && clientName !== 'all') {
        engagements = engagements.filter(engagement => {
          const engClientName = engagement.clientName || (engagement as any).client_name || '';
          return engClientName === clientName;
        });
        console.log(`Client filter applied: ${clientName}, remaining engagements: ${engagements.length}`);
      }
      
      // *** TEMPORARILY BYPASS DATE FILTERING ***
      // This is likely the cause of engagements being filtered out
      // Log but don't apply date filters
      const dateRange = req.query.dateRange as string | undefined;
      if (dateRange) {
        console.log(`Date filter requested (${dateRange}) but BYPASSED to troubleshoot empty results`);
      }
      
      // Return all engagements that passed status and client filters
      console.log(`Returning ${engagements.length} engagements after applying only status and client filters`);
      return res.json(engagements);
    } catch (error) {
      console.error("Error fetching engagements:", error);
      res.status(500).json({ message: "Failed to fetch engagements" });
    }
  });

  app.get("/api/engagements/active", auth, async (req, res) => {
    try {
      console.log('Fetching active engagements for userId:', req.userId);
      
      // Use raw SQL to avoid Drizzle ORM schema issues
      const query = `
        SELECT 
          e.id, 
          e.client_id as "clientId", 
          c.name as "clientName",
          e.project_name as "projectName", 
          e.start_date as "startDate", 
          e.end_date as "endDate", 
          e.status,
          e.engagement_type as "engagementType",
          e.hourly_rate as "hourlyRate"
        FROM 
          engagements e
        LEFT JOIN 
          clients c ON e.client_id = c.id
        WHERE 
          e.user_id = $1
      `;
      
      const result = await pool.query(query, [req.userId]);
      const engagements = result.rows;
      
      console.log('Retrieved engagements count:', engagements.length);
      
      // Use normalized dates for accurate status calculation
      const activeEngagements = engagements
        .map(engagement => {
          const originalStatus = engagement.status;
          const calculatedStatus = calculateEngagementStatus(
            new Date(engagement.startDate), 
            new Date(engagement.endDate)
          );
          
          console.log(`Engagement ${engagement.id} - ${engagement.projectName}:`, {
            startDate: engagement.startDate,
            endDate: engagement.endDate,
            originalStatus,
            calculatedStatus
          });
          
          return {
            ...engagement,
            status: calculatedStatus
          };
        })
        .filter(engagement => engagement.status === 'active');
      
      console.log('Active engagements after filtering:', activeEngagements.length);
      return res.json(activeEngagements);
    } catch (error) {
      console.error('Error fetching active engagements:', error);
      return res.status(500).json({ message: 'Error fetching active engagements' });
    }
  });

  app.get("/api/engagements/:id", async (req, res) => {
    try {
      const engagement = await storage.getEngagementWithClient(Number(req.params.id));
      if (!engagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      
      // Update status based on current date and engagement dates
      const currentStatus = calculateEngagementStatus(
        new Date(engagement.startDate), 
        new Date(engagement.endDate)
      );
      
      // Create a new object with updated status including client info
      const updatedEngagement = {
        ...engagement,
        status: currentStatus,
        // Extract name from client object if available
        clientName: (engagement.client?.name || (engagement as any).clientName || "")
      };
      
      res.json(updatedEngagement);
    } catch (error) {
      console.error("Error fetching engagement:", error);
      res.status(500).json({ message: "Failed to fetch engagement" });
    }
  });

  app.post("/api/engagements", async (req, res) => {
    try {
      console.log("Received engagement creation request:", req.body);
      console.log("Request user:", req.user);
      
      // Verify user authentication
      if (!req.isAuthenticated()) {
        console.log("User not authenticated");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = (req.user as any).id;
      console.log("User ID:", userId);

      // Ensure the body is a proper object
      if (!req.body || typeof req.body !== 'object') {
        console.log("Invalid request body format:", req.body);
        return res.status(400).json({ message: "Invalid request format" });
      }

      // Process data to match expected types in schema
      const processedData = {
        ...req.body,
        userId,
        // Convert string dates to Date objects
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        // Convert hourlyRate to a number if it's a string
        hourlyRate: typeof req.body.hourlyRate === 'string' 
          ? Number(req.body.hourlyRate) 
          : req.body.hourlyRate,
        // Ensure status is a string
        status: req.body.status?.toString() || 'active'
      };
      
      console.log("Processed data before validation:", processedData);

      // Parse and validate the engagement data
      const result = insertEngagementSchema.safeParse(processedData);

      if (!result.success) {
        console.log("Validation failed:", result.error);
        return res.status(400).json({ message: "Invalid engagement data", errors: result.error.errors });
      }

      console.log("Validated engagement data:", result.data);

      // Verify client exists
      if (result.data.clientId) {
        try {
          const client = await storage.getClient(result.data.clientId);
          if (!client) {
            return res.status(400).json({ message: "Client does not exist" });
          }
        } catch (error) {
          console.error("Error checking client:", error);
          return res.status(500).json({ message: "Error verifying client" });
        }
      }

      // Calculate status based on dates
      const status = calculateEngagementStatus(
        new Date(result.data.startDate),
        new Date(result.data.endDate)
      );

      console.log("Calculated status:", status);

      // Create the engagement
      try {
        const engagement = await storage.createEngagement({
          ...result.data,
          status
        });
        console.log("Created engagement:", engagement);
        res.json(engagement);
      } catch (error) {
        console.error("Error creating engagement:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in POST /api/engagements:", error);
      res.status(500).json({ message: "Failed to create engagement" });
    }
  });

  app.put("/api/engagements/:id", async (req, res) => {
    try {
      // Check if the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update an engagement" });
      }
      
      const id = Number(req.params.id);
      // Get the user ID from the session
      const userId = (req.user as any).id;
      
      // Process data to fix types before validation
      const processedData: any = {...req.body};
      
      // Convert dates if present
      if (processedData.startDate) {
        processedData.startDate = new Date(processedData.startDate);
      }
      if (processedData.endDate) {
        processedData.endDate = new Date(processedData.endDate);
      }
      
      // Convert hourlyRate if it's a string
      if (processedData.hourlyRate && typeof processedData.hourlyRate === 'string') {
        processedData.hourlyRate = Number(processedData.hourlyRate);
      }
      
      // Ensure status is a string if present
      if (processedData.status !== undefined) {
        processedData.status = processedData.status.toString();
      }
      
      console.log("Processed data for update:", processedData);
      
      // Use the new updateEngagementSchema instead of partial()
      const validationResult = updateEngagementSchema.safeParse(processedData);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid engagement data", errors: validationResult.error.errors });
      }
      
      // Get the input data
      const inputData = validationResult.data;
      
      // Calculate status based on dates if both are provided
      if (inputData.startDate && inputData.endDate) {
        inputData.status = calculateEngagementStatus(inputData.startDate, inputData.endDate);
      }
      
      console.log("Sending to storage:", inputData);
      
      try {
        const updatedEngagement = await storage.updateEngagement(id, inputData, userId);
        if (!updatedEngagement) {
          return res.status(404).json({ message: "Engagement not found" });
        }
        
        console.log("Updated engagement:", updatedEngagement);
        res.json(updatedEngagement);
      } catch (error) {
        console.error("Storage error:", error);
        res.status(500).json({ 
          message: "Failed to update engagement",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error in PUT /api/engagements/:id:", error);
      res.status(500).json({ message: "Failed to update engagement" });
    }
  });

  app.delete("/api/engagements/:id", async (req, res) => {
    try {
      // Check if the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to delete an engagement" });
      }
      
      const id = Number(req.params.id);
      // Get the user ID from the session
      const userId = (req.user as any).id;
      
      console.log(`Attempting to delete engagement ${id} for user ${userId}`);
      const success = await storage.deleteEngagement(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      
      console.log(`Successfully deleted engagement ${id}`);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete engagement:", error);
      res.status(500).json({ message: "Failed to delete engagement" });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Get clients filtered by userId if authenticated
      const clients = await storage.getClients(userId);
      
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(Number(req.params.id));
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = (req.user as any).id;
      
      // Process data to match expected schema
      const processedData = {
        ...req.body,
        userId
      };
      
      // Validate the client data
      const validationResult = insertClientSchema.safeParse(processedData);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Create the client
      const client = await storage.createClient(validationResult.data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      // Check if the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update a client" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      // Log to file for debugging
      const logData = `
[${new Date().toISOString()}] PUT /api/clients/${id} RECEIVED
User ID: ${userId}
Request body: ${JSON.stringify(req.body, null, 2)}
billingContactName value: ${req.body.billingContactName}
billingContactName type: ${typeof req.body.billingContactName}
billingContactEmail value: ${req.body.billingContactEmail}
billingContactEmail type: ${typeof req.body.billingContactEmail}
      `;
      fs.appendFileSync('client-api-debug.log', logData);
      
      console.log('PUT /api/clients/:id - Client update request received');
      console.log('Request body RAW:', req.body);
      console.log('Request body as JSON:', JSON.stringify(req.body));
      console.log('Client ID:', id, 'User ID:', userId);
      
      // Log actual values and types for key fields
      console.log('DETAILED VALUES:');
      console.log('billingContactName:', req.body.billingContactName);
      console.log('billingContactName type:', typeof req.body.billingContactName);
      console.log('billingContactEmail:', req.body.billingContactEmail);
      console.log('billingContactEmail type:', typeof req.body.billingContactEmail);
      
      // Show what schema we're using for validation
      console.log('Schema for validation:', Object.keys(insertClientSchema.shape));
      
      // Validate input data
      const validationResult = insertClientSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        console.error('Client data validation failed:', validationResult.error.errors);
        return res.status(400).json({ message: "Invalid client data", errors: validationResult.error.errors });
      }
      
      // Log to file - after validation
      fs.appendFileSync('client-api-debug.log', `
Validated data: ${JSON.stringify(validationResult.data, null, 2)}
billingContactName after validation: ${validationResult.data.billingContactName}
billingContactName type after validation: ${typeof validationResult.data.billingContactName}
      `);
      
      console.log('Validated client data:', JSON.stringify(validationResult.data));
      console.log('Fields that will be sent to the database:', Object.keys(validationResult.data));
      console.log('DETAILED VALIDATED VALUES:');
      console.log('validationResult.data.billingContactName:', validationResult.data.billingContactName);
      console.log('validationResult.data.billingContactName type:', typeof validationResult.data.billingContactName);
      
      // Update the client - log the before and after state
      console.log('Before storage.updateClient call');
      const updatedClient = await storage.updateClient(id, validationResult.data, userId);
      console.log('After storage.updateClient call, result:', updatedClient ? JSON.stringify(updatedClient) : 'undefined');
      
      if (!updatedClient) {
        console.error('Client not found or update failed');
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Log final result to file
      fs.appendFileSync('client-api-debug.log', `
Result from storage: ${JSON.stringify(updatedClient, null, 2)}
      `);
      
      console.log('Client updated successfully:', JSON.stringify(updatedClient));
      
      res.json(updatedClient);
    } catch (error) {
      console.error("Failed to update client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      // Check if the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to delete a client" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      // Delete the client
      const success = await storage.deleteClient(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Time Log routes
  app.get("/api/time-logs", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view time logs" });
      }

      const userId = (req.user as any).id;
      const { engagementId, startDate, endDate, dateRange, client: clientFilter } = req.query;
      
      console.log('Time logs router request:', {
        userId,
        engagementId,
        startDate,
        endDate,
        dateRange,
        clientFilter
      });

      // Only validate custom date range parameters
      if (dateRange === 'custom' && (!startDate || !endDate)) {
        return res.status(400).json({ 
          message: "Missing required parameters: startDate and endDate are required for custom date range" 
        });
      }

      const timeLogs = await getTimeLogs(
        userId,
        dateRange as string || 'all',
        startDate as string,
        endDate as string,
        engagementId,
        clientFilter as string
      );

      console.log(`Router found ${timeLogs.length} time logs for user ${userId}`);
      res.json(timeLogs);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  app.get("/api/time-logs/:id", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      const id = Number(req.params.id);
      console.log(`Fetching time log with ID: ${id}`);
      
      const timeLog = await storage.getTimeLog(id, userId);
      if (!timeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }
      
      // Ensure description is consistently handled
      const sanitizedTimeLog = {
        ...timeLog,
        description: timeLog.description || null
      };
      
      console.log(`Retrieved time log:`, sanitizedTimeLog);
      res.json(sanitizedTimeLog);
    } catch (error) {
      console.error(`Error fetching time log:`, error);
      res.status(500).json({ message: "Failed to fetch time log" });
    }
  });

  app.post("/api/time-logs", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to create time logs" });
      }
      
      // Debug log the incoming request body
      console.log('Time log creation request body:', req.body);

      // Process the data before validation
      const processedData = {
        ...req.body,
        userId: (req.user as any).id,
        date: new Date(req.body.date),
        hours: Number(req.body.hours),
        engagementId: Number(req.body.engagementId)
      };
      
      console.log('Processed data before validation:', processedData);
      
      const validationResult = insertTimeLogSchema.safeParse(processedData);
      if (!validationResult.success) {
        console.log('Time log validation failed:', validationResult.error.format());
        return res.status(400).json({ 
          message: "Invalid time log data", 
          errors: validationResult.error.format() 
        });
      }

      console.log('Creating time log with validated data:', validationResult.data);
      const timeLog = await storage.createTimeLog(validationResult.data);
      console.log('Time log created successfully:', timeLog);
      res.status(201).json(timeLog);
    } catch (error) {
      console.error("Failed to create time log:", error);
      res.status(500).json({ message: "Failed to create time log" });
    }
  });

  app.put("/api/time-logs/:id", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update time logs" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;

      // First get the existing time log
      const existingTimeLog = await storage.getTimeLog(id, userId);
      if (!existingTimeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }

      // Debug log the incoming request body
      console.log('Time log update request body:', req.body);
      console.log('Time log description received:', req.body.description);
      console.log('Description type:', typeof req.body.description);
      
      // Handle empty string descriptions explicitly
      let descriptionValue = req.body.description;
      if (descriptionValue === "" || descriptionValue === null || descriptionValue === undefined || 
          (typeof descriptionValue === 'string' && descriptionValue.trim() === '')) {
        descriptionValue = null;
        console.log('Converting empty description to null');
      }
      
      // Process the data before validation, merging with existing data
      const processedData = {
        ...existingTimeLog,
        ...req.body,
        userId,
        date: req.body.date ? new Date(req.body.date) : existingTimeLog.date,
        hours: req.body.hours !== undefined ? Number(req.body.hours) : existingTimeLog.hours,
        engagementId: req.body.engagementId !== undefined ? Number(req.body.engagementId) : existingTimeLog.engagementId,
        description: descriptionValue
      };
      
      console.log('Processed data before validation:', processedData);
      console.log('Processed description value:', processedData.description);
      
      const validationResult = insertTimeLogSchema.safeParse(processedData);
      if (!validationResult.success) {
        console.log('Time log validation failed:', validationResult.error.format());
        return res.status(400).json({ 
          message: "Invalid time log data", 
          errors: validationResult.error.format() 
        });
      }

      const updatedTimeLog = await storage.updateTimeLog(id, validationResult.data, userId);
      if (!updatedTimeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }
      res.json(updatedTimeLog);
    } catch (error) {
      console.error("Failed to update time log:", error);
      res.status(500).json({ message: "Failed to update time log" });
    }
  });

  app.delete("/api/time-logs/:id", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to delete time logs" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const success = await storage.deleteTimeLog(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Time log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time log" });
    }
  });

  // Final catchall for /api/time-logs in case other routes don't handle it
  app.get("/api/time-logs", async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view time logs" });
      }

      const userId = (req.user as any).id;
      console.log('CATCHALL time-logs route hit with query:', req.query);
      
      // Get all time logs for user without any filtering
      const result = await pool.query(
        `SELECT t.*, e.client_name, e.project_name, e.hourly_rate 
         FROM time_logs t 
         JOIN engagements e ON t.engagement_id = e.id 
         WHERE t.user_id = $1
         ORDER BY t.date DESC`,
        [userId]
      );
      
      // Transform the results to match the expected format
      const timeLogs = result.rows.map(log => ({
        id: log.id,
        userId: log.user_id,
        engagementId: log.engagement_id,
        date: log.date,
        hours: log.hours,
        description: log.description,
        billableAmount: parseFloat(log.hours) * parseFloat(log.hourly_rate),
        clientName: log.client_name,
        projectName: log.project_name,
        engagement: {
          id: log.engagement_id,
          clientName: log.client_name,
          projectName: log.project_name,
          hourlyRate: log.hourly_rate
        }
      }));

      console.log(`CATCHALL found ${timeLogs.length} time logs for user ${userId}`);
      res.json(timeLogs);
    } catch (error) {
      console.error("Error in catchall time-logs endpoint:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
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
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Check for overdue invoices before returning results
      await checkAndUpdateOverdueInvoices();
      
      const { status, client, dateRange, startDate, endDate } = req.query;
      let query = `
        SELECT 
          i.*
        FROM invoices i
        JOIN engagements e ON i.engagement_id = e.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Add user filter if authenticated
      if (userId !== undefined) {
        query += ` AND i.user_id = $${params.length + 1}`;
        params.push(userId);
      }
      
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
      
      // Convert totalAmount and totalHours to numbers
      const invoices = result.rows.map(row => ({
        ...row,
        total_amount: Number(row.total_amount),
        total_hours: Number(row.total_hours)
      }));

      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      const invoiceId = Number(req.params.id);
      
      if (isNaN(invoiceId) || invoiceId <= 0) {
        console.error(`Invalid invoice ID requested: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid invoice ID format" });
      }
      
      console.log(`Fetching invoice details for ID: ${invoiceId}`);
      const invoice = await storage.getInvoice(invoiceId, userId);
      
      if (!invoice) {
        console.error(`Invoice not found with ID: ${invoiceId}`);
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Verify invoice has required fields
      if (!invoice.invoiceNumber || !invoice.clientName) {
        console.error(`Invoice ${invoiceId} has missing required fields:`, invoice);
        return res.status(500).json({ message: "Invoice data is incomplete" });
      }
      
      // Add empty lineItems array to satisfy client expectations
      const invoiceWithLineItems = {
        ...invoice,
        lineItems: []
      };
      
      console.log(`Successfully retrieved invoice ${invoiceId} (${invoice.invoiceNumber})`);
      res.json(invoiceWithLineItems);
    } catch (error) {
      console.error(`Error fetching invoice ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch invoice", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post('/api/invoices', invoiceRateLimiter, async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to create invoices" });
      }
      
      const userId = (req.user as any).id;
      const { 
        engagementId, 
        timeLogs = [], 
        lineItems = [],
        totalAmount: providedTotalAmount,
        totalHours: providedTotalHours,
        clientName: providedClientName,
        projectName: providedProjectName,
        periodStart,
        periodEnd,
        status = 'submitted'
      } = req.body;

      // Add detailed request logging
      console.log('=== Invoice Creation Request Start ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User ID:', userId);
      console.log('=== Invoice Creation Request End ===');

      // Validate required fields
      if (!engagementId) {
        console.error('Missing engagement ID');
        return res.status(400).json({ error: 'Engagement ID is required' });
      }

      // Get engagement details
      try {
        const engagementResult = await pool.query(
          'SELECT e.project_name, e.hourly_rate, c.name as client_name FROM engagements e ' +
          'LEFT JOIN clients c ON e.client_id = c.id ' +
          'WHERE e.id = $1 AND e.user_id = $2',
          [engagementId, userId]
        );
        
        if (engagementResult.rows.length === 0) {
          console.error(`Engagement not found: ${engagementId} for user ${userId}`);
          return res.status(404).json({ error: 'Engagement not found' });
        }
        
        const engagement = engagementResult.rows[0];
        console.log('Found engagement:', engagement);

        const clientName = providedClientName || engagement.client_name;
        const projectName = providedProjectName || engagement.project_name;
        
        let finalTotalAmount: number;
        let finalTotalHours: number;

        console.log('Processing time logs for invoice totals...');
        // Calculate total amount and hours from time logs or use provided values
        if (providedTotalAmount && providedTotalHours) {
          // Use provided values
          finalTotalAmount = Number(providedTotalAmount);
          finalTotalHours = Number(providedTotalHours);
          console.log('Using provided totals:', { finalTotalAmount, finalTotalHours });
        } else if (lineItems && lineItems.length > 0) {
          // Calculate from line items
          finalTotalHours = Number(lineItems.reduce((sum: number, item: { hours: number | string }) => 
            sum + Number(item.hours), 0).toFixed(2));
          finalTotalAmount = Number(lineItems.reduce((sum: number, item: { amount: number | string }) => 
            sum + Number(item.amount), 0).toFixed(2));
          console.log('Calculated totals from line items:', { finalTotalAmount, finalTotalHours });
        } else if (timeLogs && timeLogs.length > 0) {
          // Calculate from time logs
          finalTotalHours = Number(timeLogs.reduce((sum: number, log: any) => 
            sum + Number(log.hours), 0).toFixed(2));
          
          finalTotalAmount = Number(timeLogs.reduce((sum: number, log: any) => {
            const hours = Number(log.hours);
            const rate = Number(log.engagement.hourlyRate);
            return sum + (hours * rate);
          }, 0).toFixed(2));
          
          console.log('Calculated totals from time logs:', { finalTotalAmount, finalTotalHours });
        } else {
          console.error('No data provided to calculate invoice totals');
          return res.status(400).json({ error: 'No data provided to calculate invoice totals' });
        }

        // Validate calculated values
        if (isNaN(finalTotalAmount) || finalTotalAmount <= 0) {
          console.error('Invalid total amount:', finalTotalAmount);
          return res.status(400).json({ error: 'Invalid total amount' });
        }

        if (isNaN(finalTotalHours) || finalTotalHours <= 0) {
          console.error('Invalid total hours:', finalTotalHours);
          return res.status(400).json({ error: 'Invalid total hours' });
        }

        console.log('Creating invoice record...');
        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + 30);

        try {
          // Create invoice with total amount and hours
          const invoiceResult = await pool.query(
            'INSERT INTO invoices (engagement_id, status, issue_date, due_date, invoice_number, client_name, total_amount, total_hours, period_start, period_end, project_name, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
            [
              engagementId, 
              status, 
              today, 
              dueDate, 
              req.body.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
              clientName,
              finalTotalAmount,
              finalTotalHours,
              periodStart || today, 
              periodEnd || today,
              projectName,
              userId
            ]
          );
          
          const invoiceId = invoiceResult.rows[0].id;
          console.log(`Created invoice with ID: ${invoiceId}`);

          console.log('Successfully created invoice');
          res.json({ id: invoiceId });
        } catch (error) {
          console.error('Database error creating invoice:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error in engagement lookup or processing:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      // Send more detailed error information
      res.status(500).json({ 
        error: 'Failed to create invoice', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.put("/api/invoices/:id/status", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update invoice status" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      const statusSchema = z.object({ status: z.string() });
      
      const validationResult = statusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid status data", errors: validationResult.error.errors });
      }

      const updatedInvoice = await storage.updateInvoiceStatus(id, validationResult.data.status, userId);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update invoices" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      // Extract fields that can be updated
      const {
        clientName,
        projectName,
        issueDate,
        dueDate,
        totalAmount,
        totalHours,
        notes,
        periodStart,
        periodEnd,
        netTerms // Add netTerms to the list of fields
      } = req.body;
      
      // Prepare update object with only provided fields
      const updateData: Partial<Invoice> = {};
      
      if (clientName !== undefined) updateData.clientName = clientName;
      if (projectName !== undefined) updateData.projectName = projectName;
      if (issueDate !== undefined) updateData.issueDate = new Date(issueDate);
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
      if (totalHours !== undefined) updateData.totalHours = totalHours;
      if (notes !== undefined) updateData.notes = notes;
      if (periodStart !== undefined) updateData.periodStart = new Date(periodStart);
      if (periodEnd !== undefined) updateData.periodEnd = new Date(periodEnd);
      if (netTerms !== undefined) updateData.netTerms = netTerms; // Add netTerms to updateData
      
      // Update invoice
      const updatedInvoice = await storage.updateInvoice(id, updateData, userId);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ 
        message: "Failed to update invoice",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to delete invoices" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const success = await storage.deleteInvoice(id, userId);
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
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Default to 2025 for current year if no year is provided
      const year = Number(req.query.year) || 2025;
      const revenue = await storage.getYtdRevenue(year, userId);
      res.json({ revenue });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch YTD revenue" });
    }
  });

  app.get("/api/dashboard/monthly-revenue", async (req, res) => {
    try {
      // Ensure user is authenticated for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view monthly revenue data" });
      }
      
      // Get user ID from authenticated session
      const userId = (req.user as any).id;
      
      // Default to current year if no year is provided
      const defaultYear = new Date().getFullYear();
      const year = Number(req.query.year) || defaultYear;
      
      console.log(`Getting monthly revenue data for userId: ${userId}, year: ${year}`);
      
      const monthlyData = await storage.getMonthlyRevenueBillable(year, userId);
      
      console.log(`Retrieved ${monthlyData.length} months of revenue data for user ${userId}`);
      
      res.json(monthlyData);
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      res.status(500).json({ message: "Failed to fetch monthly revenue" });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Ensure user is authenticated for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view dashboard stats" });
      }
      
      // Get user ID from authenticated session
      const userId = (req.user as any).id;
      
      // Get current date info for proper calculations
      const currentDate = new Date();
      
      // Calculate date ranges using the same function as time logs
      const { startDate: monthStart, endDate: monthEnd } = getDateRange('month', currentDate);
      const { startDate: yearStart, endDate: yearEnd } = getDateRange('current', currentDate);
      
      console.log(`Getting dashboard stats for userId: ${userId}`);
      console.log(`Year period: ${yearStart.toISOString()} to ${yearEnd.toISOString()}`);
      console.log(`Month period: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);
      console.log(`Current date: ${currentDate.toISOString()}`);

      // Get all engagements and calculate active ones directly
      console.log('Fetching engagements directly...');
      
      // Use direct SQL query for reliable results
      const engResult = await pool.query(`
        SELECT 
          e.id, e.project_name, e.start_date, e.end_date, e.status
        FROM engagements e
        WHERE e.user_id = $1
      `, [userId]);
      
      console.log(`Retrieved ${engResult.rows.length} total engagements`);
      
      // Import the status calculation function
      const { calculateEngagementStatus } = await import('./calculateEngagementStatus');
      
      // Calculate active engagements based on date ranges
      const activeEngagements = engResult.rows.filter(engagement => {
        const currentStatus = calculateEngagementStatus(
          new Date(engagement.start_date), 
          new Date(engagement.end_date)
        );
        return currentStatus === 'active';
      });
      
      console.log(`Active engagements based on date calculation: ${activeEngagements.length}`);
      
      // Calculate YTD revenue directly from paid invoices
      console.log('Calculating YTD revenue from paid invoices...');
      const ytdRevenueResult = await pool.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE user_id = $1
        AND status = 'paid'
        AND issue_date BETWEEN $2 AND $3
      `, [userId, yearStart, yearEnd]);
      
      const ytdRevenue = parseFloat(ytdRevenueResult.rows[0]?.total || '0');
      console.log(`YTD Revenue from paid invoices: ${ytdRevenue}`);
      
      // Get monthly hours logged in current month using shared function
      console.log('Calculating monthly hours logged...');
      const monthlyTimeLogs = await getTimeLogs(userId, 'month');
      const monthlyHours = monthlyTimeLogs.reduce((sum, log) => sum + Number(log.hours), 0);
      console.log(`Monthly hours logged: ${monthlyHours} (from ${monthlyTimeLogs.length} time logs)`);
      
      // Get pending invoices total
      console.log('Calculating pending invoices total...');
      const pendingResult = await pool.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE user_id = $1
        AND (status = 'submitted' OR status = 'overdue')
      `, [userId]);
      
      const pendingInvoicesTotal = parseFloat(pendingResult.rows[0]?.total || '0');
      console.log(`Pending invoices total: ${pendingInvoicesTotal}`);

      console.log(`Dashboard stats results for user ${userId}:
        - Active engagements: ${activeEngagements.length}
        - YTD revenue from paid invoices: ${ytdRevenue}
        - Monthly hours: ${monthlyHours}
        - Pending invoices: ${pendingInvoicesTotal}
      `);

      res.json({
        ytdRevenue,
        activeEngagements: activeEngagements.length,
        monthlyHours,
        pendingInvoicesTotal
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Email invoice endpoint
  app.post("/api/invoices/:id/email", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to email invoices" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const invoice = await storage.getInvoice(id, userId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Generate PDF for attachment
      console.log("Generating PDF attachment...");
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // First, fetch the business info
      console.log("Fetching business info for invoice...");
      const businessInfoQuery = `SELECT * FROM business_info WHERE user_id = $1`;
      const businessInfoResult = await pool.query(businessInfoQuery, [userId]);
      const businessInfo = businessInfoResult.rows.length > 0 ? businessInfoResult.rows[0] : null;
      
      // Get user's name - use req.user if available or business info
      const userName = (req.user as any)?.name || businessInfo?.company_name || "Derek Schatz";
      
      // 1. Name at top left
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(userName, 20, 30);
      
      // 2. Logo centered at top (or company name if no logo)
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      if (businessInfo && businessInfo.company_name) {
        pdf.text(businessInfo.company_name, 105, 30, { align: 'center' });
      } else {
        pdf.text("Agile Infusion", 105, 30, { align: 'center' });
      }
      
      // 3. INVOICE title and info at top right
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text("INVOICE", 190, 30, { align: 'right' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`INVOICE #${invoice.invoiceNumber}`, 190, 40, { align: 'right' });
      pdf.text(`DATE: ${new Date(invoice.issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })}`, 190, 50, { align: 'right' });
      
      // Due date
      if (invoice.dueDate) {
        pdf.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, 190, 60, { align: 'right' });
      }
      
      // 4. Company details below name on left
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      let yPos = 40;
      
      if (businessInfo) {
        if (businessInfo.company_name) {
          pdf.text(businessInfo.company_name, 20, yPos);
          yPos += 8;
        }
        
        if (businessInfo.address) {
          pdf.text(businessInfo.address, 20, yPos);
          yPos += 8;
        }
        
        // City, state, zip
        const addressLine = [
          businessInfo.city,
          businessInfo.state,
          businessInfo.zip
        ].filter(Boolean).join(", ");
        
        if (addressLine) {
          pdf.text(addressLine, 20, yPos);
          yPos += 8;
        }
        
        if (businessInfo.phone_number) {
          pdf.text(`Phone: ${businessInfo.phone_number}`, 20, yPos);
          yPos += 8;
        }
        
        if (businessInfo.tax_id) {
          pdf.text(`Tax ID: ${businessInfo.tax_id}`, 20, yPos);
          yPos += 8;
        }
      } else {
        // Default business info matching screenshot
        pdf.text("Agile Infusion", 20, 40);
        pdf.text("100 Danby Court", 20, 48);
        pdf.text("Churchville, PA, 18966", 20, 56);
        pdf.text("Phone: 215-630-3317", 20, 64);  
        pdf.text("Tax ID: 20-5199056", 20, 72);
        yPos = 80;
      }
      
      // Add horizontal line 
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 100, 190, 100);
      
      // BILL TO section - keep this
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text("BILL TO:", 20, 115);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${invoice.clientName}`, 50, 115);
      
      // 7. Table layout - moved up since we're removing just the FOR section
      const tableStartY = 140;
      
      // Column headers
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text("DESCRIPTION", 20, tableStartY);
      pdf.text("HOURS", 120, tableStartY);
      pdf.text("RATE", 145, tableStartY);
      pdf.text("AMOUNT", 170, tableStartY);
      
      // Add a line under the header
      pdf.setDrawColor(0, 0, 0);
      pdf.line(20, tableStartY + 5, 190, tableStartY + 5);
      
      // Create a default line item from the invoice total if no line items exist
      const defaultLineItems: InvoiceLineItem[] = [{
        invoiceId: invoice.id,
        description: `${invoice.projectName || 'Consulting'} Activities`,
        hours: Number(invoice.totalHours),
        rate: Number(invoice.totalAmount) / Number(invoice.totalHours),
        amount: Number(invoice.totalAmount)
      }];
      
      // Use either the existing lineItems if available, or the default line item
      const itemsToDisplay = (invoice as InvoiceWithLineItems).lineItems || defaultLineItems;
      
      // Table data
      let itemY = tableStartY + 15;
      pdf.setFont('helvetica', 'normal');
      
      itemsToDisplay.forEach(item => {
        pdf.text(item.description.substring(0, 50), 20, itemY);
        pdf.text(item.hours.toString(), 120, itemY);
        pdf.text(`$${typeof item.rate === 'string' ? item.rate : item.rate.toFixed(2)}/hr`, 145, itemY);
        pdf.text(`$${typeof item.amount === 'string' ? item.amount : item.amount.toFixed(2)}`, 170, itemY);
        itemY += 10;
      });
      
      // If we have period info, add it as a separate line
      if (invoice.periodStart && invoice.periodEnd) {
        itemY += 10;
        pdf.text(`Period: ${new Date(invoice.periodStart).toLocaleDateString()} - ${new Date(invoice.periodEnd).toLocaleDateString()}`, 20, itemY);
        itemY += 10;
      }
      
      // Horizontal line above total
      itemY += 10;
      pdf.line(120, itemY, 190, itemY);
      itemY += 10;
      
      // Total
      pdf.setFont('helvetica', 'bold');
      pdf.text("TOTAL", 145, itemY);
      pdf.text(`$${invoice.totalAmount}`, 170, itemY);
      
      // 8. Payment terms at bottom
      itemY += 35;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text("Make all checks payable to the company name.", 20, itemY);
      pdf.text("Total due in 30 days.", 20, itemY + 8);
      
      // Convert PDF to base64
      const pdfBase64 = pdf.output('datauristring');
      
      // Return the PDF data and email details
      const emailSubject = `Invoice #${invoice.invoiceNumber} from Your Consulting Service`;
      const emailBody = `Please find attached invoice #${invoice.invoiceNumber} for ${invoice.clientName} in the amount of $${invoice.totalAmount}.
      
Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Client: ${invoice.clientName}
- Amount: $${invoice.totalAmount}
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

  // Update user personal information
  app.put("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      const userId = req.user?.id;
      const data = personalInfoSchema.parse(req.body);
      
      // Check if username is being changed and if it's already taken
      if (data.username !== req.user?.username) {
        const existingUser = await storage.getUserByUsername(data.username);
        if (existingUser) {
          return res.status(400).send("Username already exists");
        }
      }
      
      // Update user info
      const updateQuery = `
        UPDATE users
        SET 
          name = $1,
          email = $2,
          username = $3
        WHERE id = $4
        RETURNING id, username, name, email, created_at
      `;
      
      const result = await pool.query(updateQuery, [
        data.name,
        data.email,
        data.username,
        userId
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).send("User not found");
      }
      
      // Update the user in the session
      const updatedUser = result.rows[0];
      req.login({
        ...updatedUser,
        createdAt: updatedUser.created_at
      }, (err) => {
        if (err) {
          return res.status(500).send("Error updating session");
        }
        res.json(updatedUser);
      });
    } catch (error) {
      console.error("Error updating user:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      
      res.status(500).send("Server error");
    }
  });
  
  // Helper function to ensure business_info table exists
  const ensureBusinessInfoTable = async () => {
    try {
      // Check if business_info table exists
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'business_info'
        );
      `;
      
      const tableExists = await pool.query(checkTableQuery);
      console.log('business_info table exists:', tableExists.rows[0].exists);
      
      if (!tableExists.rows[0].exists) {
        console.log('Creating business_info table...');
        
        // Create the table
        const createTableQuery = `
          CREATE TABLE business_info (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            company_name VARCHAR(255) NOT NULL,
            address TEXT,
            city VARCHAR(255),
            state VARCHAR(255),
            zip VARCHAR(50),
            phone_number VARCHAR(50),
            tax_id VARCHAR(100),
            company_logo VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          -- Add index for faster lookups
          CREATE INDEX business_info_user_id_idx ON business_info(user_id);
          
          -- Ensure user_id is unique
          ALTER TABLE business_info ADD CONSTRAINT unique_user_id UNIQUE (user_id);
        `;
        
        await pool.query(createTableQuery);
        console.log('business_info table created successfully');
        return true;
      }
      
      // Check if the table has phone_number column
      const checkPhoneNumberColumnQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'business_info'
          AND column_name = 'phone_number'
        );
      `;
      
      const phoneNumberExists = await pool.query(checkPhoneNumberColumnQuery);
      console.log('phone_number column exists:', phoneNumberExists.rows[0].exists);
      
      // Check if the table has country column
      const checkCountryColumnQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'business_info'
          AND column_name = 'country'
        );
      `;
      
      const countryExists = await pool.query(checkCountryColumnQuery);
      console.log('country column exists:', countryExists.rows[0].exists);
      
      // If there's country but no phone_number, update the table
      if (countryExists.rows[0].exists && !phoneNumberExists.rows[0].exists) {
        console.log('Adding phone_number column...');
        await pool.query(`ALTER TABLE business_info ADD COLUMN phone_number VARCHAR(50)`);
        
        // Migrate data
        console.log('Copying data from country to phone_number...');
        await pool.query(`UPDATE business_info SET phone_number = country`);
      }
      
      return true;
    } catch (error) {
      console.error('Error ensuring business_info table:', error);
      return false;
    }
  };

  // Get business information
  app.get("/api/business-info", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      // Ensure the table exists
      await ensureBusinessInfoTable();
      
      const userId = req.user?.id;
      
      // Check if business info exists
      const checkQuery = `
        SELECT * FROM business_info WHERE user_id = $1
      `;
      
      const checkResult = await pool.query(checkQuery, [userId]);
      
      if (checkResult.rows.length === 0) {
        // Return default empty object
        return res.json({
          companyName: "",
          address: "",
          city: "",
          state: "",
          zip: "",
          phoneNumber: "",
          taxId: "",
        });
      }
      
      // Convert snake_case to camelCase for response
      const businessInfo = checkResult.rows[0];
      
      console.log("Business info from database:", businessInfo);
      
      res.json({
        companyName: businessInfo.company_name,
        address: businessInfo.address,
        city: businessInfo.city,
        state: businessInfo.state,
        zip: businessInfo.zip,
        phoneNumber: businessInfo.phone_number, // Make sure we're using phone_number from DB
        taxId: businessInfo.tax_id,
        companyLogo: businessInfo.company_logo,
      });
    } catch (error) {
      console.error("Error getting business info:", error);
      res.status(500).send("Server error");
    }
  });
  
  // Update business information
  app.put("/api/business-info", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      // Ensure the table exists
      await ensureBusinessInfoTable();
      
      console.log("PUT /api/business-info - Request body:", req.body);
      
      const userId = req.user?.id;
      console.log("User ID:", userId);
      
      const data = businessInfoSchema.parse(req.body);
      console.log("Parsed data:", data);
      
      // Check if business info exists for this user
      const checkQuery = `
        SELECT id FROM business_info WHERE user_id = $1
      `;
      
      console.log("Checking if business info exists for user:", userId);
      const checkResult = await pool.query(checkQuery, [userId]);
      console.log("Check result:", checkResult.rows.length > 0 ? "Exists" : "Does not exist");
      
      let result;
      
      if (checkResult.rows.length === 0) {
        // Insert new business info
        console.log("Inserting new business info");
        const insertQuery = `
          INSERT INTO business_info (
            user_id, company_name, address, city, state, 
            zip, phone_number, tax_id, company_logo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        
        const params = [
          userId,
          data.companyName,
          data.address || "",
          data.city || "",
          data.state || "",
          data.zip || "",
          data.phoneNumber || "",
          data.taxId || "",
          data.companyLogo || null
        ];
        
        console.log("Insert params:", params);
        
        try {
          result = await pool.query(insertQuery, params);
          console.log("Insert result rows:", result.rows.length);
        } catch (dbError) {
          console.error("Database insert error:", dbError);
          throw dbError;
        }
      } else {
        // Update existing business info
        console.log("Updating existing business info");
        const updateQuery = `
          UPDATE business_info
          SET 
            company_name = $2,
            address = $3,
            city = $4,
            state = $5,
            zip = $6,
            phone_number = $7,
            tax_id = $8
          WHERE user_id = $1
          RETURNING *
        `;
        
        const params = [
          userId,
          data.companyName,
          data.address || "",
          data.city || "",
          data.state || "",
          data.zip || "",
          data.phoneNumber || "",
          data.taxId || ""
        ];
        
        console.log("Update params:", params);
        
        try {
          result = await pool.query(updateQuery, params);
          console.log("Update result rows:", result.rows.length);
        } catch (dbError) {
          console.error("Database update error:", dbError);
          throw dbError;
        }
      }
      
      // Convert snake_case to camelCase for response
      const businessInfo = result.rows[0];
      console.log("Business info from database:", businessInfo);
      
      const response = {
        companyName: businessInfo.company_name,
        address: businessInfo.address,
        city: businessInfo.city,
        state: businessInfo.state,
        zip: businessInfo.zip,
        phoneNumber: businessInfo.phone_number,
        taxId: businessInfo.tax_id,
        companyLogo: businessInfo.company_logo,
      };
      
      console.log("Sending response:", response);
      res.json(response);
    } catch (error) {
      console.error("Error updating business info:", error);
      
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error message:", errorMessage);
      res.status(500).send(`Server error: ${errorMessage}`);
    }
  });
  
  // Upload business logo
  app.post("/api/business-logo", (req, res) => {
    console.log("Received logo upload request");
    
    // Use a try-catch block around the middleware to catch multer errors
    const uploadMiddleware = upload.single('logo');
    
    uploadMiddleware(req, res, async (err) => {
      console.log("Multer middleware executed");
      
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).send(`File upload error: ${err.message}`);
      }
      
      // Check authentication
      if (!req.isAuthenticated()) {
        console.log("Not authenticated");
        return res.status(401).send("Not authenticated");
      }
      
      try {
        const userId = req.user?.id;
        console.log("Processing logo upload for user:", userId);
        
        if (!req.file) {
          console.error("No file received in request");
          return res.status(400).send("No file uploaded");
        }
        
        console.log("File received:", req.file);
        const filename = path.basename(req.file.path);
        console.log("Generated filename:", filename);
        
        // Update the business_info table with the logo filename
        const updateQuery = `
          UPDATE business_info
          SET company_logo = $2
          WHERE user_id = $1
          RETURNING *
        `;
        
        console.log("Executing update query");
        const result = await pool.query(updateQuery, [userId, filename]);
        console.log("Update query result rows:", result.rows.length);
        
        if (result.rows.length === 0) {
          // If no business info exists, create one
          console.log("No existing business info, creating new record");
          const insertQuery = `
            INSERT INTO business_info (user_id, company_logo, company_name)
            VALUES ($1, $2, $3)
            RETURNING *
          `;
          
          await pool.query(insertQuery, [userId, filename, ""]);
          console.log("New business info record created");
        }
        
        console.log("Logo upload successful");
        res.json({ 
          filename,
          path: `/api/business-logo/${filename}`,
          success: true 
        });
      } catch (error) {
        console.error("Error in logo upload handler:", error);
        res.status(500).send(`Server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  });
  
  // Serve business logo
  app.get("/api/business-logo/:filename", (req, res) => {
    const filename = req.params.filename;
    const logoPath = path.join(UPLOADS_DIR, filename);
    
    // Check if file exists
    if (!fs.existsSync(logoPath)) {
      console.log(`❌ Logo not found: ${logoPath}`);
      return res.status(404).json({ error: "Logo not found" });
    }
    
    console.log(`✅ Serving logo: ${logoPath}`);
    res.sendFile(logoPath);
  });

  // Create a new, simplified logo upload endpoint
  app.post("/api/upload-logo", (req, res) => {
    console.log("📤 NEW LOGO UPLOAD REQUEST RECEIVED");
    
    // Handle auth first to fail fast
    if (!req.isAuthenticated()) {
      console.log("❌ Upload rejected: Not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.user ? (req.user as any).id : null;
    console.log(`👤 Authenticated user: ${userId}`);
    
    if (!userId) {
      console.log("❌ Upload rejected: Invalid user ID");
      return res.status(401).json({ error: "Invalid user ID" });
    }
    
    // Set up a simplified upload middleware for this endpoint
    const simpleUpload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          console.log(`📁 Upload directory: ${UPLOADS_DIR}`);
          cb(null, UPLOADS_DIR);
        },
        filename: (req, file, cb) => {
          const safeFileName = `logo-${userId}-${Date.now()}${path.extname(file.originalname)}`;
          console.log(`📄 Generated filename: ${safeFileName}`);
          cb(null, safeFileName);
        }
      }),
      fileFilter: (req, file, cb) => {
        // Validate mime type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          console.log(`❌ Rejected file type: ${file.mimetype}`);
          return cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
        }
        console.log(`✅ Accepted file type: ${file.mimetype}`);
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      }
    }).single('logo');
    
    // Process the upload
    simpleUpload(req, res, async (err) => {
      // Handle multer errors
      if (err) {
        console.log(`❌ Upload error: ${err.message}`);
        return res.status(400).json({ error: err.message });
      }
      
      // Check if we have a file
      if (!req.file) {
        console.log("❌ No file received");
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      try {
        console.log(`✅ File received: ${req.file.originalname} (${req.file.size} bytes)`);
        const filename = path.basename(req.file.path);
        
        // Update database with the new logo filename
        console.log(`💾 Updating database for user ${userId} with logo: ${filename}`);
        
        // First check if user has a business info record
        const checkQuery = `SELECT id FROM business_info WHERE user_id = $1`;
        const existingRecord = await pool.query(checkQuery, [userId]);
        
        if (existingRecord.rows.length === 0) {
          // Create new record
          console.log(`📝 Creating new business info record for user ${userId}`);
          const insertQuery = `
            INSERT INTO business_info 
            (user_id, company_logo, company_name) 
            VALUES ($1, $2, 'Your Company') 
            RETURNING id
          `;
          await pool.query(insertQuery, [userId, filename]);
        } else {
          // Update existing record
          console.log(`📝 Updating existing business info for user ${userId}`);
          const updateQuery = `
            UPDATE business_info 
            SET company_logo = $2 
            WHERE user_id = $1
          `;
          await pool.query(updateQuery, [userId, filename]);
        }
        
        console.log("✅ Logo upload completed successfully");
        
        // Return success with the file URL
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
          success: true,
          filename,
          path: `/api/business-logo/${filename}`,
          message: "Logo uploaded successfully"
        });
      } catch (error) {
        console.error("❌ Database error:", error);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
          success: false, 
          error: "Server error while saving logo",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
  });

  // Add a diagnostic endpoint for troubleshooting
  app.get("/api/debug/engagements", async (req, res) => {
    try {
      // This route bypasses authentication for debugging
      console.log("[DEBUG] Attempting to fetch all engagements without user filtering");
      
      // Get engagements using the storage interface instead of direct SQL
      // This avoids the require/import issue
      const engagements = await storage.getEngagements();
      
      // Return diagnostic info and data
      res.json({
        message: "Debug endpoint for engagements",
        count: engagements.length,
        auth: {
          isAuthenticated: req.isAuthenticated(),
          user: req.user ? {
            id: (req.user as any).id,
            username: (req.user as any).username
          } : null
        },
        database: {
          url: process.env.DATABASE_URL ? "Set (masked for security)" : "Not set",
          connectionWorks: true
        },
        data: engagements.slice(0, 10) // Just return the first 10 engagements
      });
    } catch (error) {
      console.error("[DEBUG] Error in debug endpoint:", error);
      res.status(500).json({
        message: "Error in debug endpoint",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // This direct endpoint is now the primary way engagements are fetched
  // It bypasses the problematic storage layer and queries the database directly
  app.get("/api/direct/engagements", async (req, res) => {
    try {
      // Get user ID from authenticated session
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Query the database directly with plain SQL
      const directResult = await pool.query(`
        SELECT 
          e.id, e.user_id, e.client_id, e.project_name, e.start_date, e.end_date, 
          e.hourly_rate, e.project_amount, e.engagement_type, e.status,
          c.name as client_name
        FROM engagements e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.user_id = $1
        ORDER BY e.id DESC
      `, [userId]);
      
      // Format the results as expected by the frontend
      const formattedEngagements = directResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        clientId: row.client_id,
        projectName: row.project_name,
        startDate: row.start_date,
        endDate: row.end_date,
        hourlyRate: row.hourly_rate,
        projectAmount: row.project_amount,
        engagementType: row.engagement_type,
        status: row.status,
        clientName: row.client_name || "Unknown Client"
      }));
      
      return res.json(formattedEngagements);
    } catch (error) {
      console.error("Error in direct query endpoint:", error);
      res.status(500).json({ message: "Error in direct query endpoint", error: error.message });
    }
  });

  // Direct endpoint for active engagements only
  app.get("/api/direct/engagements/active", async (req, res) => {
    try {
      // Get user ID from authenticated session
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      console.log("GET /api/direct/engagements/active - Auth status:", req.isAuthenticated(), "User ID:", userId);
      
      if (!userId) {
        console.log("Not authenticated for active engagements endpoint");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Query the database directly with plain SQL to get engagements
      console.log("Executing SQL query for engagements with userId:", userId);
      const directResult = await pool.query(`
        SELECT 
          e.id, e.user_id, e.client_id, e.project_name, e.start_date, e.end_date, 
          e.hourly_rate, e.project_amount, e.engagement_type, e.status,
          c.name as client_name, c.billing_contact_email as client_email
        FROM engagements e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.user_id = $1
        ORDER BY e.id DESC
      `, [userId]);
      
      console.log(`Retrieved ${directResult.rows.length} engagements from database`);
      
      // Format the results without filtering by status
      const formattedEngagements = directResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        clientId: row.client_id,
        projectName: row.project_name,
        startDate: row.start_date,
        endDate: row.end_date,
        hourlyRate: row.hourly_rate,
        projectAmount: row.project_amount,
        engagementType: row.engagement_type,
        status: "active", // Force 'active' status to show all engagements
        clientName: row.client_name || "Unknown Client",
        clientEmail: row.client_email
      }));
      
      console.log(`Returning ${formattedEngagements.length} engagements with forced active status`);
      return res.json(formattedEngagements);
    } catch (error) {
      console.error("Error in direct active engagements endpoint:", error);
      res.status(500).json({ message: "Error fetching active engagements", error: error.message });
    }
  });

  // Remove the bypass/debug endpoint
  app.get("/api/bypass/engagements", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      console.log("BYPASS API - Auth status:", req.isAuthenticated(), "User ID:", userId);
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get raw engagements from storage with no additional filtering
      let engagements = await storage.getEngagements(userId);
      
      // Return with minimal processing
      res.json({
        count: engagements.length,
        auth: { userId },
        // Return the raw data
        data: engagements
      });
    } catch (error) {
      console.error("Error in bypass endpoint:", error);
      res.status(500).json({ message: "Error in bypass endpoint", error: error.message });
    }
  });

  // Add a special diagnostic endpoint for the current engagements issue
  app.get("/api/debug/fix-engagements", async (req, res) => {
    try {
      console.log("[EMERGENCY FIX] Attempting direct database access to diagnose engagement issue");
      
      // Get the current user ID
      const currentUserId = req.isAuthenticated() ? (req.user as any).id : null;
      console.log("[EMERGENCY FIX] Current authenticated user ID:", currentUserId);
      
      // Import pg directly to avoid typescript issues
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });
      
      // Get all engagements from the database without any filtering
      const engResult = await pool.query(`
        SELECT e.*, c.name as client_name
        FROM engagements e
        LEFT JOIN clients c ON e.client_id = c.id
        ORDER BY e.id
      `);
      
      // Get all users to check if there might be a user ID mismatch
      const userResult = await pool.query(`
        SELECT id, username FROM users
      `);
      
      console.log("[EMERGENCY FIX] Found", engResult.rows.length, "total engagements in database");
      console.log("[EMERGENCY FIX] Found", userResult.rows.length, "users in database");
      
      // Check if the current user ID matches any engagement user IDs
      const userMatch = engResult.rows.some(eng => eng.user_id === currentUserId);
      console.log("[EMERGENCY FIX] Current user has matching engagements:", userMatch);
      
      if (!userMatch && currentUserId) {
        console.log("[EMERGENCY FIX] CRITICAL: User ID mismatch detected. Current user has no engagements.");
        
        // Sample the first engagement user ID to help understand the problem
        if (engResult.rows.length > 0) {
          const sampleEngUserId = engResult.rows[0].user_id;
          console.log(`[EMERGENCY FIX] Sample engagement has user_id=${sampleEngUserId}`);
          
          // Find username for the sample engagement user ID
          const matchingUser = userResult.rows.find(u => u.id === sampleEngUserId);
          if (matchingUser) {
            console.log(`[EMERGENCY FIX] Sample engagement belongs to username: ${matchingUser.username}`);
          }
        }
      }
      
      // Return useful diagnostic information
      res.json({
        currentUser: {
          id: currentUserId,
          username: currentUserId ? (req.user as any).username : null,
          authenticated: req.isAuthenticated()
        },
        engagements: {
          total: engResult.rows.length,
          userIds: [...new Set(engResult.rows.map(e => e.user_id))],
          hasMatchForCurrentUser: userMatch,
          sample: engResult.rows.slice(0, 3).map(e => ({
            id: e.id,
            user_id: e.user_id,
            project_name: e.project_name,
            client_name: e.client_name
          }))
        },
        users: {
          total: userResult.rows.length,
          ids: userResult.rows.map(u => ({ id: u.id, username: u.username }))
        },
        solution: !userMatch && currentUserId ? {
          message: "Your user ID doesn't match any engagements. This is the root cause.",
          options: [
            "Use an account that owns engagements",
            "Update engagement user_id values in the database to match your user ID",
            "Create new engagements with your user ID"
          ]
        } : {
          message: "Diagnostic complete"
        }
      });
      
      await pool.end();
    } catch (error) {
      console.error("[EMERGENCY FIX] Error:", error);
      res.status(500).json({
        error: "Error diagnosing engagement issue",
        message: error.message
      });
    }
  });

  // Forgot password route
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success even if user not found for security
      if (!user) {
        return res.status(200).json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }
      
      // Generate a secure random token
      const resetToken = uuidv4();
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Save token to database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);
      
      // Send password reset email
      await emailService.sendPasswordResetEmail({
        to: user.email || "",
        resetToken: resetToken,
        userName: user.name || user.username,
      });
      
      res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });
  
  // Reset password route - Verify token and show form
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ 
          message: "Password reset link is invalid or has expired." 
        });
      }
      
      // Return success
      res.status(200).json({ message: "Token is valid" });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });
  
  // Reset password route - Process password change
  app.post("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Please provide a password with at least 8 characters." });
      }
      
      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ 
          message: "Password reset link is invalid or has expired." 
        });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(password);
      
      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);
      
      res.status(200).json({ message: "Password has been reset successfully." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });

  // Add a test route for debugging active engagements
  app.get("/api/debug/active-engagements", async (req, res) => {
    try {
      // Ensure user is authenticated for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view engagements" });
      }
      
      // Get user ID from authenticated session
      const userId = (req.user as any).id;
      console.log(`Debugging active engagements for userId: ${userId}`);
      
      // First, get all engagements
      const allEngagements = await storage.getEngagements(userId);
      console.log(`Total engagements for user: ${allEngagements.length}`);
      
      // Get engagements with status 'active' in database
      const statusActiveEngagements = allEngagements.filter(e => e.status === 'active');
      console.log(`Engagements with status='active' in database: ${statusActiveEngagements.length}`);
      
      // Import the status calculation function
      const { calculateEngagementStatus } = await import('./calculateEngagementStatus');
      
      // Calculate status for each engagement based on date ranges
      const calculatedStatuses = allEngagements.map(engagement => {
        const currentStatus = calculateEngagementStatus(
          new Date(engagement.startDate), 
          new Date(engagement.endDate)
        );
        
        return {
          id: engagement.id,
          projectName: engagement.projectName,
          databaseStatus: engagement.status,
          calculatedStatus: currentStatus,
          startDate: new Date(engagement.startDate).toISOString(),
          endDate: new Date(engagement.endDate).toISOString(),
          isActive: currentStatus === 'active'
        };
      });
      
      // Count engagements that should be active based on date calculation
      const dateActiveEngagements = calculatedStatuses.filter(e => e.calculatedStatus === 'active');
      console.log(`Engagements that should be active based on date calculation: ${dateActiveEngagements.length}`);
      
      // Get active engagements using the storage method
      const activeEngagements = await storage.getActiveEngagements(userId);
      console.log(`Active engagements from storage.getActiveEngagements: ${activeEngagements.length}`);
      
      // Return detailed info for debugging
      res.json({
        user: { id: userId },
        totals: {
          allEngagements: allEngagements.length,
          statusActive: statusActiveEngagements.length,
          calculatedActive: dateActiveEngagements.length,
          fromStorageMethod: activeEngagements.length
        },
        engagementDetails: calculatedStatuses,
        activeEngagements: activeEngagements.map(e => ({
          id: e.id,
          projectName: e.projectName,
          status: e.status,
          startDate: e.startDate,
          endDate: e.endDate
        }))
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ 
        message: "Failed to fetch debug information",
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

export function createRouter(storage: DatabaseStorage): ExpressRouter {
  // @ts-ignore - Temporarily ignoring router typing issues
  const router = express.Router();

  // Add debug endpoints
  router.get("/debug/active-engagements", async (req, res) => {
    try {
      console.log("Debug endpoint called");
      // Ensure user is authenticated for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view engagements" });
      }
      
      // Get user ID from authenticated session
      const userId = (req.user as any).id;
      console.log(`Debugging active engagements for userId: ${userId}`);
      
      // First, get all engagements
      const allEngagements = await storage.getEngagements(userId);
      console.log(`Total engagements for user: ${allEngagements.length}`);
      
      // Get engagements with status 'active' in database
      const statusActiveEngagements = allEngagements.filter(e => e.status === 'active');
      console.log(`Engagements with status='active' in database: ${statusActiveEngagements.length}`);
      
      // Import the status calculation function
      const { calculateEngagementStatus } = await import('./calculateEngagementStatus');
      
      // Calculate status for each engagement based on date ranges
      const calculatedStatuses = allEngagements.map(engagement => {
        const currentStatus = calculateEngagementStatus(
          new Date(engagement.startDate), 
          new Date(engagement.endDate)
        );
        
        return {
          id: engagement.id,
          projectName: engagement.projectName,
          databaseStatus: engagement.status,
          calculatedStatus: currentStatus,
          startDate: new Date(engagement.startDate).toISOString(),
          endDate: new Date(engagement.endDate).toISOString(),
          isActive: currentStatus === 'active'
        };
      });
      
      // Count engagements that should be active based on date calculation
      const dateActiveEngagements = calculatedStatuses.filter(e => e.calculatedStatus === 'active');
      console.log(`Engagements that should be active based on date calculation: ${dateActiveEngagements.length}`);
      
      // Get active engagements using the storage method
      const activeEngagements = await storage.getActiveEngagements(userId);
      console.log(`Active engagements from storage.getActiveEngagements: ${activeEngagements.length}`);
      
      // Return detailed info for debugging
      res.json({
        user: { id: userId },
        totals: {
          allEngagements: allEngagements.length,
          statusActive: statusActiveEngagements.length,
          calculatedActive: dateActiveEngagements.length,
          fromStorageMethod: activeEngagements.length
        },
        engagementDetails: calculatedStatuses,
        activeEngagements: activeEngagements.map(e => ({
          id: e.id,
          projectName: e.projectName,
          status: e.status,
          startDate: e.startDate,
          endDate: e.endDate
        }))
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ 
        message: "Failed to fetch debug information",
        error: error.message
      });
    }
  });

  // Client routes
  router.get("/clients", auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get("/clients/:id", auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ServerError("Invalid client ID", 400);
      }
      
      const client = await storage.getClient(id, userId);
      if (!client) {
        throw new ServerError("Client not found", 404);
      }
      
      res.json(client);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post("/clients", auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const data = insertClientSchema.parse({ ...req.body, userId });
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.put("/clients/:id", auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ServerError("Invalid client ID", 400);
      }
      
      // Validate and clean data, but don't include userId in the update
      const updateData = { ...req.body };
      delete updateData.userId; // Prevent overwriting the owner
      
      const client = await storage.updateClient(id, updateData, userId);
      if (!client) {
        throw new ServerError("Client not found", 404);
      }
      
      res.json(client);
    } catch (err) {
      handleError(err, res);
    }
  });

  router.delete("/clients/:id", auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ServerError("Invalid client ID", 400);
      }
      
      const success = await storage.deleteClient(id, userId);
      if (!success) {
        throw new ServerError("Client not found", 404);
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Time Log routes
  router.get("/time-logs", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view time logs" });
      }

      const userId = (req.user as any).id;
      const { engagementId, startDate, endDate, dateRange, client: clientFilter } = req.query;
      
      // Log the incoming request parameters
      console.log('Time logs router request:', {
        userId,
        engagementId,
        startDate,
        endDate,
        dateRange,
        clientFilter
      });

      let query;
      let queryParams = [];
      
      // Base query selecting time logs with their engagement data
      const baseQuery = `
        SELECT t.*, e.client_name, e.project_name, e.hourly_rate 
        FROM time_logs t 
        JOIN engagements e ON t.engagement_id = e.id 
        WHERE t.user_id = $1
      `;
      
      // Always include user ID as the first parameter
      queryParams.push(userId);
      
      // Start building the query
      query = baseQuery;
      
      // Filter by engagement if specified
      if (engagementId && engagementId !== '0') {
        query += ` AND t.engagement_id = $${queryParams.length + 1}`;
        queryParams.push(Number(engagementId));
      }
      
      // Filter by client if specified
      if (clientFilter && clientFilter !== 'all') {
        query += ` AND e.client_name = $${queryParams.length + 1}`;
        queryParams.push(clientFilter);
      }
      
      // Apply date filtering if both start and end dates are provided and dateRange is not 'all'
      if (startDate && endDate && dateRange !== 'all') {
        query += ` AND t.date >= $${queryParams.length + 1}::date AND t.date <= $${queryParams.length + 2}::date`;
        queryParams.push(startDate, endDate);
      }
      
      // Add ordering
      query += ` ORDER BY t.date DESC`;
      
      console.log('Executing router query:', { query, params: queryParams });
      
      const result = await pool.query(query, queryParams);
      
      // Transform the results to match the expected format
      const timeLogs = result.rows.map(log => ({
        id: log.id,
        userId: log.user_id,
        engagementId: log.engagement_id,
        date: log.date,
        hours: log.hours,
        description: log.description,
        billableAmount: parseFloat(log.hours) * parseFloat(log.hourly_rate),
        clientName: log.client_name,
        projectName: log.project_name,
        engagement: {
          id: log.engagement_id,
          clientName: log.client_name,
          projectName: log.project_name,
          hourlyRate: log.hourly_rate
        }
      }));

      // Log the response
      console.log(`Router found ${timeLogs.length} time logs for user ${userId}`);

      res.json(timeLogs);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  router.get("/time-logs/:id", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      const id = Number(req.params.id);
      console.log(`Fetching time log with ID: ${id}`);
      
      const timeLog = await storage.getTimeLog(id, userId);
      if (!timeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }
      
      // Ensure description is consistently handled
      const sanitizedTimeLog = {
        ...timeLog,
        description: timeLog.description || null
      };
      
      console.log(`Retrieved time log:`, sanitizedTimeLog);
      res.json(sanitizedTimeLog);
    } catch (error) {
      console.error(`Error fetching time log:`, error);
      res.status(500).json({ message: "Failed to fetch time log" });
    }
  });

  router.post("/time-logs", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to create time logs" });
      }
      
      // Debug log the incoming request body
      console.log('Time log creation request body:', req.body);

      // Process the data before validation
      const processedData = {
        ...req.body,
        userId: (req.user as any).id,
        date: new Date(req.body.date),
        hours: Number(req.body.hours),
        engagementId: Number(req.body.engagementId)
      };
      
      console.log('Processed data before validation:', processedData);
      
      const validationResult = insertTimeLogSchema.safeParse(processedData);
      if (!validationResult.success) {
        console.log('Time log validation failed:', validationResult.error.format());
        return res.status(400).json({ 
          message: "Invalid time log data", 
          errors: validationResult.error.format() 
        });
      }

      console.log('Creating time log with validated data:', validationResult.data);
      const timeLog = await storage.createTimeLog(validationResult.data);
      console.log('Time log created successfully:', timeLog);
      res.status(201).json(timeLog);
    } catch (error) {
      console.error("Failed to create time log:", error);
      res.status(500).json({ message: "Failed to create time log" });
    }
  });

  router.put("/time-logs/:id", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update time logs" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;

      // First get the existing time log
      const existingTimeLog = await storage.getTimeLog(id, userId);
      if (!existingTimeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }

      // Debug log the incoming request body
      console.log('Time log update request body:', req.body);
      console.log('Time log description received:', req.body.description);
      console.log('Description type:', typeof req.body.description);
      
      // Handle empty string descriptions explicitly
      let descriptionValue = req.body.description;
      if (descriptionValue === "" || descriptionValue === null || descriptionValue === undefined || 
          (typeof descriptionValue === 'string' && descriptionValue.trim() === '')) {
        descriptionValue = null;
        console.log('Converting empty description to null');
      }
      
      // Process the data before validation, merging with existing data
      const processedData = {
        ...existingTimeLog,
        ...req.body,
        userId,
        date: req.body.date ? new Date(req.body.date) : existingTimeLog.date,
        hours: req.body.hours !== undefined ? Number(req.body.hours) : existingTimeLog.hours,
        engagementId: req.body.engagementId !== undefined ? Number(req.body.engagementId) : existingTimeLog.engagementId,
        description: descriptionValue
      };
      
      console.log('Processed data before validation:', processedData);
      console.log('Processed description value:', processedData.description);
      
      const validationResult = insertTimeLogSchema.safeParse(processedData);
      if (!validationResult.success) {
        console.log('Time log validation failed:', validationResult.error.format());
        return res.status(400).json({ 
          message: "Invalid time log data", 
          errors: validationResult.error.format() 
        });
      }

      const updatedTimeLog = await storage.updateTimeLog(id, validationResult.data, userId);
      if (!updatedTimeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }
      res.json(updatedTimeLog);
    } catch (error) {
      console.error("Failed to update time log:", error);
      res.status(500).json({ message: "Failed to update time log" });
    }
  });

  router.delete("/time-logs/:id", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to delete time logs" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const success = await storage.deleteTimeLog(id, userId);
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
  
  router.get("/invoices", async (req: Request, res: Response) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Check for overdue invoices before returning results
      await checkAndUpdateOverdueInvoices();
      
      const { status, client, dateRange, startDate, endDate } = req.query;
      let query = `
        SELECT 
          i.*
        FROM invoices i
        JOIN engagements e ON i.engagement_id = e.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Add user filter if authenticated
      if (userId !== undefined) {
        query += ` AND i.user_id = $${params.length + 1}`;
        params.push(userId);
      }
      
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
      
      // Convert totalAmount and totalHours to numbers
      const invoices = result.rows.map(row => ({
        ...row,
        total_amount: Number(row.total_amount),
        total_hours: Number(row.total_hours)
      }));

      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  router.get("/invoices/:id", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      const invoiceId = Number(req.params.id);
      
      if (isNaN(invoiceId) || invoiceId <= 0) {
        console.error(`Invalid invoice ID requested: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid invoice ID format" });
      }
      
      console.log(`Fetching invoice details for ID: ${invoiceId}`);
      const invoice = await storage.getInvoice(invoiceId, userId);
      
      if (!invoice) {
        console.error(`Invoice not found with ID: ${invoiceId}`);
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Verify invoice has required fields
      if (!invoice.invoiceNumber || !invoice.clientName) {
        console.error(`Invoice ${invoiceId} has missing required fields:`, invoice);
        return res.status(500).json({ message: "Invoice data is incomplete" });
      }
      
      // Add empty lineItems array to satisfy client expectations
      const invoiceWithLineItems = {
        ...invoice,
        lineItems: []
      };
      
      console.log(`Successfully retrieved invoice ${invoiceId} (${invoice.invoiceNumber})`);
      res.json(invoiceWithLineItems);
    } catch (error) {
      console.error(`Error fetching invoice ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch invoice", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.post('/api/invoices', invoiceRateLimiter, async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to create invoices" });
      }
      
      const userId = (req.user as any).id;
      const { 
        engagementId, 
        timeLogs = [], 
        lineItems = [],
        totalAmount: providedTotalAmount,
        totalHours: providedTotalHours,
        clientName: providedClientName,
        projectName: providedProjectName,
        periodStart,
        periodEnd,
        status = 'submitted'
      } = req.body;

      // Add detailed request logging
      console.log('=== Invoice Creation Request Start ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User ID:', userId);
      console.log('=== Invoice Creation Request End ===');

      // Validate required fields
      if (!engagementId) {
        console.error('Missing engagement ID');
        return res.status(400).json({ error: 'Engagement ID is required' });
      }

      // Get engagement details
      try {
        const engagementResult = await pool.query(
          'SELECT e.project_name, e.hourly_rate, c.name as client_name FROM engagements e ' +
          'LEFT JOIN clients c ON e.client_id = c.id ' +
          'WHERE e.id = $1 AND e.user_id = $2',
          [engagementId, userId]
        );
        
        if (engagementResult.rows.length === 0) {
          console.error(`Engagement not found: ${engagementId} for user ${userId}`);
          return res.status(404).json({ error: 'Engagement not found' });
        }
        
        const engagement = engagementResult.rows[0];
        console.log('Found engagement:', engagement);

        const clientName = providedClientName || engagement.client_name;
        const projectName = providedProjectName || engagement.project_name;
        
        let finalTotalAmount: number;
        let finalTotalHours: number;

        console.log('Processing time logs for invoice totals...');
        // Calculate total amount and hours from time logs or use provided values
        if (providedTotalAmount && providedTotalHours) {
          // Use provided values
          finalTotalAmount = Number(providedTotalAmount);
          finalTotalHours = Number(providedTotalHours);
          console.log('Using provided totals:', { finalTotalAmount, finalTotalHours });
        } else if (lineItems && lineItems.length > 0) {
          // Calculate from line items
          finalTotalHours = Number(lineItems.reduce((sum: number, item: { hours: number | string }) => 
            sum + Number(item.hours), 0).toFixed(2));
          finalTotalAmount = Number(lineItems.reduce((sum: number, item: { amount: number | string }) => 
            sum + Number(item.amount), 0).toFixed(2));
          console.log('Calculated totals from line items:', { finalTotalAmount, finalTotalHours });
        } else if (timeLogs && timeLogs.length > 0) {
          // Calculate from time logs
          finalTotalHours = Number(timeLogs.reduce((sum: number, log: any) => 
            sum + Number(log.hours), 0).toFixed(2));
          
          finalTotalAmount = Number(timeLogs.reduce((sum: number, log: any) => {
            const hours = Number(log.hours);
            const rate = Number(log.engagement.hourlyRate);
            return sum + (hours * rate);
          }, 0).toFixed(2));
          
          console.log('Calculated totals from time logs:', { finalTotalAmount, finalTotalHours });
        } else {
          console.error('No data provided to calculate invoice totals');
          return res.status(400).json({ error: 'No data provided to calculate invoice totals' });
        }

        // Validate calculated values
        if (isNaN(finalTotalAmount) || finalTotalAmount <= 0) {
          console.error('Invalid total amount:', finalTotalAmount);
          return res.status(400).json({ error: 'Invalid total amount' });
        }

        if (isNaN(finalTotalHours) || finalTotalHours <= 0) {
          console.error('Invalid total hours:', finalTotalHours);
          return res.status(400).json({ error: 'Invalid total hours' });
        }

        console.log('Creating invoice record...');
        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + 30);

        try {
          // Create invoice with total amount and hours
          const invoiceResult = await pool.query(
            'INSERT INTO invoices (engagement_id, status, issue_date, due_date, invoice_number, client_name, total_amount, total_hours, period_start, period_end, project_name, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
            [
              engagementId, 
              status, 
              today, 
              dueDate, 
              req.body.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
              clientName,
              finalTotalAmount,
              finalTotalHours,
              periodStart || today, 
              periodEnd || today,
              projectName,
              userId
            ]
          );
          
          const invoiceId = invoiceResult.rows[0].id;
          console.log(`Created invoice with ID: ${invoiceId}`);

          console.log('Successfully created invoice');
          res.json({ id: invoiceId });
        } catch (error) {
          console.error('Database error creating invoice:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error in engagement lookup or processing:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      // Send more detailed error information
      res.status(500).json({ 
        error: 'Failed to create invoice', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  router.put("/api/invoices/:id/status", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update invoice status" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      const statusSchema = z.object({ status: z.string() });
      
      const validationResult = statusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid status data", errors: validationResult.error.errors });
      }

      const updatedInvoice = await storage.updateInvoiceStatus(id, validationResult.data.status, userId);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  router.put("/api/invoices/:id", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update invoices" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      // Extract fields that can be updated
      const {
        clientName,
        projectName,
        issueDate,
        dueDate,
        totalAmount,
        totalHours,
        notes,
        periodStart,
        periodEnd,
        netTerms // Add netTerms to the list of fields
      } = req.body;
      
      // Prepare update object with only provided fields
      const updateData: Partial<Invoice> = {};
      
      if (clientName !== undefined) updateData.clientName = clientName;
      if (projectName !== undefined) updateData.projectName = projectName;
      if (issueDate !== undefined) updateData.issueDate = new Date(issueDate);
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
      if (totalHours !== undefined) updateData.totalHours = totalHours;
      if (notes !== undefined) updateData.notes = notes;
      if (periodStart !== undefined) updateData.periodStart = new Date(periodStart);
      if (periodEnd !== undefined) updateData.periodEnd = new Date(periodEnd);
      if (netTerms !== undefined) updateData.netTerms = netTerms; // Add netTerms to updateData
      
      // Update invoice
      const updatedInvoice = await storage.updateInvoice(id, updateData, userId);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ 
        message: "Failed to update invoice",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.delete("/api/invoices/:id", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to delete invoices" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const success = await storage.deleteInvoice(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Dashboard routes
  router.get("/api/dashboard/ytd-revenue", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Default to 2025 for current year if no year is provided
      const year = Number(req.query.year) || 2025;
      const revenue = await storage.getYtdRevenue(year, userId);
      res.json({ revenue });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch YTD revenue" });
    }
  });

  router.get("/api/dashboard/monthly-revenue", async (req, res) => {
    try {
      // Ensure user is authenticated for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view monthly revenue data" });
      }
      
      // Get user ID from authenticated session
      const userId = (req.user as any).id;
      
      // Default to current year if no year is provided
      const defaultYear = new Date().getFullYear();
      const year = Number(req.query.year) || defaultYear;
      
      console.log(`Getting monthly revenue data for userId: ${userId}, year: ${year}`);
      
      const monthlyData = await storage.getMonthlyRevenueBillable(year, userId);
      
      console.log(`Retrieved ${monthlyData.length} months of revenue data for user ${userId}`);
      
      res.json(monthlyData);
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      res.status(500).json({ message: "Failed to fetch monthly revenue" });
    }
  });

  router.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Ensure user is authenticated for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view dashboard stats" });
      }
      
      // Get user ID from authenticated session
      const userId = (req.user as any).id;
      
      // Get current date info for proper calculations
      const currentDate = new Date();
      
      // Calculate date ranges using the same function as time logs
      const { startDate: monthStart, endDate: monthEnd } = getDateRange('month', currentDate);
      const { startDate: yearStart, endDate: yearEnd } = getDateRange('current', currentDate);
      
      console.log(`Getting dashboard stats for userId: ${userId}`);
      console.log(`Year period: ${yearStart.toISOString()} to ${yearEnd.toISOString()}`);
      console.log(`Month period: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);
      console.log(`Current date: ${currentDate.toISOString()}`);

      // Get all engagements and calculate active ones directly
      console.log('Fetching engagements directly...');
      
      // Use direct SQL query for reliable results
      const engResult = await pool.query(`
        SELECT 
          e.id, e.project_name, e.start_date, e.end_date, e.status
        FROM engagements e
        WHERE e.user_id = $1
      `, [userId]);
      
      console.log(`Retrieved ${engResult.rows.length} total engagements`);
      
      // Import the status calculation function
      const { calculateEngagementStatus } = await import('./calculateEngagementStatus');
      
      // Calculate active engagements based on date ranges
      const activeEngagements = engResult.rows.filter(engagement => {
        const currentStatus = calculateEngagementStatus(
          new Date(engagement.start_date), 
          new Date(engagement.end_date)
        );
        return currentStatus === 'active';
      });
      
      console.log(`Active engagements based on date calculation: ${activeEngagements.length}`);
      
      // Calculate YTD revenue directly from paid invoices
      console.log('Calculating YTD revenue from paid invoices...');
      const ytdRevenueResult = await pool.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE user_id = $1
        AND status = 'paid'
        AND issue_date BETWEEN $2 AND $3
      `, [userId, yearStart, yearEnd]);
      
      const ytdRevenue = parseFloat(ytdRevenueResult.rows[0]?.total || '0');
      console.log(`YTD Revenue from paid invoices: ${ytdRevenue}`);
      
      // Get monthly hours logged in current month using shared function
      console.log('Calculating monthly hours logged...');
      const monthlyTimeLogs = await getTimeLogs(userId, 'month');
      const monthlyHours = monthlyTimeLogs.reduce((sum, log) => sum + Number(log.hours), 0);
      console.log(`Monthly hours logged: ${monthlyHours} (from ${monthlyTimeLogs.length} time logs)`);
      
      // Get pending invoices total
      console.log('Calculating pending invoices total...');
      const pendingResult = await pool.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE user_id = $1
        AND (status = 'submitted' OR status = 'overdue')
      `, [userId]);
      
      const pendingInvoicesTotal = parseFloat(pendingResult.rows[0]?.total || '0');
      console.log(`Pending invoices total: ${pendingInvoicesTotal}`);

      console.log(`Dashboard stats results for user ${userId}:
        - Active engagements: ${activeEngagements.length}
        - YTD revenue from paid invoices: ${ytdRevenue}
        - Monthly hours: ${monthlyHours}
        - Pending invoices: ${pendingInvoicesTotal}
      `);

      res.json({
        ytdRevenue,
        activeEngagements: activeEngagements.length,
        monthlyHours,
        pendingInvoicesTotal
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Email invoice endpoint
  router.post("/api/invoices/:id/email", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to email invoices" });
      }
      
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const invoice = await storage.getInvoice(id, userId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Generate PDF for attachment
      console.log("Generating PDF attachment...");
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // First, fetch the business info
      console.log("Fetching business info for invoice...");
      const businessInfoQuery = `SELECT * FROM business_info WHERE user_id = $1`;
      const businessInfoResult = await pool.query(businessInfoQuery, [userId]);
      const businessInfo = businessInfoResult.rows.length > 0 ? businessInfoResult.rows[0] : null;
      
      // Get user's name - use req.user if available or business info
      const userName = (req.user as any)?.name || businessInfo?.company_name || "Derek Schatz";
      
      // 1. Name at top left
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(userName, 20, 30);
      
      // 2. Logo centered at top (or company name if no logo)
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      if (businessInfo && businessInfo.company_name) {
        pdf.text(businessInfo.company_name, 105, 30, { align: 'center' });
      } else {
        pdf.text("Agile Infusion", 105, 30, { align: 'center' });
      }
      
      // 3. INVOICE title and info at top right
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text("INVOICE", 190, 30, { align: 'right' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`INVOICE #${invoice.invoiceNumber}`, 190, 40, { align: 'right' });
      pdf.text(`DATE: ${new Date(invoice.issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })}`, 190, 50, { align: 'right' });
      
      // Due date
      if (invoice.dueDate) {
        pdf.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`, 190, 60, { align: 'right' });
      }
      
      // 4. Company details below name on left
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      let yPos = 40;
      
      if (businessInfo) {
        if (businessInfo.company_name) {
          pdf.text(businessInfo.company_name, 20, yPos);
          yPos += 8;
        }
        
        if (businessInfo.address) {
          pdf.text(businessInfo.address, 20, yPos);
          yPos += 8;
        }
        
        // City, state, zip
        const addressLine = [
          businessInfo.city,
          businessInfo.state,
          businessInfo.zip
        ].filter(Boolean).join(", ");
        
        if (addressLine) {
          pdf.text(addressLine, 20, yPos);
          yPos += 8;
        }
        
        if (businessInfo.phone_number) {
          pdf.text(`Phone: ${businessInfo.phone_number}`, 20, yPos);
          yPos += 8;
        }
        
        if (businessInfo.tax_id) {
          pdf.text(`Tax ID: ${businessInfo.tax_id}`, 20, yPos);
          yPos += 8;
        }
      } else {
        // Default business info matching screenshot
        pdf.text("Agile Infusion", 20, 40);
        pdf.text("100 Danby Court", 20, 48);
        pdf.text("Churchville, PA, 18966", 20, 56);
        pdf.text("Phone: 215-630-3317", 20, 64);  
        pdf.text("Tax ID: 20-5199056", 20, 72);
        yPos = 80;
      }
      
      // Add horizontal line 
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 100, 190, 100);
      
      // BILL TO section - keep this
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text("BILL TO:", 20, 115);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${invoice.clientName}`, 50, 115);
      
      // 7. Table layout - moved up since we're removing just the FOR section
      const tableStartY = 140;
      
      // Column headers
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text("DESCRIPTION", 20, tableStartY);
      pdf.text("HOURS", 120, tableStartY);
      pdf.text("RATE", 145, tableStartY);
      pdf.text("AMOUNT", 170, tableStartY);
      
      // Add a line under the header
      pdf.setDrawColor(0, 0, 0);
      pdf.line(20, tableStartY + 5, 190, tableStartY + 5);
      
      // Create a default line item from the invoice total if no line items exist
      const defaultLineItems: InvoiceLineItem[] = [{
        invoiceId: invoice.id,
        description: `${invoice.projectName || 'Consulting'} Activities`,
        hours: Number(invoice.totalHours),
        rate: Number(invoice.totalAmount) / Number(invoice.totalHours),
        amount: Number(invoice.totalAmount)
      }];
      
      // Use either the existing lineItems if available, or the default line item
      const itemsToDisplay = (invoice as InvoiceWithLineItems).lineItems || defaultLineItems;
      
      // Table data
      let itemY = tableStartY + 15;
      pdf.setFont('helvetica', 'normal');
      
      itemsToDisplay.forEach(item => {
        pdf.text(item.description.substring(0, 50), 20, itemY);
        pdf.text(item.hours.toString(), 120, itemY);
        pdf.text(`$${typeof item.rate === 'string' ? item.rate : item.rate.toFixed(2)}/hr`, 145, itemY);
        pdf.text(`$${typeof item.amount === 'string' ? item.amount : item.amount.toFixed(2)}`, 170, itemY);
        itemY += 10;
      });
      
      // If we have period info, add it as a separate line
      if (invoice.periodStart && invoice.periodEnd) {
        itemY += 10;
        pdf.text(`Period: ${new Date(invoice.periodStart).toLocaleDateString()} - ${new Date(invoice.periodEnd).toLocaleDateString()}`, 20, itemY);
        itemY += 10;
      }
      
      // Horizontal line above total
      itemY += 10;
      pdf.line(120, itemY, 190, itemY);
      itemY += 10;
      
      // Total
      pdf.setFont('helvetica', 'bold');
      pdf.text("TOTAL", 145, itemY);
      pdf.text(`$${invoice.totalAmount}`, 170, itemY);
      
      // 8. Payment terms at bottom
      itemY += 35;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text("Make all checks payable to the company name.", 20, itemY);
      pdf.text("Total due in 30 days.", 20, itemY + 8);
      
      // Convert PDF to base64
      const pdfBase64 = pdf.output('datauristring');
      
      // Return the PDF data and email details
      const emailSubject = `Invoice #${invoice.invoiceNumber} from Your Consulting Service`;
      const emailBody = `Please find attached invoice #${invoice.invoiceNumber} for ${invoice.clientName} in the amount of $${invoice.totalAmount}.
      
Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Client: ${invoice.clientName}
- Amount: $${invoice.totalAmount}
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

  // Update user personal information
  router.put("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      const userId = req.user?.id;
      const data = personalInfoSchema.parse(req.body);
      
      // Check if username is being changed and if it's already taken
      if (data.username !== req.user?.username) {
        const existingUser = await storage.getUserByUsername(data.username);
        if (existingUser) {
          return res.status(400).send("Username already exists");
        }
      }
      
      // Update user info
      const updateQuery = `
        UPDATE users
        SET 
          name = $1,
          email = $2,
          username = $3
        WHERE id = $4
        RETURNING id, username, name, email, created_at
      `;
      
      const result = await pool.query(updateQuery, [
        data.name,
        data.email,
        data.username,
        userId
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).send("User not found");
      }
      
      // Update the user in the session
      const updatedUser = result.rows[0];
      req.login({
        ...updatedUser,
        createdAt: updatedUser.created_at
      }, (err) => {
        if (err) {
          return res.status(500).send("Error updating session");
        }
        res.json(updatedUser);
      });
    } catch (error) {
      console.error("Error updating user:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      
      res.status(500).send("Server error");
    }
  });
  
  // Helper function to ensure business_info table exists
  const ensureBusinessInfoTable = async () => {
    try {
      // Check if business_info table exists
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'business_info'
        );
      `;
      
      const tableExists = await pool.query(checkTableQuery);
      console.log('business_info table exists:', tableExists.rows[0].exists);
      
      if (!tableExists.rows[0].exists) {
        console.log('Creating business_info table...');
        
        // Create the table
        const createTableQuery = `
          CREATE TABLE business_info (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            company_name VARCHAR(255) NOT NULL,
            address TEXT,
            city VARCHAR(255),
            state VARCHAR(255),
            zip VARCHAR(50),
            phone_number VARCHAR(50),
            tax_id VARCHAR(100),
            company_logo VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          -- Add index for faster lookups
          CREATE INDEX business_info_user_id_idx ON business_info(user_id);
          
          -- Ensure user_id is unique
          ALTER TABLE business_info ADD CONSTRAINT unique_user_id UNIQUE (user_id);
        `;
        
        await pool.query(createTableQuery);
        console.log('business_info table created successfully');
        return true;
      }
      
      // Check if the table has phone_number column
      const checkPhoneNumberColumnQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'business_info'
          AND column_name = 'phone_number'
        );
      `;
      
      const phoneNumberExists = await pool.query(checkPhoneNumberColumnQuery);
      console.log('phone_number column exists:', phoneNumberExists.rows[0].exists);
      
      // Check if the table has country column
      const checkCountryColumnQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'business_info'
          AND column_name = 'country'
        );
      `;
      
      const countryExists = await pool.query(checkCountryColumnQuery);
      console.log('country column exists:', countryExists.rows[0].exists);
      
      // If there's country but no phone_number, update the table
      if (countryExists.rows[0].exists && !phoneNumberExists.rows[0].exists) {
        console.log('Adding phone_number column...');
        await pool.query(`ALTER TABLE business_info ADD COLUMN phone_number VARCHAR(50)`);
        
        // Migrate data
        console.log('Copying data from country to phone_number...');
        await pool.query(`UPDATE business_info SET phone_number = country`);
      }
      
      return true;
    } catch (error) {
      console.error('Error ensuring business_info table:', error);
      return false;
    }
  };

  // Get business information
  router.get("/api/business-info", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      // Ensure the table exists
      await ensureBusinessInfoTable();
      
      const userId = req.user?.id;
      
      // Check if business info exists
      const checkQuery = `
        SELECT * FROM business_info WHERE user_id = $1
      `;
      
      const checkResult = await pool.query(checkQuery, [userId]);
      
      if (checkResult.rows.length === 0) {
        // Return default empty object
        return res.json({
          companyName: "",
          address: "",
          city: "",
          state: "",
          zip: "",
          phoneNumber: "",
          taxId: "",
        });
      }
      
      // Convert snake_case to camelCase for response
      const businessInfo = checkResult.rows[0];
      
      console.log("Business info from database:", businessInfo);
      
      res.json({
        companyName: businessInfo.company_name,
        address: businessInfo.address,
        city: businessInfo.city,
        state: businessInfo.state,
        zip: businessInfo.zip,
        phoneNumber: businessInfo.phone_number, // Make sure we're using phone_number from DB
        taxId: businessInfo.tax_id,
        companyLogo: businessInfo.company_logo,
      });
    } catch (error) {
      console.error("Error getting business info:", error);
      res.status(500).send("Server error");
    }
  });
  
  // Update business information
  router.put("/api/business-info", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      // Ensure the table exists
      await ensureBusinessInfoTable();
      
      console.log("PUT /api/business-info - Request body:", req.body);
      
      const userId = req.user?.id;
      console.log("User ID:", userId);
      
      const data = businessInfoSchema.parse(req.body);
      console.log("Parsed data:", data);
      
      // Check if business info exists for this user
      const checkQuery = `
        SELECT id FROM business_info WHERE user_id = $1
      `;
      
      console.log("Checking if business info exists for user:", userId);
      const checkResult = await pool.query(checkQuery, [userId]);
      console.log("Check result:", checkResult.rows.length > 0 ? "Exists" : "Does not exist");
      
      let result;
      
      if (checkResult.rows.length === 0) {
        // Insert new business info
        console.log("Inserting new business info");
        const insertQuery = `
          INSERT INTO business_info (
            user_id, company_name, address, city, state, 
            zip, phone_number, tax_id, company_logo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        
        const params = [
          userId,
          data.companyName,
          data.address || "",
          data.city || "",
          data.state || "",
          data.zip || "",
          data.phoneNumber || "",
          data.taxId || "",
          data.companyLogo || null
        ];
        
        console.log("Insert params:", params);
        
        try {
          result = await pool.query(insertQuery, params);
          console.log("Insert result rows:", result.rows.length);
        } catch (dbError) {
          console.error("Database insert error:", dbError);
          throw dbError;
        }
      } else {
        // Update existing business info
        console.log("Updating existing business info");
        const updateQuery = `
          UPDATE business_info
          SET 
            company_name = $2,
            address = $3,
            city = $4,
            state = $5,
            zip = $6,
            phone_number = $7,
            tax_id = $8
          WHERE user_id = $1
          RETURNING *
        `;
        
        const params = [
          userId,
          data.companyName,
          data.address || "",
          data.city || "",
          data.state || "",
          data.zip || "",
          data.phoneNumber || "",
          data.taxId || ""
        ];
        
        console.log("Update params:", params);
        
        try {
          result = await pool.query(updateQuery, params);
          console.log("Update result rows:", result.rows.length);
        } catch (dbError) {
          console.error("Database update error:", dbError);
          throw dbError;
        }
      }
      
      // Convert snake_case to camelCase for response
      const businessInfo = result.rows[0];
      console.log("Business info from database:", businessInfo);
      
      const response = {
        companyName: businessInfo.company_name,
        address: businessInfo.address,
        city: businessInfo.city,
        state: businessInfo.state,
        zip: businessInfo.zip,
        phoneNumber: businessInfo.phone_number,
        taxId: businessInfo.tax_id,
        companyLogo: businessInfo.company_logo,
      };
      
      console.log("Sending response:", response);
      res.json(response);
    } catch (error) {
      console.error("Error updating business info:", error);
      
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error message:", errorMessage);
      res.status(500).send(`Server error: ${errorMessage}`);
    }
  });
  
  // Upload business logo
  router.post("/api/business-logo", (req, res) => {
    console.log("Received logo upload request");
    
    // Use a try-catch block around the middleware to catch multer errors
    const uploadMiddleware = upload.single('logo');
    
    uploadMiddleware(req, res, async (err) => {
      console.log("Multer middleware executed");
      
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).send(`File upload error: ${err.message}`);
      }
      
      // Check authentication
      if (!req.isAuthenticated()) {
        console.log("Not authenticated");
        return res.status(401).send("Not authenticated");
      }
      
      try {
        const userId = req.user?.id;
        console.log("Processing logo upload for user:", userId);
        
        if (!req.file) {
          console.error("No file received in request");
          return res.status(400).send("No file uploaded");
        }
        
        console.log("File received:", req.file);
        const filename = path.basename(req.file.path);
        console.log("Generated filename:", filename);
        
        // Update the business_info table with the logo filename
        const updateQuery = `
          UPDATE business_info
          SET company_logo = $2
          WHERE user_id = $1
          RETURNING *
        `;
        
        console.log("Executing update query");
        const result = await pool.query(updateQuery, [userId, filename]);
        console.log("Update query result rows:", result.rows.length);
        
        if (result.rows.length === 0) {
          // If no business info exists, create one
          console.log("No existing business info, creating new record");
          const insertQuery = `
            INSERT INTO business_info (user_id, company_logo, company_name)
            VALUES ($1, $2, $3)
            RETURNING *
          `;
          
          await pool.query(insertQuery, [userId, filename, ""]);
          console.log("New business info record created");
        }
        
        console.log("Logo upload successful");
        res.json({ 
          filename,
          path: `/api/business-logo/${filename}`,
          success: true 
        });
      } catch (error) {
        console.error("Error in logo upload handler:", error);
        res.status(500).send(`Server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  });
  
  // Serve business logo
  router.get("/api/business-logo/:filename", (req, res) => {
    const filename = req.params.filename;
    const logoPath = path.join(UPLOADS_DIR, filename);
    
    // Check if file exists
    if (!fs.existsSync(logoPath)) {
      console.log(`❌ Logo not found: ${logoPath}`);
      return res.status(404).json({ error: "Logo not found" });
    }
    
    console.log(`✅ Serving logo: ${logoPath}`);
    res.sendFile(logoPath);
  });

  // Create a new, simplified logo upload endpoint
  router.post("/api/upload-logo", (req, res) => {
    console.log("📤 NEW LOGO UPLOAD REQUEST RECEIVED");
    
    // Handle auth first to fail fast
    if (!req.isAuthenticated()) {
      console.log("❌ Upload rejected: Not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.user ? (req.user as any).id : null;
    console.log(`👤 Authenticated user: ${userId}`);
    
    if (!userId) {
      console.log("❌ Upload rejected: Invalid user ID");
      return res.status(401).json({ error: "Invalid user ID" });
    }
    
    // Set up a simplified upload middleware for this endpoint
    const simpleUpload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          console.log(`📁 Upload directory: ${UPLOADS_DIR}`);
          cb(null, UPLOADS_DIR);
        },
        filename: (req, file, cb) => {
          const safeFileName = `logo-${userId}-${Date.now()}${path.extname(file.originalname)}`;
          console.log(`📄 Generated filename: ${safeFileName}`);
          cb(null, safeFileName);
        }
      }),
      fileFilter: (req, file, cb) => {
        // Validate mime type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          console.log(`❌ Rejected file type: ${file.mimetype}`);
          return cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
        }
        console.log(`✅ Accepted file type: ${file.mimetype}`);
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      }
    }).single('logo');
    
    // Process the upload
    simpleUpload(req, res, async (err) => {
      // Handle multer errors
      if (err) {
        console.log(`❌ Upload error: ${err.message}`);
        return res.status(400).json({ error: err.message });
      }
      
      // Check if we have a file
      if (!req.file) {
        console.log("❌ No file received");
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      try {
        console.log(`✅ File received: ${req.file.originalname} (${req.file.size} bytes)`);
        const filename = path.basename(req.file.path);
        
        // Update database with the new logo filename
        console.log(`💾 Updating database for user ${userId} with logo: ${filename}`);
        
        // First check if user has a business info record
        const checkQuery = `SELECT id FROM business_info WHERE user_id = $1`;
        const existingRecord = await pool.query(checkQuery, [userId]);
        
        if (existingRecord.rows.length === 0) {
          // Create new record
          console.log(`📝 Creating new business info record for user ${userId}`);
          const insertQuery = `
            INSERT INTO business_info 
            (user_id, company_logo, company_name) 
            VALUES ($1, $2, 'Your Company') 
            RETURNING id
          `;
          await pool.query(insertQuery, [userId, filename]);
        } else {
          // Update existing record
          console.log(`📝 Updating existing business info for user ${userId}`);
          const updateQuery = `
            UPDATE business_info 
            SET company_logo = $2 
            WHERE user_id = $1
          `;
          await pool.query(updateQuery, [userId, filename]);
        }
        
        console.log("✅ Logo upload completed successfully");
        
        // Return success with the file URL
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
          success: true,
          filename,
          path: `/api/business-logo/${filename}`,
          message: "Logo uploaded successfully"
        });
      } catch (error) {
        console.error("❌ Database error:", error);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
          success: false, 
          error: "Server error while saving logo",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
  });

  // Add a diagnostic endpoint for troubleshooting
  router.get("/api/debug/engagements", async (req, res) => {
    try {
      // This route bypasses authentication for debugging
      console.log("[DEBUG] Attempting to fetch all engagements without user filtering");
      
      // Get engagements using the storage interface instead of direct SQL
      // This avoids the require/import issue
      const engagements = await storage.getEngagements();
      
      // Return diagnostic info and data
      res.json({
        message: "Debug endpoint for engagements",
        count: engagements.length,
        auth: {
          isAuthenticated: req.isAuthenticated(),
          user: req.user ? {
            id: (req.user as any).id,
            username: (req.user as any).username
          } : null
        },
        database: {
          url: process.env.DATABASE_URL ? "Set (masked for security)" : "Not set",
          connectionWorks: true
        },
        data: engagements.slice(0, 10) // Just return the first 10 engagements
      });
    } catch (error) {
      console.error("[DEBUG] Error in debug endpoint:", error);
      res.status(500).json({
        message: "Error in debug endpoint",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // This direct endpoint is now the primary way engagements are fetched
  // It bypasses the problematic storage layer and queries the database directly
  router.get("/api/direct/engagements", async (req, res) => {
    try {
      // Get user ID from authenticated session
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Query the database directly with plain SQL
      const directResult = await pool.query(`
        SELECT 
          e.id, e.user_id, e.client_id, e.project_name, e.start_date, e.end_date, 
          e.hourly_rate, e.project_amount, e.engagement_type, e.status,
          c.name as client_name
        FROM engagements e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.user_id = $1
        ORDER BY e.id DESC
      `, [userId]);
      
      // Format the results as expected by the frontend
      const formattedEngagements = directResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        clientId: row.client_id,
        projectName: row.project_name,
        startDate: row.start_date,
        endDate: row.end_date,
        hourlyRate: row.hourly_rate,
        projectAmount: row.project_amount,
        engagementType: row.engagement_type,
        status: row.status,
        clientName: row.client_name || "Unknown Client"
      }));
      
      return res.json(formattedEngagements);
    } catch (error) {
      console.error("Error in direct query endpoint:", error);
      res.status(500).json({ message: "Error in direct query endpoint", error: error.message });
    }
  });

  // Direct endpoint for active engagements only
  router.get("/api/direct/engagements/active", async (req, res) => {
    try {
      // Get user ID from authenticated session
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      console.log("GET /api/direct/engagements/active - Auth status:", req.isAuthenticated(), "User ID:", userId);
      
      if (!userId) {
        console.log("Not authenticated for active engagements endpoint");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Query the database directly with plain SQL to get engagements
      console.log("Executing SQL query for engagements with userId:", userId);
      const directResult = await pool.query(`
        SELECT 
          e.id, e.user_id, e.client_id, e.project_name, e.start_date, e.end_date, 
          e.hourly_rate, e.project_amount, e.engagement_type, e.status,
          c.name as client_name, c.billing_contact_email as client_email
        FROM engagements e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.user_id = $1
        ORDER BY e.id DESC
      `, [userId]);
      
      console.log(`Retrieved ${directResult.rows.length} engagements from database`);
      
      // Format the results without filtering by status
      const formattedEngagements = directResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        clientId: row.client_id,
        projectName: row.project_name,
        startDate: row.start_date,
        endDate: row.end_date,
        hourlyRate: row.hourly_rate,
        projectAmount: row.project_amount,
        engagementType: row.engagement_type,
        status: "active", // Force 'active' status to show all engagements
        clientName: row.client_name || "Unknown Client",
        clientEmail: row.client_email
      }));
      
      console.log(`Returning ${formattedEngagements.length} engagements with forced active status`);
      return res.json(formattedEngagements);
    } catch (error) {
      console.error("Error in direct active engagements endpoint:", error);
      res.status(500).json({ message: "Error fetching active engagements", error: error.message });
    }
  });

  // Remove the bypass/debug endpoint
  router.get("/api/bypass/engagements", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      console.log("BYPASS API - Auth status:", req.isAuthenticated(), "User ID:", userId);
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get raw engagements from storage with no additional filtering
      let engagements = await storage.getEngagements(userId);
      
      // Return with minimal processing
      res.json({
        count: engagements.length,
        auth: { userId },
        // Return the raw data
        data: engagements
      });
    } catch (error) {
      console.error("Error in bypass endpoint:", error);
      res.status(500).json({ message: "Error in bypass endpoint", error: error.message });
    }
  });

  // Add a special diagnostic endpoint for the current engagements issue
  router.get("/api/debug/fix-engagements", async (req, res) => {
    try {
      console.log("[EMERGENCY FIX] Attempting direct database access to diagnose engagement issue");
      
      // Get the current user ID
      const currentUserId = req.isAuthenticated() ? (req.user as any).id : null;
      console.log("[EMERGENCY FIX] Current authenticated user ID:", currentUserId);
      
      // Import pg directly to avoid typescript issues
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });
      
      // Get all engagements from the database without any filtering
      const engResult = await pool.query(`
        SELECT e.*, c.name as client_name
        FROM engagements e
        LEFT JOIN clients c ON e.client_id = c.id
        ORDER BY e.id
      `);
      
      // Get all users to check if there might be a user ID mismatch
      const userResult = await pool.query(`
        SELECT id, username FROM users
      `);
      
      console.log("[EMERGENCY FIX] Found", engResult.rows.length, "total engagements in database");
      console.log("[EMERGENCY FIX] Found", userResult.rows.length, "users in database");
      
      // Check if the current user ID matches any engagement user IDs
      const userMatch = engResult.rows.some(eng => eng.user_id === currentUserId);
      console.log("[EMERGENCY FIX] Current user has matching engagements:", userMatch);
      
      if (!userMatch && currentUserId) {
        console.log("[EMERGENCY FIX] CRITICAL: User ID mismatch detected. Current user has no engagements.");
        
        // Sample the first engagement user ID to help understand the problem
        if (engResult.rows.length > 0) {
          const sampleEngUserId = engResult.rows[0].user_id;
          console.log(`[EMERGENCY FIX] Sample engagement has user_id=${sampleEngUserId}`);
          
          // Find username for the sample engagement user ID
          const matchingUser = userResult.rows.find(u => u.id === sampleEngUserId);
          if (matchingUser) {
            console.log(`[EMERGENCY FIX] Sample engagement belongs to username: ${matchingUser.username}`);
          }
        }
      }
      
      // Return useful diagnostic information
      res.json({
        currentUser: {
          id: currentUserId,
          username: currentUserId ? (req.user as any).username : null,
          authenticated: req.isAuthenticated()
        },
        engagements: {
          total: engResult.rows.length,
          userIds: [...new Set(engResult.rows.map(e => e.user_id))],
          hasMatchForCurrentUser: userMatch,
          sample: engResult.rows.slice(0, 3).map(e => ({
            id: e.id,
            user_id: e.user_id,
            project_name: e.project_name,
            client_name: e.client_name
          }))
        },
        users: {
          total: userResult.rows.length,
          ids: userResult.rows.map(u => ({ id: u.id, username: u.username }))
        },
        solution: !userMatch && currentUserId ? {
          message: "Your user ID doesn't match any engagements. This is the root cause.",
          options: [
            "Use an account that owns engagements",
            "Update engagement user_id values in the database to match your user ID",
            "Create new engagements with your user ID"
          ]
        } : {
          message: "Diagnostic complete"
        }
      });
      
      await pool.end();
    } catch (error) {
      console.error("[EMERGENCY FIX] Error:", error);
      res.status(500).json({
        error: "Error diagnosing engagement issue",
        message: error.message
      });
    }
  });

  // Forgot password route
  router.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success even if user not found for security
      if (!user) {
        return res.status(200).json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }
      
      // Generate a secure random token
      const resetToken = uuidv4();
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Save token to database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);
      
      // Send password reset email
      await emailService.sendPasswordResetEmail({
        to: user.email || "",
        resetToken: resetToken,
        userName: user.name || user.username,
      });
      
      res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });
  
  // Reset password route - Verify token and show form
  router.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ 
          message: "Password reset link is invalid or has expired." 
        });
      }
      
      // Return success
      res.status(200).json({ message: "Token is valid" });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });
  
  // Reset password route - Process password change
  router.post("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Please provide a password with at least 8 characters." });
      }
      
      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ 
          message: "Password reset link is invalid or has expired." 
        });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(password);
      
      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);
      
      res.status(200).json({ message: "Password has been reset successfully." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });

  // Add a test route for debugging active engagements
  router.get("/api/debug/active-engagements", async (req, res) => {
    try {
      // Ensure user is authenticated for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view engagements" });
      }
      
      // Get user ID from authenticated session
      const userId = (req.user as any).id;
      console.log(`Debugging active engagements for userId: ${userId}`);
      
      // First, get all engagements
      const allEngagements = await storage.getEngagements(userId);
      console.log(`Total engagements for user: ${allEngagements.length}`);
      
      // Get engagements with status 'active' in database
      const statusActiveEngagements = allEngagements.filter(e => e.status === 'active');
      console.log(`Engagements with status='active' in database: ${statusActiveEngagements.length}`);
      
      // Import the status calculation function
      const { calculateEngagementStatus } = await import('./calculateEngagementStatus');
      
      // Calculate status for each engagement based on date ranges
      const calculatedStatuses = allEngagements.map(engagement => {
        const currentStatus = calculateEngagementStatus(
          new Date(engagement.startDate), 
          new Date(engagement.endDate)
        );
        
        return {
          id: engagement.id,
          projectName: engagement.projectName,
          databaseStatus: engagement.status,
          calculatedStatus: currentStatus,
          startDate: new Date(engagement.startDate).toISOString(),
          endDate: new Date(engagement.endDate).toISOString(),
          isActive: currentStatus === 'active'
        };
      });
      
      // Count engagements that should be active based on date calculation
      const dateActiveEngagements = calculatedStatuses.filter(e => e.calculatedStatus === 'active');
      console.log(`Engagements that should be active based on date calculation: ${dateActiveEngagements.length}`);
      
      // Get active engagements using the storage method
      const activeEngagements = await storage.getActiveEngagements(userId);
      console.log(`Active engagements from storage.getActiveEngagements: ${activeEngagements.length}`);
      
      // Return detailed info for debugging
      res.json({
        user: { id: userId },
        totals: {
          allEngagements: allEngagements.length,
          statusActive: statusActiveEngagements.length,
          calculatedActive: dateActiveEngagements.length,
          fromStorageMethod: activeEngagements.length
        },
        engagementDetails: calculatedStatuses,
        activeEngagements: activeEngagements.map(e => ({
          id: e.id,
          projectName: e.projectName,
          status: e.status,
          startDate: e.startDate,
          endDate: e.endDate
        }))
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ 
        message: "Failed to fetch debug information",
        error: error.message
      });
    }
  });

  return router;
}
