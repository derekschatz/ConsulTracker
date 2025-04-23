// Script to fix the database schema
const { Pool } = require('pg');

async function fixDatabase() {
  console.log('Starting database fix script...');
  console.log('Current directory:', process.cwd());
  
  // Create a connection pool with multiple possible connection strings
  let pool;
  let connectError;
  
  const connectionStrings = [
    'postgresql://postgres:postgres@localhost:5432/consultracker',
    'postgres://postgres:postgres@localhost:5432/consultracker',
    'postgresql://postgres:postgres@db:5432/consultracker',
    'postgresql://postgres:postgres@127.0.0.1:5432/consultracker'
  ];
  
  // Try each connection string until one works
  for (const connectionString of connectionStrings) {
    try {
      console.log(`Trying to connect with: ${connectionString}`);
      pool = new Pool({ connectionString });
      
      // Test the connection
      const client = await pool.connect();
      console.log('Successfully connected to database!');
      client.release();
      
      connectError = null;
      break;
    } catch (error) {
      console.error(`Connection failed with ${connectionString}:`, error.message);
      connectError = error;
      
      if (pool) {
        await pool.end();
      }
    }
  }
  
  if (connectError) {
    console.error('All connection attempts failed. Cannot proceed.');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    console.log('Starting schema update...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Add missing columns to invoices table
    console.log('Adding columns to invoices table...');
    await client.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
      ADD COLUMN IF NOT EXISTS billing_address TEXT,
      ADD COLUMN IF NOT EXISTS billing_city TEXT,
      ADD COLUMN IF NOT EXISTS billing_state TEXT,
      ADD COLUMN IF NOT EXISTS billing_zip TEXT,
      ADD COLUMN IF NOT EXISTS billing_country TEXT;
    `);
    
    // Add missing columns to clients table
    console.log('Adding columns to clients table...');
    await client.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
      ADD COLUMN IF NOT EXISTS billing_address TEXT,
      ADD COLUMN IF NOT EXISTS billing_city TEXT,
      ADD COLUMN IF NOT EXISTS billing_state TEXT,
      ADD COLUMN IF NOT EXISTS billing_zip TEXT,
      ADD COLUMN IF NOT EXISTS billing_country TEXT;
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Schema update completed successfully!');
    
    // Verify the columns were added
    console.log('Verifying columns...');
    
    const invoiceColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
        AND column_name LIKE 'billing_%';
    `);
    
    const clientColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
        AND column_name LIKE 'billing_%';
    `);
    
    console.log('Invoice billing columns:', invoiceColumns.rows.map(row => row.column_name));
    console.log('Client billing columns:', clientColumns.rows.map(row => row.column_name));
    
    console.log('Database fix completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing database schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabase().catch(error => {
  console.error('Unhandled error in database fix script:', error);
}); 