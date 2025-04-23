// Script to add missing billing fields
const { Pool } = require('pg');

async function addMissingFields() {
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/consultracker'
  });
  
  try {
    console.log('Starting to add missing billing fields...');
    
    // Add the missing columns to invoices table
    const result = await pool.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
      ADD COLUMN IF NOT EXISTS billing_address TEXT,
      ADD COLUMN IF NOT EXISTS billing_city TEXT,
      ADD COLUMN IF NOT EXISTS billing_state TEXT,
      ADD COLUMN IF NOT EXISTS billing_zip TEXT,
      ADD COLUMN IF NOT EXISTS billing_country TEXT;
    `);
    
    console.log('Successfully added missing billing fields to invoices table');
    
    // Also add to clients table if needed
    const clientResult = await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
      ADD COLUMN IF NOT EXISTS billing_address TEXT,
      ADD COLUMN IF NOT EXISTS billing_city TEXT,
      ADD COLUMN IF NOT EXISTS billing_state TEXT,
      ADD COLUMN IF NOT EXISTS billing_zip TEXT,
      ADD COLUMN IF NOT EXISTS billing_country TEXT;
    `);
    
    console.log('Successfully added missing billing fields to clients table');
    
    return 'Fields added successfully';
  } catch (error) {
    console.error('Error adding missing fields:', error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
addMissingFields()
  .then(result => {
    console.log(result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to add fields:', err);
    process.exit(1);
  }); 