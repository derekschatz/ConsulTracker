// Direct client database update test script
import { Pool } from 'pg';
import fs from 'fs';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/consultracker'
});

async function addMissingColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Add missing columns to invoices table
    console.log('\nAdding missing columns to invoices table:');
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
    console.log('Successfully added missing columns to invoices table');
    
    // Add missing columns to clients table
    console.log('\nAdding missing columns to clients table:');
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
    console.log('Successfully added missing columns to clients table');
    
    // Verify the columns were added
    console.log('\nVerifying columns in invoices table:');
    const invoiceColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
        AND column_name LIKE 'billing_%';
    `);
    console.log('Invoice billing columns:', invoiceColumns.rows.map(row => row.column_name));
    
    console.log('\nVerifying columns in clients table:');
    const clientColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
        AND column_name LIKE 'billing_%';
    `);
    console.log('Client billing columns:', clientColumns.rows.map(row => row.column_name));
    
    // Log results to file for debug purposes
    fs.writeFileSync('column-fix.log', JSON.stringify({
      invoiceColumns: invoiceColumns.rows,
      clientColumns: clientColumns.rows
    }, null, 2));
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    client.release();
    console.log('\nMigration completed');
  }
}

async function updateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Make time_logs description column nullable
    console.log('\nMaking time_logs description column nullable:');
    await client.query(`
      ALTER TABLE time_logs
      ALTER COLUMN description DROP NOT NULL;
    `);
    console.log('Successfully made time_logs description column nullable');
    
    // Verify the changes
    console.log('\nVerifying time_logs columns:');
    const columns = await client.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'time_logs' 
        AND column_name = 'description';
    `);
    console.log('time_logs description column:', columns.rows);
    
    // Log results to file for debug purposes
    fs.writeFileSync('time-logs-migration.log', JSON.stringify({
      columns: columns.rows
    }, null, 2));
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    client.release();
    console.log('\nMigration completed');
  }
}

async function fixEmptyDescriptions() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Fix empty string descriptions by setting them to NULL
    console.log('\nFixing empty description fields in time_logs:');
    
    // First, check for empty string descriptions
    const checkResult = await client.query(`
      SELECT id, description 
      FROM time_logs 
      WHERE description = '' OR description = ' ';
    `);
    
    console.log(`Found ${checkResult.rows.length} time logs with empty descriptions`);
    
    if (checkResult.rows.length > 0) {
      console.log('Sample affected rows:', checkResult.rows.slice(0, 5));
      
      // Update empty descriptions to NULL
      const updateResult = await client.query(`
        UPDATE time_logs
        SET description = NULL
        WHERE description = '' OR description = ' ' OR trim(description) = '';
      `);
      
      console.log(`Successfully updated ${updateResult.rowCount} time logs with empty descriptions to NULL`);
    } else {
      console.log('No empty descriptions found');
    }
    
    // Check for any descriptions that might be just whitespace
    const whitespaceResult = await client.query(`
      SELECT id, description 
      FROM time_logs 
      WHERE description IS NOT NULL AND trim(description) = '';
    `);
    
    if (whitespaceResult.rows.length > 0) {
      console.log(`Found ${whitespaceResult.rows.length} time logs with whitespace-only descriptions`);
      console.log('Sample affected rows:', whitespaceResult.rows.slice(0, 5));
      
      // Update whitespace descriptions to NULL
      const updateWhitespaceResult = await client.query(`
        UPDATE time_logs
        SET description = NULL
        WHERE description IS NOT NULL AND trim(description) = '';
      `);
      
      console.log(`Successfully updated ${updateWhitespaceResult.rowCount} time logs with whitespace-only descriptions to NULL`);
    } else {
      console.log('No whitespace-only descriptions found');
    }
    
    // Log results to file for debug purposes
    fs.writeFileSync('description-fix.log', JSON.stringify({
      emptyDescriptions: checkResult.rows,
      whitespaceDescriptions: whitespaceResult.rows
    }, null, 2));
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    client.release();
    console.log('\nDescription fix completed');
    // End the pool only here
    pool.end();
  }
}

// Run the functions sequentially
async function runMigrations() {
  try {
    await addMissingColumns();
    await updateDatabase();
    await fixEmptyDescriptions();
  } catch (error) {
    console.error('Migration error:', error);
    // Don't end the pool here - it's already done in fixEmptyDescriptions()
  }
}

runMigrations().catch(console.error); 