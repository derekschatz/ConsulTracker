import {
  type Client, type InsertClient,
  type Engagement, type InsertEngagement,
  type TimeLog, type InsertTimeLog,
  type Invoice, type InsertInvoice, type InvoiceWithLineItems,
  type TimeLogWithEngagement,
  type User, type InsertUser,
  engagements, timeLogs, invoices, users, clients,
  passwordResetTokens,
  type PasswordResetToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, SQL, gt } from "drizzle-orm";
import * as expressSession from "express-session";
import pgSimpleModule from "connect-pg-simple";
import { pool } from "./db";
import { type PgColumn } from "drizzle-orm/pg-core";
import fs from 'fs';
import { Pool } from "pg";

// Create connect-pg-simple after import
const connectPgSimple = pgSimpleModule(expressSession);

// Modify the interface with any CRUD methods
export interface IStorage {
  // Authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clients
  getClients(userId?: number): Promise<Client[]>;
  getClient(id: number, userId?: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>, userId?: number): Promise<Client | undefined>;
  deleteClient(id: number, userId?: number): Promise<boolean>;
  
  // Engagements
  getEngagements(userId?: number): Promise<Engagement[]>;
  getEngagement(id: number, userId?: number): Promise<Engagement | undefined>;
  getEngagementWithClient(id: number, userId?: number): Promise<Engagement | undefined>;
  getActiveEngagements(userId?: number): Promise<Engagement[]>;
  createEngagement(engagement: InsertEngagement): Promise<Engagement>;
  updateEngagement(id: number, engagement: Partial<InsertEngagement>, userId?: number): Promise<Engagement | undefined>;
  deleteEngagement(id: number, userId?: number): Promise<boolean>;

  // Time Logs
  getTimeLogs(userId?: number): Promise<TimeLogWithEngagement[]>;
  getTimeLogsByEngagement(engagementId: number, userId?: number): Promise<TimeLogWithEngagement[]>;
  getTimeLogsByDateRange(startDate: Date, endDate: Date, userId?: number): Promise<TimeLogWithEngagement[]>;
  getTimeLog(id: number, userId?: number): Promise<TimeLogWithEngagement | undefined>;
  createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog>;
  updateTimeLog(id: number, timeLog: Partial<InsertTimeLog>, userId?: number): Promise<TimeLog | undefined>;
  deleteTimeLog(id: number, userId?: number): Promise<boolean>;

  // Invoices
  getInvoices(userId?: number): Promise<Invoice[]>;
  getInvoice(id: number, userId?: number): Promise<InvoiceWithLineItems | undefined>;
  getInvoicesByStatus(status: string, userId?: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId?: number): Promise<Invoice | undefined>;
  updateInvoiceStatus(id: number, status: string, userId?: number): Promise<Invoice | undefined>;
  deleteInvoice(id: number, userId?: number): Promise<boolean>;

  // Dashboard and Analytics
  getYtdRevenue(year: number, userId?: number): Promise<number>;
  getMonthlyRevenueBillable(year: number, userId?: number): Promise<{month: number, revenue: number, billableHours: number}[]>;
  getTotalHoursLogged(startDate: Date, endDate: Date, userId?: number): Promise<number>;
  getPendingInvoicesTotal(userId?: number): Promise<number>;
  
  // Session Store
  sessionStore: expressSession.Store;

  // Password reset methods
  getUserByEmail(email: string): Promise<User | undefined>;
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<string>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<boolean>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Session store for authentication
  sessionStore: expressSession.Store;

