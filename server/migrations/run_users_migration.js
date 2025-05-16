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

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // Create a connection to the database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false
  });

  try {
    // Read the migration SQL file
    const filePath = path.join(__dirname, 'create_users_table.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    // Run the migration
    console.log('Running users table migration...');
    await pool.query(sql);
    console.log('Users table migration completed successfully');

    // Query to check if the user was created
    const result = await pool.query('SELECT * FROM users LIMIT 1');
    console.log('Sample user created:', result.rows.length > 0);
    if (result.rows.length > 0) {
      console.log('Username:', result.rows[0].username);
    }
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

runMigration().catch(console.error); 