const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Get database config from environment variables
const {
  PGHOST = 'localhost',
  PGUSER = 'postgres',
  PGDATABASE = 'contraq',
  PGPASSWORD = '',
  PGPORT = 5432,
} = process.env;

// Create connection pool
const pool = new Pool({
  host: PGHOST,
  user: PGUSER,
  database: PGDATABASE,
  password: PGPASSWORD,
  port: PGPORT,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting engagement type migration...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'add_engagement_type_field.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split and execute each command
    const commands = migrationSQL.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const command of commands) {
      await client.query(command);
      // Log a dot for each command executed to show progress
      process.stdout.write('.');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\nMigration completed successfully!');
    
    // Log table structure after migration
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'engagements'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nUpdated engagements table structure:');
    console.table(rows);
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\nMigration failed:', error);
    process.exit(1);
  } finally {
    // Release client back to pool
    client.release();
    
    // Close pool
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error); 