import { migration as addUserIdMigration } from './migrations/add_user_id';
import { migration as createTestUserMigration } from './migrations/create_test_user';

async function runMigrations() {
  console.log("Starting database migrations...");
  
  try {
    // Run all migrations in sequence
    await addUserIdMigration();
    await createTestUserMigration();
    
    console.log("All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration process failed:", error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();