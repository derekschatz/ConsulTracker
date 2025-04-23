const { Pool } = require('pg');

// Define your connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/consultracker';
console.log('Using connection string:', connectionString);

// Create a connection pool
const pool = new Pool({ connectionString });

async function fixSchema() {
  console.log('Starting schema fix...');
  
  try {
    // Add billing columns to invoices table
    console.log('Adding billing columns to invoices...');
    await pool.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS billing_contact_name TEXT;
    `);
    console.log('Added billing_contact_name to invoices');
    
    // Add billing columns to clients table
    console.log('Adding billing columns to clients...');
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS billing_contact_name TEXT;
    `);
    console.log('Added billing_contact_name to clients');
    
    console.log('Schema fix completed successfully!');
  } catch (error) {
    console.error('Error fixing schema:', error);
  } finally {
    await pool.end();
  }
}

fixSchema(); 