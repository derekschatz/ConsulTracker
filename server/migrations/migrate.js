// Import required packages
import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import ws from 'ws';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Neon for serverless
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function runMigration() {
  // Create a database connection pool
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('Connected to database, starting migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'update_client_schema.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('SQL file loaded successfully');
    
    // Execute the SQL migration
    console.log('Executing SQL migration...');
    await client.query(sql);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error during migration:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
    // End the pool to exit cleanly
    await pool.end();
  }
}

// Execute the migration
runMigration()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration process failed:', err);
    process.exit(1);
  }); 