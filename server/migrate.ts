import { migration as addUserIdMigration } from './migrations/add_user_id';

async function runMigrations() {
  console.log("Starting database migrations...");
  
  try {
    // Run all migrations in sequence
    await addUserIdMigration();
    
    console.log("All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration process failed:", error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();