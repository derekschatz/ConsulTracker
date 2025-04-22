const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Initialize the database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/invoice_app'
});

async function applyMigration() {
  try {
    console.log('Starting migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_client_id_to_engagements.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply the migration
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the migration
applyMigration(); 