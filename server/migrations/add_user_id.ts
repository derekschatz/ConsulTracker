import { db } from "../db";
import { pool } from "../db";

/**
 * Migration to add user_id column to all relevant tables
 */
async function migration() {
  console.log("Starting migration: Adding user_id columns");
  
  try {
    // Check if engagements table has user_id column
    const engagementColumnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'engagements' AND column_name = 'user_id'
    `);
    
    if (engagementColumnCheck.rows.length === 0) {
      console.log("Adding user_id column to engagements table");
      await pool.query(`
        ALTER TABLE engagements 
        ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1
      `);
    }
    
    // Check if invoices table has user_id column
    const invoicesColumnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name = 'user_id'
    `);
    
    if (invoicesColumnCheck.rows.length === 0) {
      console.log("Adding user_id column to invoices table");
      await pool.query(`
        ALTER TABLE invoices 
        ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1
      `);
    }
    
    // Check if time_logs table has user_id column
    const timeLogsColumnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'time_logs' AND column_name = 'user_id'
    `);
    
    if (timeLogsColumnCheck.rows.length === 0) {
      console.log("Adding user_id column to time_logs table");
      await pool.query(`
        ALTER TABLE time_logs 
        ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1
      `);
    }
    
    // Check if clients table has user_id column
    const clientsColumnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'user_id'
    `);
    
    if (clientsColumnCheck.rows.length === 0) {
      console.log("Adding user_id column to clients table");
      await pool.query(`
        ALTER TABLE clients 
        ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1
      `);
    }
    
    console.log("Migration completed: user_id columns added to all tables");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Export the migration function
export { migration };