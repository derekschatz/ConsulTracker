import fs from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const runNetTermsMigration = async () => {
  console.log('Running net_terms migration...');
  
  try {
    // Read migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add_net_terms_to_invoices.sql'),
      'utf8'
    );
    
    // Parse database URL from environment
    const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
    console.log(`Connecting to database: ${databaseUrl}`);
    
    // Connect to database
    const client = postgres(databaseUrl, { max: 1 });
    const db = drizzle(client);
    
    // Run the migration SQL
    console.log('Executing migration SQL...');
    await client.unsafe(migrationSQL);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
  
  console.log('Migration complete');
};

runNetTermsMigration(); 