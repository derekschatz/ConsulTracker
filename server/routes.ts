import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEngagementSchema, 
  insertTimeLogSchema, 
  insertInvoiceSchema,
  insertClientSchema,
  calculateEngagementStatus,
  type Invoice,
  type InvoiceWithLineItems,
  type InvoiceLineItem
} from "@shared/schema";
import { setupAuth } from "./auth";
import { z } from "zod";
import nodemailer from "nodemailer";
import { format, parse, isValid, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from 'date-fns';
import { pool } from './db';
import rateLimit from 'express-rate-limit';
import express from 'express';
import { ServerError } from './serverError';
import fs from 'fs';

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // prefix all routes with /api

  // Engagement routes
  app.get("/api/engagements", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Get engagements filtered by userId if authenticated
      let engagements = await storage.getEngagements(userId);
      
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

  app.get("/api/engagements/active", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      let engagements = await storage.getActiveEngagements(userId);
      
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
        clientName: engagement.client?.name || engagement.clientName || ""
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
      
      // Check authentication
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
      
      const validationResult = insertEngagementSchema.partial().safeParse(processedData);
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
        const currentEngagement = await storage.getEngagement(id, userId);
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

      const updatedEngagement = await storage.updateEngagement(id, inputData, userId);
      if (!updatedEngagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      
      console.log("Updated engagement:", updatedEngagement);
      res.json(updatedEngagement);
    } catch (error) {
      console.error("Failed to update engagement:", error);
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
  app.get("/api/time-logs", async (req, res) => {
    try {
      // Get user ID from authenticated session if available
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      const engagementId = req.query.engagementId ? Number(req.query.engagementId) : undefined;
      const clientName = req.query.client as string | undefined;
      const dateRange = req.query.dateRange as string | undefined;
      const startDateParam = req.query.startDate as string | undefined;
      const endDateParam = req.query.endDate as string | undefined;
      const search = req.query.search as string | undefined;

      console.log('Time log request params:', {
        userId,
        engagementId,
        clientName,
        dateRange,
        startDate: startDateParam,
        endDate: endDateParam,
        search
      });
      
      let timeLogs;
      let startDate, endDate;

      // Helper function to ensure we have valid dates
      const createValidDate = (dateStr: string | undefined): Date | null => {
        if (!dateStr) return null;
        
        try {
          const date = new Date(dateStr);
          // Check if date is valid
          if (isNaN(date.getTime())) {
            console.log(`Invalid date string: ${dateStr}`);
            return null;
          }
          return date;
        } catch (error) {
          console.error(`Error parsing date: ${dateStr}`, error);
          return null;
        }
      };
      
      if (dateRange === 'all') {
        // Special case - fetch all time logs without date filtering
        console.log('Using all date range - not applying date filters');
        timeLogs = await storage.getTimeLogs(userId);
      } else if (startDateParam && endDateParam) {
        // Use explicit date parameters, ensuring they're valid
        startDate = createValidDate(startDateParam);
        endDate = createValidDate(endDateParam);
        
        // Fall back to a predefined range if dates are invalid
        if (!startDate || !endDate) {
          console.log('Invalid date parameters, using month range instead');
          const range = getDateRange('month');
          startDate = range.startDate;
          endDate = range.endDate;
        } else {
          console.log('Using explicit date range:', startDate, 'to', endDate);
        }
      } else if (dateRange && dateRange !== 'all') {
        // Use predefined date range
        const range = getDateRange(dateRange);
        startDate = range.startDate;
        endDate = range.endDate;
        console.log('Using date range:', dateRange, startDate, 'to', endDate);
      } else {
        // Default to all time logs for this user
        timeLogs = await storage.getTimeLogs(userId);
        console.log('Getting all time logs for user');
      }

      // Get logs filtered by date range if we have dates
      if (startDate && endDate) {
        timeLogs = await storage.getTimeLogsByDateRange(startDate, endDate, userId);
      } else if (engagementId) {
        // Filter by specific engagement ID
        timeLogs = await storage.getTimeLogsByEngagement(engagementId, userId);
      } else if (!timeLogs) {
        // If we haven't loaded logs yet, get all of them
        timeLogs = await storage.getTimeLogs(userId);
      }
      
      // If client filter is applied, filter the results by client name
      if (timeLogs && clientName && clientName !== 'all') {
        timeLogs = timeLogs.filter(log => log.engagement.clientName === clientName);
      }

      // Apply search filter if present
      if (timeLogs && search) {
        const searchLower = search.toLowerCase();
        timeLogs = timeLogs.filter(log => 
          (log.description ? log.description.toLowerCase().includes(searchLower) : false) ||
          log.engagement.clientName.toLowerCase().includes(searchLower) ||
          log.engagement.projectName.toLowerCase().includes(searchLower)
        );
      }

      // Ensure we only return time logs for the specified engagement
      if (engagementId) {
        timeLogs = timeLogs.filter(log => log.engagementId === engagementId);
      }

      // Sort time logs by date in descending order
      if (timeLogs) {
        timeLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      // IMPORTANT: Sanitize all time log descriptions to ensure consistency
      if (timeLogs) {
        console.log(`Sanitizing ${timeLogs.length} time logs before sending to client`);
        
        timeLogs = timeLogs.map(log => {
          // Check if the description is empty or whitespace only
          if (log.description === '' || (log.description && log.description.trim() === '')) {
            console.log(`Fixing empty description for time log ${log.id}`);
            return {
              ...log,
              description: null
            };
          }
          return log;
        });
        
        // Log a sample of the sanitized time logs
        if (timeLogs.length > 0) {
          console.log(`Sample sanitized time log (ID ${timeLogs[0].id}):`, {
            id: timeLogs[0].id,
            description: timeLogs[0].description,
            descriptionType: typeof timeLogs[0].description
          });
        }
      }

      res.json(timeLogs || []);
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
        periodEnd
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
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      // Calculate start and end of current month
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      
      console.log(`Getting dashboard stats for userId: ${userId}`);
      console.log(`Time period: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);

      // Get stats in parallel
      const [
        activeEngagements,
        ytdRevenue,
        monthlyHours,
        pendingInvoicesTotal
      ] = await Promise.all([
        storage.getActiveEngagements(userId),
        storage.getYtdRevenue(currentYear, userId),
        storage.getTotalHoursLogged(startOfMonth, endOfMonth, userId),
        storage.getPendingInvoicesTotal(userId)
      ]);

      console.log(`Dashboard stats results for user ${userId}:
        - Active engagements: ${activeEngagements.length}
        - YTD revenue: ${ytdRevenue}
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
      
      // Add invoice details to PDF
      pdf.setFontSize(16);
      pdf.text(`INVOICE #${invoice.invoiceNumber}`, 105, 20, { align: 'center' });
      
      // Client section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text("Bill To:", 20, 40);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${invoice.clientName}`, 20, 50);
      
      // Add billing information if available
      let yPos = 60;
      if (invoice.billingContactName) {
        pdf.text(`ATTN: ${invoice.billingContactName}`, 20, yPos);
        yPos += 10;
      }
      
      if (invoice.billingAddress) {
        pdf.text(invoice.billingAddress, 20, yPos);
        yPos += 10;
      }
      
      // Add city, state, zip on same line if available
      const addressLine = [
        invoice.billingCity,
        invoice.billingState,
        invoice.billingZip
      ].filter(Boolean).join(", ");
      
      if (addressLine) {
        pdf.text(addressLine, 20, yPos);
        yPos += 10;
      }
      
      if (invoice.billingCountry) {
        pdf.text(invoice.billingCountry, 20, yPos);
        yPos += 10;
      }
      
      if (invoice.billingContactEmail) {
        pdf.text(invoice.billingContactEmail, 20, yPos);
        yPos += 10;
      }
      
      // Invoice dates and amounts on the right side
      pdf.text(`Amount: $${invoice.totalAmount}`, 140, 50);
      pdf.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 140, 60);
      pdf.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 140, 70);
      
      // Line items table - adjust starting position based on billing info
      yPos = Math.max(yPos + 10, 90); // Make sure we don't overlap with previous content
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text("Service Items:", 20, yPos);
      
      yPos += 10;
      
      // Table header
      pdf.setFontSize(10);
      pdf.text("Description", 20, yPos);
      pdf.text("Hours", 120, yPos);
      pdf.text("Rate", 140, yPos);
      pdf.text("Amount", 170, yPos);
      
      yPos += 10;
      
      // Create a default line item from the invoice total if no line items exist
      const defaultLineItems: InvoiceLineItem[] = [{
        invoiceId: invoice.id,
        description: `Services for ${invoice.projectName || 'project'}`,
        hours: Number(invoice.totalHours),
        rate: Number(invoice.totalAmount) / Number(invoice.totalHours),
        amount: Number(invoice.totalAmount)
      }];
      
      // Use either the existing lineItems if available, or the default line item
      const itemsToDisplay = (invoice as InvoiceWithLineItems).lineItems || defaultLineItems;
      
      // Table data
      itemsToDisplay.forEach(item => {
        pdf.text(item.description.substring(0, 50), 20, yPos);
        pdf.text(item.hours.toString(), 120, yPos);
        pdf.text(`$${typeof item.rate === 'string' ? item.rate : item.rate.toFixed(2)}`, 140, yPos);
        pdf.text(`$${typeof item.amount === 'string' ? item.amount : item.amount.toFixed(2)}`, 170, yPos);
        yPos += 10;
      });
      
      // Total
      yPos += 10;
      pdf.text(`Total Amount: $${invoice.totalAmount}`, 120, yPos);
      
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

  const httpServer = createServer(app);
  return httpServer;
}

export function createRouter(storage: DatabaseStorage): Router {
  const router = express.Router();
  
  // ... existing code ...

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

  // ... existing code ...

  return router;
}
