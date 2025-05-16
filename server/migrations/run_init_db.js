import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  
  // Create a connection to the database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false
  });

  try {
    // Test connection
    const connectionResult = await pool.query('SELECT NOW()');
    console.log('Connected to database:', connectionResult.rows[0].now);
    
    // Read the initialization SQL file
    const filePath = path.join(__dirname, 'init_db.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    // Run the SQL commands
    console.log('Running database initialization...');
    await pool.query(sql);
    console.log('Database initialization completed successfully');

    // Verify the tables were created
    const tables = ['users', 'clients', 'engagements', 'time_logs', 'invoices', 'subscriptions', 'business_info'];
    console.log('Verifying table creation:');
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      console.log(`- ${table}: ${result.rows[0].exists ? 'Created ✅' : 'Failed ❌'}`);
    }

    // Check sample data
    const counts = await Promise.all(tables.map(table => 
      pool.query(`SELECT COUNT(*) FROM ${table}`)
    ));
    
    console.log('\nTable row counts:');
    tables.forEach((table, index) => {
      console.log(`- ${table}: ${counts[index].rows[0].count} rows`);
    });
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

initializeDatabase().catch(console.error); 