const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting client schema update migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'update_client_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
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
    // Release the client
    client.release();
  }
}

// Run the migration when executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = runMigration; 