  constructor() {
    this.sessionStore = new connectPgSimple({
      // @ts-ignore
      pool, // Ignore type error for pool
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Client methods
  async getClients(userId?: number): Promise<Client[]> {
    if (userId !== undefined) {
      return await db.select().from(clients)
        .where(eq(clients.userId, userId))
        .orderBy(clients.name);
    }
    return await db.select().from(clients).orderBy(clients.name);
  }

  async getClient(id: number, userId?: number): Promise<Client | undefined> {
    let query = db.select().from(clients).where(eq(clients.id, id));
    
    if (userId !== undefined) {
      query = db.select().from(clients)
        .where(and(
          eq(clients.id, id),
          eq(clients.userId, userId)
        ));
    }
    
    const results = await query;
    return results.length > 0 ? results[0] : undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    // Ensure all billing fields are properly handled
    const clientData: InsertClient = {
      userId: client.userId,
      name: client.name,
      billingContactName: client.billingContactName || null, 
      billingContactEmail: client.billingContactEmail || null,
      billingAddress: client.billingAddress || null,
      billingCity: client.billingCity || null,
      billingState: client.billingState || null,
      billingZip: client.billingZip || null,
      billingCountry: client.billingCountry || null,
    };

    const [newClient] = await db.insert(clients).values(clientData).returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>, userId?: number): Promise<Client | undefined> {
    // Log to file for debugging
    const logData = `
[${new Date().toISOString()}] UPDATE CLIENT CALLED
ID: ${id}
User ID: ${userId}
Client data: ${JSON.stringify(client, null, 2)}
billingContactName value: ${client.billingContactName}
billingContactName type: ${typeof client.billingContactName}
billingContactEmail value: ${client.billingContactEmail}
billingContactEmail type: ${typeof client.billingContactEmail}
    `;
    
    fs.appendFileSync('client-update-debug.log', logData);
    
    console.log('DIRECT SQL: Updating client with ID:', id);
    console.log('DIRECT SQL: Update data RAW:', client);
    console.log('DIRECT SQL: Update data as JSON:', JSON.stringify(client));
    console.log('DIRECT SQL: User ID filter:', userId);
    
    // Detailed logging of specific fields
    console.log('DIRECT SQL: Detail check of billing fields:');
    console.log('billingContactName:', client.billingContactName, 'type:', typeof client.billingContactName);
    console.log('billingContactEmail:', client.billingContactEmail, 'type:', typeof client.billingContactEmail);
    console.log('billingAddress:', client.billingAddress, 'type:', typeof client.billingAddress);
    
    try {
      // Always update all billing fields with whatever values we have
      // Fix the PostgreSQL empty string to NULL conversion issue
      let query: string;
      let values: any[];
      
      // Process values to prevent NULL conversion
      const processValue = (value: string | null | undefined): string => {
        // Convert null or undefined to empty string
        if (value === null || value === undefined) return '';
        // Return the value as is (already a string)
        return value;
      };
      
      if (userId !== undefined) {
        query = `
          UPDATE clients 
          SET 
            name = $2,
            billing_contact_name = $3,
            billing_contact_email = $4,
            billing_address = $5,
            billing_city = $6,
            billing_state = $7,
            billing_zip = $8,
            billing_country = $9
          WHERE id = $10 AND user_id = $11
          RETURNING *
        `;
        values = [
          id,
          client.name || (await this.getClient(id, userId))?.name || '',
          processValue(client.billingContactName),
          processValue(client.billingContactEmail),
          processValue(client.billingAddress),
          processValue(client.billingCity),
          processValue(client.billingState),
          processValue(client.billingZip),
          processValue(client.billingCountry),
          userId
        ];
      } else {
        query = `
          UPDATE clients 
          SET 
            name = $2,
            billing_contact_name = $3,
            billing_contact_email = $4,
            billing_address = $5,
            billing_city = $6,
            billing_state = $7,
            billing_zip = $8,
            billing_country = $9
          WHERE id = $1 AND user_id = $10
          RETURNING *
        `;
        values = [
          id,
          client.name || (await this.getClient(id))?.name || '',
          processValue(client.billingContactName),
          processValue(client.billingContactEmail),
          processValue(client.billingAddress),
          processValue(client.billingCity),
          processValue(client.billingState),
          processValue(client.billingZip),
          processValue(client.billingCountry),
          userId
        ];
      }
      
      // Log to file for debugging
      fs.appendFileSync('client-update-debug.log', `
Query: ${query}
Values: ${JSON.stringify(values, null, 2)}
      `);
      
      console.log('DIRECT SQL: Executing query:', query);
      console.log('DIRECT SQL: With values:', values);
      
      // Detailed logging of prepared values
      console.log('DIRECT SQL: Prepared values detail check:');
      console.log('Value for billing_contact_name:', values[2], 'type:', typeof values[2]);
      console.log('Value for billing_contact_email:', values[3], 'type:', typeof values[3]);
      console.log('Value for billing_address:', values[4], 'type:', typeof values[4]);
      
      // Execute the query directly using pool
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        console.log('DIRECT SQL: No rows updated');
        fs.appendFileSync('client-update-debug.log', `No rows updated\n`);
        return undefined;
      }
      
      // Log result to file
      fs.appendFileSync('client-update-debug.log', `
Result: ${JSON.stringify(result.rows[0], null, 2)}
      `);
      
      console.log('DIRECT SQL: Update successful, result:', result.rows[0]);
      
      // Convert the returned data to our Client type
      const updatedClient: Client = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        name: result.rows[0].name,
        billingContactName: result.rows[0].billing_contact_name || '',
        billingContactEmail: result.rows[0].billing_contact_email || '',
        billingAddress: result.rows[0].billing_address || '',
        billingCity: result.rows[0].billing_city || '',
        billingState: result.rows[0].billing_state || '',
        billingZip: result.rows[0].billing_zip || '',
        billingCountry: result.rows[0].billing_country || ''
      };
      
      return updatedClient;
    } catch (error) {
      console.error('DIRECT SQL: Error updating client:', error);
      throw error;
    }
  }

  async deleteClient(id: number, userId?: number): Promise<boolean> {
    // Build the delete query
    const query = db.delete(clients);
    
    // Add appropriate where conditions
    if (userId !== undefined) {
      await query.where(and(eq(clients.id, id), eq(clients.userId, userId)));
    } else {
      await query.where(eq(clients.id, id));
    }
    
    return true; // Assuming success if no error thrown
  }

  // Engagement methods
  async getEngagements(userId?: number): Promise<Engagement[]> {
    try {
      console.log('Storage.getEngagements called with userId:', userId);
      
      // Add explicit query debugging
      const queryCondition = userId 
        ? `with userId=${userId} filter` 
        : 'without userId filter (should return all engagements)';
      console.log(`Building query ${queryCondition}`);
      
      const query = userId !== undefined
        ? db.select({
            id: engagements.id,
            userId: engagements.userId,
            clientId: engagements.clientId,
            projectName: engagements.projectName,
            startDate: engagements.startDate,
            endDate: engagements.endDate,
            hourlyRate: engagements.hourlyRate,
            projectAmount: engagements.projectAmount,
            engagementType: engagements.engagementType,
            description: engagements.description,
            status: engagements.status,
            clientName: clients.name,
            clientEmail: clients.billingContactEmail,
            netTerms: engagements.netTerms,
          })
          .from(engagements)
          .leftJoin(clients, eq(engagements.clientId, clients.id))
          .where(eq(engagements.userId, userId))
        : db.select({
            id: engagements.id,
            userId: engagements.userId,
            clientId: engagements.clientId,
            projectName: engagements.projectName,
            startDate: engagements.startDate,
            endDate: engagements.endDate,
            hourlyRate: engagements.hourlyRate,
            projectAmount: engagements.projectAmount,
            engagementType: engagements.engagementType,
            description: engagements.description,
            status: engagements.status,
            clientName: clients.name,
            clientEmail: clients.billingContactEmail,
            netTerms: engagements.netTerms,
          })
          .from(engagements)
          .leftJoin(clients, eq(engagements.clientId, clients.id));

      // Execute the ORM query
      const result = await query;
      console.log(`ORM query returned ${result.length} engagements`);
      
      // Log some sample data if available
      if (result.length > 0) {
        console.log('First engagement sample:', {
          id: result[0].id,
          projectName: result[0].projectName,
          clientName: result[0].clientName,
          userId: result[0].userId
        });
      } else {
        console.log('No engagements found in database query.');
        
        // Try to determine why no engagements were found
        if (userId) {
          console.log(`Check if user ID ${userId} has any engagements in the database.`);
          console.log('Possible issues:');
          console.log('1. User has no engagements created yet');
          console.log('2. Engagements exist but have a different userId');
          console.log('3. Database connection issue');
        } else {
          console.log('Querying without userId filter but still found no engagements.');
          console.log('Database might be empty or there could be a connection issue.');
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching engagements:", error);
      return [];
    }
  }

  async getEngagement(id: number, userId?: number): Promise<Engagement | undefined> {
    try {
      // If userId is provided, only fetch engagements belonging to that user for security
      const baseQuery = {
        id: engagements.id,
        userId: engagements.userId,
        clientId: engagements.clientId,
        projectName: engagements.projectName,
        startDate: engagements.startDate,
        endDate: engagements.endDate,
        hourlyRate: engagements.hourlyRate,
        projectAmount: engagements.projectAmount,
        engagementType: engagements.engagementType,
        description: engagements.description,
        status: engagements.status,
        netTerms: engagements.netTerms
      };

      // Create query condition based on whether userId is provided
      const whereCondition = userId !== undefined
        ? and(eq(engagements.id, id), eq(engagements.userId, userId))
        : eq(engagements.id, id);

      const query = db
        .select(baseQuery)
        .from(engagements)
        .where(whereCondition);

      const results = await query;
      
      if (results.length === 0) {
        return undefined;
      }
      
      return results[0] as Engagement;
    } catch (error) {
      console.error(`Error fetching engagement with id ${id}:`, error);
      return undefined;
    }
  }

  async getActiveEngagements(userId?: number): Promise<Engagement[]> {
    try {
      const query = userId
        ? db.select({
            id: engagements.id,
            userId: engagements.userId,
            clientId: engagements.clientId,
            projectName: engagements.projectName,
            startDate: engagements.startDate,
            endDate: engagements.endDate,
            hourlyRate: engagements.hourlyRate,
            projectAmount: engagements.projectAmount,
            engagementType: engagements.engagementType,
            description: engagements.description,
            status: engagements.status,
            clientName: clients.name,
            clientEmail: clients.billingContactEmail,
            netTerms: engagements.netTerms,
          })
          .from(engagements)
          .leftJoin(clients, eq(engagements.clientId, clients.id))
          .where(and(
            eq(engagements.userId, userId),
            eq(engagements.status, "active")
          ))
        : db.select({
            id: engagements.id,
            userId: engagements.userId,
            clientId: engagements.clientId,
            projectName: engagements.projectName,
            startDate: engagements.startDate,
            endDate: engagements.endDate,
            hourlyRate: engagements.hourlyRate,
            projectAmount: engagements.projectAmount,
            engagementType: engagements.engagementType,
            description: engagements.description,
            status: engagements.status,
            clientName: clients.name,
            clientEmail: clients.billingContactEmail,
            netTerms: engagements.netTerms,
          })
          .from(engagements)
          .leftJoin(clients, eq(engagements.clientId, clients.id))
          .where(eq(engagements.status, "active"));

      const result = await query;
      return result;
    } catch (error) {
      console.error("Error fetching active engagements:", error);
      return [];
    }
  }

  async createEngagement(engagement: InsertEngagement): Promise<Engagement> {
    // Convert the engagement data to match DB schema
    const dbEngagement: any = {
      userId: engagement.userId,
      clientId: engagement.clientId,
      projectName: engagement.projectName,
      startDate: engagement.startDate,
      endDate: engagement.endDate,
      description: engagement.description || '',
      status: engagement.status || 'active',
      engagementType: engagement.engagementType || 'hourly'
    };
    
    // Add hourlyRate or projectAmount based on engagement type
    if (engagement.engagementType === 'project') {
      dbEngagement.projectAmount = engagement.projectAmount;
      // Set hourlyRate to null for project-based engagements
      dbEngagement.hourlyRate = null;
    } else {
      // For hourly engagements, convert hourlyRate to string for numeric column
      dbEngagement.hourlyRate = engagement.hourlyRate !== null ? String(engagement.hourlyRate) : null;
      dbEngagement.projectAmount = null;
    }
    
    console.log('Preparing to insert engagement with data:', dbEngagement);
    
    try {
      // Use raw SQL to avoid ORM issues with null values
      const query = `
        SELECT insert_engagement(
          $1, -- user_id
          $2, -- client_id
          $3, -- project_name
          $4, -- start_date
          $5, -- end_date
          $6, -- engagement_type
          $7, -- hourly_rate
          $8, -- project_amount
          $9, -- description
          $10 -- status
        ) as result
      `;
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });
      
      const values = [
        dbEngagement.userId,
        dbEngagement.clientId,
        dbEngagement.projectName,
        dbEngagement.startDate,
        dbEngagement.endDate,
        dbEngagement.engagementType,
        dbEngagement.hourlyRate,
        dbEngagement.projectAmount,
        dbEngagement.description,
        dbEngagement.status
      ];
      
      console.log('Executing SQL with values:', values);
      const result = await pool.query(query, values);
      
      // Close the connection
      await pool.end();
      
      if (result.rows.length === 0) {
        throw new Error('Failed to create engagement - no result returned');
      }
      
      console.log('Engagement created successfully:', result.rows[0].result);
      return result.rows[0].result;
    } catch (error) {
      console.error('Failed to create engagement with custom function:', error);
      
      // Fall back to the ORM method if custom function fails
      console.log('Falling back to ORM insert method');
      
      // @ts-ignore - Ignore TypeScript error for type mismatches
      const [newEngagement] = await db.insert(engagements).values(dbEngagement).returning();
      return newEngagement;
    }
  }

  async updateEngagement(id: number, engagement: Partial<InsertEngagement>, userId?: number): Promise<Engagement | undefined> {
    // Convert hourlyRate to string if it exists
    const updateData: Record<string, any> = {};
    
    if (engagement.userId !== undefined) updateData.userId = engagement.userId;
    if (engagement.clientId !== undefined) updateData.clientId = engagement.clientId;
    if (engagement.projectName !== undefined) updateData.projectName = engagement.projectName;
    if (engagement.startDate !== undefined) updateData.startDate = engagement.startDate;
    if (engagement.endDate !== undefined) updateData.endDate = engagement.endDate;
    if (engagement.description !== undefined) updateData.description = engagement.description;
    if (engagement.status !== undefined) updateData.status = engagement.status;
    if (engagement.netTerms !== undefined) updateData.netTerms = engagement.netTerms;
    if (engagement.engagementType !== undefined) updateData.engagementType = engagement.engagementType;
    
    // Handle rate fields based on engagement type
    if (engagement.engagementType === 'project') {
      if (engagement.projectAmount !== undefined) updateData.projectAmount = engagement.projectAmount;
      updateData.hourlyRate = null; // Set hourlyRate to null for project-based engagements
    } else if (engagement.engagementType === 'hourly') {
      if (engagement.hourlyRate !== undefined) updateData.hourlyRate = String(engagement.hourlyRate);
      updateData.projectAmount = null; // Set projectAmount to null for hourly engagements
    } else {
      // If no engagement type specified but rates are updated
      if (engagement.hourlyRate !== undefined) updateData.hourlyRate = String(engagement.hourlyRate);
      if (engagement.projectAmount !== undefined) updateData.projectAmount = engagement.projectAmount;
    }
    
    console.log('Updating engagement with data:', {
      id,
      userId,
      updateData
    });
    
    // @ts-ignore - Ignore condition type errors
    const [updatedEngagement] = await db.update(engagements)
      .set(updateData)
      .where(userId !== undefined 
        ? and(eq(engagements.id, id), eq(engagements.userId, userId))
        : eq(engagements.id, id))
      .returning();
    
    return updatedEngagement;
  }

  async deleteEngagement(id: number, userId?: number): Promise<boolean> {
    let condition: SQL<unknown>;
    
    if (userId !== undefined) {
      // @ts-ignore - SQL typing issue with and()
      condition = and(
        eq(engagements.id, id),
        eq(engagements.userId, userId)
      );
    } else {
      condition = eq(engagements.id, id);
    }
    
    await db.delete(engagements).where(condition);
    return true; // Assuming success if no error thrown
  }

  // Time Logs methods
  async getTimeLogs(userId?: number): Promise<TimeLogWithEngagement[]> {
    try {
      // Create base condition that's always valid
      let conditions = sql`1=1`; // Always true condition as a starting point
      
      // Add user ID condition if provided
      if (userId !== undefined) {
        conditions = sql`${conditions} AND ${timeLogs.userId} = ${userId}`;
      }
      
      // Execute query with proper conditions
      const logs = await db.select({
        id: timeLogs.id,
        userId: timeLogs.userId,
        engagementId: timeLogs.engagementId,
        date: timeLogs.date,
        hours: timeLogs.hours,
        description: timeLogs.description,
        createdAt: timeLogs.createdAt
      })
      .from(timeLogs)
      .where(conditions);
      
      console.log(`Retrieved ${logs.length} time logs (all engagement types)`);
      
      // Add diagnostic logging
      if (logs.length > 0) {
        console.log(`Sample time log:`, logs[0]);
      } else {
        console.log(`No time logs found for conditions:`, conditions);
      }
      
      return Promise.all(logs.map(log => this.enrichTimeLog(log)));
    } catch (error) {
      console.error('Error in getTimeLogs:', error);
      return [];
    }
  }

  async getTimeLogsByEngagement(engagementId: number, userId?: number): Promise<TimeLogWithEngagement[]> {
    try {
      // Create base conditions for the engagement ID
      let conditions = eq(timeLogs.engagementId, engagementId);
      
      // Add user ID condition if provided
      if (userId !== undefined) {
        conditions = sql`${conditions} AND ${timeLogs.userId} = ${userId}`;
      }
      
      // Execute query with proper conditions
      const logs = await db.select({
        id: timeLogs.id,
        userId: timeLogs.userId,
        engagementId: timeLogs.engagementId,
        date: timeLogs.date,
        hours: timeLogs.hours,
        description: timeLogs.description,
        createdAt: timeLogs.createdAt
      })
      .from(timeLogs)
      .where(conditions);
      
      console.log(`Retrieved ${logs.length} time logs for engagement ID ${engagementId}`);
      
      return Promise.all(logs.map(log => this.enrichTimeLog(log)));
    } catch (error) {
      console.error(`Error in getTimeLogsByEngagement for engagement ${engagementId}:`, error);
      return [];
    }
  }

  async getTimeLogsByDateRange(startDate: Date, endDate: Date, userId?: number): Promise<TimeLogWithEngagement[]> {
    try {
      // Create base conditions for date range
      let conditions = and(
        gte(timeLogs.date, startDate),
        lte(timeLogs.date, endDate)
      );
      
      // Add user ID condition if provided
      if (userId !== undefined) {
        conditions = sql`${conditions} AND ${timeLogs.userId} = ${userId}`;
      }
      
      // Execute query with proper conditions
      const logs = await db.select({
        id: timeLogs.id,
        userId: timeLogs.userId,
        engagementId: timeLogs.engagementId,
        date: timeLogs.date,
        hours: timeLogs.hours,
        description: timeLogs.description,
        createdAt: timeLogs.createdAt
      })
      .from(timeLogs)
      .where(conditions);
      
      console.log(`Retrieved ${logs.length} time logs in date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      return Promise.all(logs.map(log => this.enrichTimeLog(log)));
    } catch (error) {
      console.error(`Error in getTimeLogsByDateRange:`, error);
      return [];
    }
  }

  async getTimeLog(id: number, userId?: number): Promise<TimeLogWithEngagement | undefined> {
    try {
      // Create base conditions for time log ID
      let conditions = eq(timeLogs.id, id);
      
      // Add user ID condition if provided
      if (userId !== undefined) {
        conditions = sql`${conditions} AND ${timeLogs.userId} = ${userId}`;
      }
      
      // Execute query with proper conditions
      const results = await db.select({
        id: timeLogs.id,
        userId: timeLogs.userId,
        engagementId: timeLogs.engagementId,
        date: timeLogs.date,
        hours: timeLogs.hours,
        description: timeLogs.description,
        createdAt: timeLogs.createdAt
      })
      .from(timeLogs)
      .where(conditions);
      
      if (results.length === 0) {
        console.log(`No time log found with ID ${id}`);
        return undefined;
      }
      
      console.log(`Retrieved time log with ID ${id}`);
      return this.enrichTimeLog(results[0]);
    } catch (error) {
      console.error(`Error in getTimeLog for time log ID ${id}:`, error);
      return undefined;
    }
  }

  async createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog> {
    console.log('Storage: Inserting time log into database:', timeLog);
    try {
      const [newTimeLog] = await db.insert(timeLogs).values(timeLog).returning();
      console.log('Storage: Time log created successfully:', newTimeLog);
      return newTimeLog;
    } catch (error) {
      console.error('Storage: Error creating time log:', error);
      throw error;
    }
  }

  async updateTimeLog(id: number, timeLog: Partial<InsertTimeLog>, userId?: number): Promise<TimeLog | undefined> {
    // Ensure description is properly handled
    console.log('In storage.updateTimeLog - received data:', timeLog);
    console.log('Description value in storage:', timeLog.description);
    
    // Handle the description field specifically to ensure null values are preserved
    const dataToUpdate = { ...timeLog };
    if ('description' in dataToUpdate && (dataToUpdate.description === null || dataToUpdate.description === '' || 
        (typeof dataToUpdate.description === 'string' && dataToUpdate.description.trim() === ''))) {
      dataToUpdate.description = null;
      console.log('Storage: Setting description to null');
    }
    
    // Instead of condition reassignment, use conditional directly in the query
    const query = db.update(timeLogs).set(dataToUpdate);
    
    if (userId !== undefined) {
      const [updatedTimeLog] = await query
        .where(and(eq(timeLogs.id, id), eq(timeLogs.userId, userId)))
        .returning();
      console.log('Updated time log in storage:', updatedTimeLog);
      return updatedTimeLog;
    } else {
      const [updatedTimeLog] = await query
        .where(eq(timeLogs.id, id))
        .returning();
      console.log('Updated time log in storage:', updatedTimeLog);
      return updatedTimeLog;
    }
  }

  async deleteTimeLog(id: number, userId?: number): Promise<boolean> {
    // Instead of condition reassignment, use conditional directly in the query
    const query = db.delete(timeLogs);
    
    if (userId !== undefined) {
      await query.where(and(eq(timeLogs.id, id), eq(timeLogs.userId, userId)));
    } else {
      await query.where(eq(timeLogs.id, id));
    }
    
    return true; // Assuming success if no error thrown
  }

  // Invoice methods
  async getInvoices(userId?: number): Promise<Invoice[]> {
    const query = db.select().from(invoices).orderBy(desc(invoices.issueDate));
    
    if (userId !== undefined) {
      return await query.where(eq(invoices.userId, userId));
    }
    
    return await query;
  }

  async getInvoice(id: number, userId?: number): Promise<InvoiceWithLineItems | undefined> {
    // @ts-ignore - Ignore SQL condition errors
    const results = await db.select().from(invoices)
      .where(userId !== undefined 
        ? and(eq(invoices.id, id), eq(invoices.userId, userId))
        : eq(invoices.id, id));
    
    if (results.length === 0) return undefined;
    
    // Convert Invoice to InvoiceWithLineItems
    const invoice = results[0] as Invoice;
    let hourlyRate: string | number | null = null;
    
    // If we have the engagement ID, fetch additional details
    if (invoice.engagementId) {
      try {
        // Get the engagement to fetch hourly rate and client details
        const engagement = await this.getEngagement(invoice.engagementId);
        if (engagement) {
          // Get the hourly rate from the engagement
          hourlyRate = engagement.hourlyRate;
          
          if (engagement.clientId) {
            // Get the client details
            const client = await this.getClient(engagement.clientId);
            if (client) {
              // Update billing information from the client
              invoice.billingContactName = invoice.billingContactName || client.billingContactName || null;
              invoice.billingContactEmail = invoice.billingContactEmail || client.billingContactEmail || null;
              invoice.billingAddress = invoice.billingAddress || client.billingAddress || null;
              invoice.billingCity = invoice.billingCity || client.billingCity || null;
              invoice.billingState = invoice.billingState || client.billingState || null;
              invoice.billingZip = invoice.billingZip || client.billingZip || null;
              invoice.billingCountry = invoice.billingCountry || client.billingCountry || null;
            }
          }
        }
      } catch (error) {
        console.error("Error fetching engagement details for invoice:", error);
        // Continue returning the invoice even if engagement info can't be fetched
      }
    }
    
    // Create a line item with the hourly rate if we found it
    const lineItems = [];
    if (hourlyRate) {
      lineItems.push({
        id: 0,
        invoiceId: invoice.id,
        description: "Services rendered",
        hours: invoice.totalHours,
        rate: hourlyRate,
        amount: invoice.totalAmount
      });
    }
    
    return {
      ...invoice,
      lineItems
    };
  }

  async getInvoicesByStatus(status: string, userId?: number): Promise<Invoice[]> {
    if (userId !== undefined) {
      return await db.select().from(invoices)
        .where(and(
          eq(invoices.status, status),
          eq(invoices.userId, userId)
        ))
        .orderBy(desc(invoices.issueDate));
    }
    
    return await db.select().from(invoices)
      .where(eq(invoices.status, status))
      .orderBy(desc(invoices.issueDate));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    // If this invoice is linked to a client through an engagement, get the client information
    if (invoice.engagementId) {
      try {
        const engagement = await this.getEngagement(invoice.engagementId);
        if (engagement && engagement.clientId) {
          const client = await this.getClient(engagement.clientId);
          if (client) {
            // Add client name to the invoice
            invoice.clientName = client.name;
            
            // Add billing information from the client to the invoice
            invoice.billingContactName = client.billingContactName || null;
            invoice.billingContactEmail = client.billingContactEmail || null;
            invoice.billingAddress = client.billingAddress || null;
            invoice.billingCity = client.billingCity || null;
            invoice.billingState = client.billingState || null;
            invoice.billingZip = client.billingZip || null;
            invoice.billingCountry = client.billingCountry || null;
          }
        }
      } catch (error) {
        console.error("Error fetching client info for invoice:", error);
        // Continue creating the invoice even if client info can't be fetched
      }
    }
    
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoiceStatus(id: number, status: string, userId?: number): Promise<Invoice | undefined> {
    const query = db.update(invoices).set({ status });
    
    if (userId !== undefined) {
      const [updatedInvoice] = await query
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
        .returning();
      return updatedInvoice;
    } else {
      const [updatedInvoice] = await query
        .where(eq(invoices.id, id))
        .returning();
      return updatedInvoice;
    }
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>, userId?: number): Promise<Invoice | undefined> {
    const query = db.update(invoices).set(invoice);
    
    if (userId !== undefined) {
      const [updatedInvoice] = await query
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
        .returning();
      return updatedInvoice;
    } else {
      const [updatedInvoice] = await query
        .where(eq(invoices.id, id))
        .returning();
      return updatedInvoice;
    }
  }

  async deleteInvoice(id: number, userId?: number): Promise<boolean> {
    const query = db.delete(invoices);
    
    if (userId !== undefined) {
      await query.where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    } else {
      await query.where(eq(invoices.id, id));
    }
    
    return true; // Assuming success if no error thrown
  }

  // Dashboard and Analytics methods
  async getYtdRevenue(year: number, userId?: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    let conditions = and(
      eq(invoices.status, 'paid'),
      gte(invoices.issueDate, startOfYear),
      lte(invoices.issueDate, endOfYear)
    );
    
    if (userId) {
      conditions = and(conditions, eq(invoices.userId, userId));
    }

    const result = await db.select({
      total: sql<number>`sum(${invoices.totalAmount})`
    })
    .from(invoices)
    .where(conditions);

    return result[0]?.total || 0;
  }

  async getMonthlyRevenueBillable(year: number, userId?: number): Promise<{month: number, revenue: number, billableHours: number}[]> {
    // Initialize months
    const result: {month: number, revenue: number, billableHours: number}[] = [];
    for (let month = 0; month < 12; month++) {
      result.push({ month, revenue: 0, billableHours: 0 });
    }

    try {
      console.log(`Getting revenue from paid invoices for year: ${year}, userId: ${userId || 'all'}`);
      
      // Get revenue from paid invoices
      const yearCondition = sql`extract(year from ${invoices.issueDate}) = ${year}`;
      const invoiceBaseQuery = db.select({
        month: sql<number>`extract(month from ${invoices.issueDate}) - 1`,
        amount: invoices.totalAmount
      }).from(invoices);
      
      let paidInvoices;
      if (userId !== undefined) {
        paidInvoices = await invoiceBaseQuery.where(
          and(
            eq(invoices.status, 'paid'),
            yearCondition,
            eq(invoices.userId, userId)
          )
        );
      } else {
        paidInvoices = await invoiceBaseQuery.where(
          and(
            eq(invoices.status, 'paid'),
            yearCondition
          )
        );
      }

      console.log(`Found ${paidInvoices.length} paid invoices`);

      for (const invoice of paidInvoices) {
        if (invoice && invoice.month !== null && invoice.month !== undefined) {
          const month = invoice.month;
          if (month >= 0 && month < 12) {
            // Ensure we're using a number for the calculation
            result[month].revenue += Number(invoice.amount) || 0;
          }
        }
      }

      // Get billable hours from time logs
      console.log(`Getting billable hours for year: ${year}, userId: ${userId || 'all'}`);
      
      const timeLogYearCondition = sql`extract(year from ${timeLogs.date}) = ${year}`;
      const logBaseQuery = db.select({
        month: sql<number>`extract(month from ${timeLogs.date}) - 1`,
        hours: timeLogs.hours
      }).from(timeLogs);
      
      let yearLogs;
      if (userId !== undefined) {
        yearLogs = await logBaseQuery.where(
          and(
            timeLogYearCondition,
            eq(timeLogs.userId, userId)
          )
        );
      } else {
        yearLogs = await logBaseQuery.where(timeLogYearCondition);
      }

      console.log(`Found ${yearLogs.length} time logs for the year`);

      for (const log of yearLogs) {
        if (log && log.month !== null && log.month !== undefined) {
          const month = log.month;
          if (month >= 0 && month < 12) {
            result[month].billableHours += Number(log.hours) || 0;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error in getMonthlyRevenueBillable:', error);
      // Return empty data on error, to avoid breaking the UI
      return result; 
    }
  }

  async getTotalHoursLogged(startDate: Date, endDate: Date, userId?: number): Promise<number> {
    let conditions = and(
      gte(timeLogs.date, startDate),
      lte(timeLogs.date, endDate)
    );
    
    if (userId) {
      conditions = and(conditions, eq(timeLogs.userId, userId));
    }
    
    const result = await db.select({
      total: sql<number>`sum(${timeLogs.hours})`
    })
    .from(timeLogs)
    .where(conditions);

    return result[0]?.total || 0;
  }

  async getPendingInvoicesTotal(userId?: number): Promise<number> {
    // Use the correct status enum values from the schema
    const statusCondition = sql`(${invoices.status} = 'submitted' OR ${invoices.status} = 'overdue')`;
    const query = db.select({
      total: sql<number>`COALESCE(sum(${invoices.totalAmount}), 0)`
    }).from(invoices);
    
    // Add debug logging
    console.log(`Getting pending invoices total for userId: ${userId || 'all'}`);
    
    let result;
    if (userId !== undefined) {
      result = await query.where(and(statusCondition, eq(invoices.userId, userId)));
    } else {
      result = await query.where(statusCondition);
    }

    // The COALESCE ensures that NULL is converted to 0
    // But we'll still add a fallback to handle any unexpected results
    const total = result[0]?.total !== null && result[0]?.total !== undefined ? 
      result[0].total : 0;
      
    console.log(`Pending invoices total: ${total}`);
    return total;
  }

  // Helper methods
  private async enrichTimeLog(timeLog: TimeLog): Promise<TimeLogWithEngagement> {
    try {
      console.log(`Enriching time log ${timeLog.id} with engagement ID ${timeLog.engagementId}`);
      
      // Get the engagement for this time log with an improved SQL query that ensures we get client data
      const engagementQuery = `
        SELECT 
          e.id, e.user_id, e.client_id, e.project_name, e.hourly_rate,
          e.start_date, e.end_date, e.description, e.status, e.engagement_type,
          c.name as client_name
        FROM engagements e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.id = $1
      `;
      
      console.log(`Executing SQL query for engagement ${timeLog.engagementId}`);
      const result = await pool.query(engagementQuery, [timeLog.engagementId]);
      
      if (result.rows.length > 0) {
        console.log(`Found engagement data: ${JSON.stringify(result.rows[0])}`);
        const row = result.rows[0];
        
        // Direct check if client_name is present and valid
        let clientName = "Unknown Client";
        if (row.client_name) {
          clientName = row.client_name;
        } else if (row.client_id) {
          console.log(`Client name missing but client_id exists: ${row.client_id}, fetching client separately`);
          try {
            const clientQuery = `SELECT name FROM clients WHERE id = $1`;
            const clientResult = await pool.query(clientQuery, [row.client_id]);
            if (clientResult.rows.length > 0) {
              clientName = clientResult.rows[0].name;
              console.log(`Retrieved client name separately: ${clientName}`);
            }
          } catch (clientErr) {
            console.error(`Error fetching client name separately: ${clientErr}`);
          }
        }
        
        const engagement = {
          id: row.id,
          userId: row.user_id,
          clientId: row.client_id,
          projectName: row.project_name,
          hourlyRate: row.hourly_rate,
          projectAmount: null, // Set to null since it's not in database
          startDate: new Date(row.start_date),
          endDate: new Date(row.end_date),
          description: row.description,
          status: row.status,
          engagementType: row.engagement_type || 'hourly', // Default to hourly if not in DB
        } as Engagement;
        
        console.log(`Constructed engagement for time log ${timeLog.id}:`, {
          id: engagement.id,
          projectName: engagement.projectName,
          engagementType: engagement.engagementType,
          hourlyRate: engagement.hourlyRate,
          clientName: clientName
        });

        // Convert both hourlyRate and hours to numbers for calculation
        const hourlyRate = Number(engagement.hourlyRate || 0);
        const hours = Number(timeLog.hours);
        const billableAmount = hours * hourlyRate;
        
        console.log(`Calculated billable amount for time log ${timeLog.id}:`, {
          hours,
          hourlyRate,
          billableAmount
        });
        
        // Explicitly ensure description is null if it's empty or undefined
        const sanitizedDescription = 
          timeLog.description === "" || 
          timeLog.description === undefined || 
          (typeof timeLog.description === 'string' && timeLog.description.trim() === "") 
            ? null 
            : timeLog.description;
        
        return {
          ...timeLog,
          description: sanitizedDescription,
          engagement,
          billableAmount,
          clientName
        };
      } else {
        console.warn(`No engagement found for time log ${timeLog.id} with engagement ID ${timeLog.engagementId}`);
        // Fallback if engagement doesn't exist
        const engagement = {
          id: timeLog.engagementId,
          userId: timeLog.userId,
          clientId: 0,
          projectName: "Unknown Project",
          hourlyRate: "0",
          projectAmount: "0",
          startDate: new Date(),
          endDate: new Date(),
          description: null,
          status: "unknown",
          engagementType: "hourly",
        } as unknown as Engagement;
        
        // Get the hours from the time log for billable amount calculation
        const hours = Number(timeLog.hours || 0);
        const billableAmount = hours * Number(engagement.hourlyRate || 0);
        
        console.log(`Recovered engagement and client data in error handler: 
          billableAmount: ${billableAmount} (hours: ${hours}, rate: ${engagement.hourlyRate})
          projectName: ${engagement.projectName}
          clientName: "Unknown Client"`);
        
        return {
          ...timeLog,
          description: null,
          engagement,
          billableAmount,
          clientName: "Unknown Client"
        };
      }
    } catch (error) {
      console.error('Error in enrichTimeLog:', error);
      
      // Get the hours from the time log for billable amount calculation
      const hours = Number(timeLog.hours || 0);
      
      // Try to find the engagement directly from the database to get hourly rate
      let billableAmount = 0;
      let clientName = "Unknown Client";
      let projectName = "Error Loading Project";
      
      try {
        // First, try to get the engagement directly from the database using a different approach
        console.log(`Attempting to recover engagement data for time log ${timeLog.id} using direct query`);
        const query = `
          SELECT e.id, e.user_id, e.client_id, e.project_name, e.hourly_rate, 
          e.start_date, e.end_date, e.description, e.status, e.engagement_type,
          c.name as client_name 
          FROM engagements e 
          LEFT JOIN clients c ON e.client_id = c.id 
          WHERE e.id = $1
        `;
        const engResult = await pool.query(query, [timeLog.engagementId]);
        
        if (engResult.rows.length > 0) {
          const engagement = engResult.rows[0];
          const hourlyRate = Number(engagement.hourly_rate || 0);
          billableAmount = hours * hourlyRate;
          projectName = engagement.project_name || "Unknown Project";
          clientName = engagement.client_name || "Unknown Client";
          
          console.log(`Recovered engagement and client data in error handler: 
            billableAmount: ${billableAmount} (hours: ${hours}, rate: ${hourlyRate})
            projectName: ${projectName}
            clientName: ${clientName}`);
        } else if (timeLog.engagementId) {
          // If we couldn't get data with the join, try direct database queries with Drizzle
          console.log(`Attempting to recover engagement data using Drizzle ORM`);
          
          const engagementData = await db.select().from(engagements).where(eq(engagements.id, timeLog.engagementId));
          
          if (engagementData.length > 0) {
            const engagement = engagementData[0];
            const hourlyRate = Number(engagement.hourlyRate || 0);
            billableAmount = hours * hourlyRate;
            projectName = engagement.projectName || "Unknown Project";
            
            // Attempt to get client directly
            if (engagement.clientId) {
              const clientData = await db.select().from(clients).where(eq(clients.id, engagement.clientId));
              if (clientData.length > 0) {
                clientName = clientData[0].name || "Unknown Client";
              }
            }
          }
        }
      } catch (secondaryError) {
        console.error('Error recovering engagement and client data in secondary attempt:', secondaryError);
      }
      
      // Create a minimal valid response in case of error
      return {
        ...timeLog,
        description: null,
        engagement: {
          id: timeLog.engagementId,
          userId: timeLog.userId,
          clientId: 0,
          projectName: projectName,
          hourlyRate: "0",
          projectAmount: "0", 
          startDate: new Date(),
          endDate: new Date(),
          description: null,
          status: "unknown",
          engagementType: "hourly"
        } as unknown as Engagement, 
        billableAmount: billableAmount,
        clientName: clientName
      };
    }
  }

  // Get engagement with client details
  async getEngagementWithClient(id: number, userId?: number): Promise<Engagement | undefined> {
    try {
      const baseQuery = {
        id: engagements.id,
        userId: engagements.userId,
        clientId: engagements.clientId,
        projectName: engagements.projectName,
        startDate: engagements.startDate,
        endDate: engagements.endDate,
        hourlyRate: engagements.hourlyRate,
        projectAmount: engagements.projectAmount,
        engagementType: engagements.engagementType,
        description: engagements.description,
        status: engagements.status,
        clientName: clients.name,
        clientEmail: clients.billingContactEmail,
        netTerms: engagements.netTerms,
      };

      // Create query condition based on whether userId is provided
      const whereCondition = userId !== undefined
        ? and(eq(engagements.id, id), eq(engagements.userId, userId))
        : eq(engagements.id, id);

      const query = db
        .select(baseQuery)
        .from(engagements)
        .leftJoin(clients, eq(engagements.clientId, clients.id))
        .where(whereCondition);

      const results = await query;
      
      if (results.length === 0) {
        return undefined;
      }
      
      return results[0] as Engagement;
    } catch (error) {
      console.error(`Error fetching engagement with client for id ${id}:`, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<string> {
    // First, invalidate any existing tokens
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.userId, userId));
    
    // Create a new token
    const [result] = await db.insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt,
        createdAt: new Date(),
        used: false
      })
      .returning({ token: passwordResetTokens.token });

    return result.token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );
    
    return result;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<boolean> {
    const result = await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
    
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
