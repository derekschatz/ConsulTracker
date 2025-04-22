const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Create a client directly from connection string or env vars
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/freelance_tracker'
  });
  
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');
    
    console.log('Starting client schema update migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'update_client_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL migration...');
    await client.query(sql);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Client schema update migration completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error running client schema update migration:', error);
    throw error;
  } finally {
    // Close the client
    await client.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  }); 