import { db, pool } from "../db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt
 * @param password The password to hash
 * @returns The hashed password with salt
 */
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Migration to create a test user and assign existing data to them
 */
async function migration() {
  console.log("Starting migration: Creating test user and reassigning data");
  
  try {
    // Create a test user if it doesn't exist
    const testUser = {
      username: "testuser",
      password: await hashPassword("testpassword"),
      name: "Test User",
      email: "test@example.com"
    };
    
    // Check if test user exists
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [testUser.username]
    );
    
    let testUserId: number;
    
    if (userCheck.rows.length === 0) {
      // Insert the test user
      console.log("Creating test user:", testUser.username);
      const result = await pool.query(
        "INSERT INTO users (username, password, name, email) VALUES ($1, $2, $3, $4) RETURNING id",
        [testUser.username, testUser.password, testUser.name, testUser.email]
      );
      testUserId = result.rows[0].id;
      console.log(`Test user created with ID: ${testUserId}`);
    } else {
      testUserId = userCheck.rows[0].id;
      console.log(`Test user already exists with ID: ${testUserId}`);
    }
    
    // Find records without a user_id or with user_id=1 and assign them to the test user
    const tables = ["engagements", "invoices", "time_logs", "clients"];
    
    for (const table of tables) {
      console.log(`Reassigning records in ${table} to the test user`);
      
      // Update records without user_id or with user_id=1
      const updateResult = await pool.query(
        `UPDATE ${table} SET user_id = $1 WHERE user_id = 1`,
        [testUserId]
      );
      
      console.log(`Updated ${updateResult.rowCount} records in ${table}`);
    }
    
    console.log("Migration completed: Test user created and data assigned");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Export the migration function
export { migration };