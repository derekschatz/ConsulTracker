/**
 * User Migration Script for Supabase
 * 
 * This script helps migrate existing users to Supabase Auth
 * and updates user IDs in database tables.
 * 
 * Requirements:
 * - @supabase/supabase-js
 * - pg (PostgreSQL client)
 * - dotenv
 * 
 * Install with: npm install @supabase/supabase-js pg dotenv
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Not the anon key, use service key
const ORIGINAL_DB_URL = process.env.ORIGINAL_DATABASE_URL;

// Initialize Supabase Admin Client (using service key)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Connect to original database
const pool = new Pool({
  connectionString: ORIGINAL_DB_URL
});

// Main migration function
async function migrateUsers() {
  const client = await pool.connect();
  
  try {
    console.log('Starting user migration...');
    
    // Get all users from your current database
    const { rows: users } = await client.query('SELECT * FROM users');
    console.log(`Found ${users.length} users to migrate`);
    
    // Create a mapping of old ID to new UUID
    const userIdMap = {};
    
    // For each user, create a Supabase Auth user
    for (const user of users) {
      try {
        // Create user in Supabase Auth
        // Using createUser() if you have the service role key
        // This bypasses email verification
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password, // Note: You might need to handle password hashing differently
          email_confirm: true,
          user_metadata: {
            name: user.name,
            original_id: user.id
          }
        });
        
        if (error) {
          console.error(`Error creating user ${user.email}:`, error.message);
          continue;
        }
        
        console.log(`Migrated user ${user.email} with ID ${newUser.user.id}`);
        
        // Store the mapping
        userIdMap[user.id] = newUser.user.id;
      } catch (err) {
        console.error(`Error migrating user ${user.email}:`, err);
      }
    }
    
    // Update all tables with the new UUIDs
    // This part will depend on how your data is structured
    // Here's a basic example for a 'clients' table:
    console.log('Updating tables with new user IDs...');
    
    // For this script, we're only preparing the SQL - not executing
    // When ready to migrate for real, uncomment the execution parts
    
    for (const [oldId, newId] of Object.entries(userIdMap)) {
      const tables = ['clients', 'engagements', 'invoices', 'time_logs', 'business_info'];
      
      for (const table of tables) {
        const sql = `UPDATE ${table} SET user_id = '${newId}' WHERE user_id = ${oldId}`;
        console.log(`SQL for ${table}:`, sql);
        
        // Uncomment when ready to execute
        // await client.query(sql);
      }
    }
    
    console.log('Migration SQL statements prepared. Review and execute when ready.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateUsers().catch(console.error); 