// This script will run the SQL migration to add net_terms to the engagements table
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runEngagementNetTermsMigration() {
  console.log('Running add_net_terms_to_engagements migration...');
  
  try {
    // Read migration SQL
    const sqlPath = path.join(__dirname, 'add_net_terms_to_engagements.sql');
    console.log(`Reading SQL file: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Create a new pool
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Execute the SQL directly
    console.log('Executing SQL migration...');
    await pool.query(sql);
    
    // Close the pool
    await pool.end();
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
runEngagementNetTermsMigration()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
  }); 