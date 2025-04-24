const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('Starting migration script...');

const connectionString = process.env.DATABASE_URL;
console.log('Database URL available:', !!connectionString);

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const run = async () => {
  console.log('Connecting to database...');
  let client;
  try {
    client = await pool.connect();
    console.log('Successfully connected to database');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  
  try {
    console.log('Starting business_info migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute migration
    const migrationPath = path.join(__dirname, 'versions', '001_create_business_info_table.sql');
    console.log('Migration path:', migrationPath);
    console.log('File exists:', fs.existsSync(migrationPath));
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Migration SQL loaded, length:', migrationSql.length);
    
    await client.query(migrationSql);
    console.log('Migration SQL executed successfully');
    
    // Update migration history table if it exists
    try {
      await client.query(`
        INSERT INTO migrations (name, applied_at) 
        VALUES ('001_create_business_info_table', NOW())
        ON CONFLICT (name) DO NOTHING
      `);
      console.log('Migration history updated');
    } catch (err) {
      console.log('Note: Migrations table not updated or does not exist:', err.message);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Business info migration completed successfully!');
    
  } catch (err) {
    // Rollback transaction on error
    console.error('Migration failed, attempting rollback:', err);
    try {
      await client.query('ROLLBACK');
      console.log('Rollback successful');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    if (client) {
      console.log('Releasing client connection');
      client.release();
    }
    console.log('Ending pool');
    await pool.end();
  }
};

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
}); 