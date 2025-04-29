import { pool } from "../db";

async function createPasswordResetTokensTable() {
  console.log("Creating password_reset_tokens table...");
  
  try {
    const result = await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        used BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    `);
    
    console.log("password_reset_tokens table created successfully");
    return result;
  } catch (error) {
    console.error("Error creating password_reset_tokens table:", error);
    throw error;
  }
}

// Execute the migration
createPasswordResetTokensTable()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  }); 