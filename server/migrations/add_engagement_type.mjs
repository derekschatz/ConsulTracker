import pg from 'pg';
const { Pool } = pg;

// Create a new pool using DATABASE_URL environment variable
// or a default connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/contraq'
});

async function main() {
  // Connect to the database
  const client = await pool.connect();
  
  try {
    console.log('Starting migration to add engagement_type column...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if the column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'engagements' AND column_name = 'engagement_type'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('Column engagement_type does not exist, adding it now...');
      
      // Add the engagement_type column
      await client.query(`
        ALTER TABLE engagements 
        ADD COLUMN engagement_type TEXT NOT NULL DEFAULT 'hourly'
      `);
      
      console.log('Column engagement_type added successfully!');
    } else {
      console.log('Column engagement_type already exists, skipping...');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Release client back to the pool
    client.release();
    // Close the pool
    await pool.end();
  }
}

// Execute the migration
main().catch(console.error); 