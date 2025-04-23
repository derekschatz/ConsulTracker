// Script to run the client schema update migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/consultracker'
  });
  
  const client = await pool.connect();
  
  try {
    console.log('Starting client schema update migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'server/migrations/update_client_schema.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('SQL file content loaded successfully');
    
    await client.query(sql);
    console.log('SQL executed successfully');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Client schema update migration completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error running client schema update migration:', error);
    throw error;
  } finally {
    // Release the client
    client.release();
    pool.end();
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