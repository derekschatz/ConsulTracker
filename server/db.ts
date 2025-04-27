import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Type declaration for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL?: string;
      NODE_ENV?: string;
      PORT?: string;
      SESSION_SECRET?: string;
    }
  }
}

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please check your environment variables and ensure your database is provisioned."
  );
}

// Extract database connection string
const connectionString = process.env.DATABASE_URL;

// For Supabase, the connection string should look like:
// postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres

let pool: Pool;
let db: any; // Using any temporarily to avoid TypeScript errors

try {
  // Create a connection pool
  pool = new Pool({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false // Required for Supabase connections
    }
  });
  
  // Initialize Drizzle ORM with the pool and schema
  db = drizzle(pool, { schema });
  
  console.log('Database connection established successfully');
} catch (error: unknown) {
  console.error('Failed to connect to database:', error);
  throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
}

export { pool, db };
