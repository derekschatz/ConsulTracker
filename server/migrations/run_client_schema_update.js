import { pool } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
if (import.meta.url === import.meta.resolve(process.argv[1])) {
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

export default runMigration; 