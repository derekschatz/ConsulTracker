/**
 * Generate test invoices script
 * Run with: node scripts/generate-test-invoices.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Initialize environment variables
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function generateTestInvoices() {
  try {
    console.log('Starting to generate test invoices...');
    
    // Get active engagements
    const engagementsResult = await pool.query(
      'SELECT id, client_name, project_name, hourly_rate FROM engagements ORDER BY id'
    );
    
    if (engagementsResult.rows.length === 0) {
      console.error('No engagements found. Please create engagements first.');
      return;
    }
    
    const engagements = engagementsResult.rows;
    console.log(`Found ${engagements.length} engagements`);
    
    // Create invoices with different statuses
    const statuses = ['submitted', 'paid', 'overdue'];
    let invoiceCount = 0;
    
    for (const engagement of engagements) {
      for (const status of statuses) {
        // Create invoice with different dates based on status
        const today = new Date();
        let issueDate, dueDate;
        
        if (status === 'submitted') {
          // Recent invoice, due in the future
          issueDate = new Date(today);
          issueDate.setDate(today.getDate() - 5); // 5 days ago
          
          dueDate = new Date(today);
          dueDate.setDate(today.getDate() + 25); // Due in 25 days
        } else if (status === 'paid') {
          // Older invoice already paid
          issueDate = new Date(today);
          issueDate.setDate(today.getDate() - 45); // 45 days ago
          
          dueDate = new Date(today);
          dueDate.setDate(today.getDate() - 15); // Due was 15 days ago
        } else if (status === 'overdue') {
          // Past due invoice
          issueDate = new Date(today);
          issueDate.setDate(today.getDate() - 40); // 40 days ago
          
          dueDate = new Date(today);
          dueDate.setDate(today.getDate() - 10); // Due was 10 days ago
        }
        
        // Create random amount between 500 and 5000
        const amount = (Math.random() * 4500 + 500).toFixed(2);
        
        // Generate period start and end dates (typically a month before issue date)
        const periodEnd = new Date(issueDate);
        periodEnd.setDate(periodEnd.getDate() - 1);
        
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - 30);
        
        // Generate invoice number
        const invoiceNumber = `INV-${engagement.id}-${Date.now().toString().slice(-4)}`;
        
        // Insert invoice
        const result = await pool.query(
          `INSERT INTO invoices 
           (engagement_id, status, issue_date, due_date, invoice_number, client_name, amount, period_start, period_end, notes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
           RETURNING id`,
          [
            engagement.id,
            status,
            issueDate,
            dueDate,
            invoiceNumber,
            engagement.client_name,
            amount,
            periodStart,
            periodEnd,
            `Test ${status} invoice for ${engagement.project_name}`
          ]
        );
        
        const invoiceId = result.rows[0].id;
        invoiceCount++;
        
        // Create some invoice line items
        const lineItemCount = Math.floor(Math.random() * 5) + 1; // 1-5 line items
        
        for (let i = 0; i < lineItemCount; i++) {
          const hours = (Math.random() * 7 + 1).toFixed(1); // 1-8 hours
          const description = `Work on ${engagement.project_name} - Task ${i + 1}`;
          const lineAmount = (parseFloat(hours) * parseFloat(engagement.hourly_rate)).toFixed(2);
          
          await pool.query(
            `INSERT INTO invoice_line_items
             (invoice_id, time_log_id, description, hours, rate, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              invoiceId,
              null, // No time log ID since this is test data
              description,
              hours,
              engagement.hourly_rate,
              lineAmount
            ]
          );
        }
        
        console.log(`Created ${status} invoice #${invoiceNumber} for ${engagement.client_name} - ${engagement.project_name} with ${lineItemCount} line items`);
      }
    }
    
    console.log(`Successfully created ${invoiceCount} test invoices`);
  } catch (error) {
    console.error('Error generating test invoices:', error);
  } finally {
    // Close the pool
    pool.end();
  }
}

// Run the function
generateTestInvoices();