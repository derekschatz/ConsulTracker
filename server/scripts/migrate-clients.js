#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import { eq, and } from 'drizzle-orm';
import fs from 'fs';

// Make sure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateClients() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database, starting migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    console.log('Adding billing columns to clients table...');
    await client.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
      ADD COLUMN IF NOT EXISTS billing_address TEXT,
      ADD COLUMN IF NOT EXISTS billing_city TEXT,
      ADD COLUMN IF NOT EXISTS billing_state TEXT,
      ADD COLUMN IF NOT EXISTS billing_zip TEXT,
      ADD COLUMN IF NOT EXISTS billing_country TEXT
    `);
    
    console.log('Finding unique clients from engagements...');
    const { rows: uniqueClients } = await client.query(`
      SELECT DISTINCT user_id, client_name 
      FROM engagements 
      WHERE client_id IS NULL
    `);
    
    console.log(`Found ${uniqueClients.length} unique clients to migrate`);
    
    // Insert clients if any found
    if (uniqueClients.length > 0) {
      for (const clientData of uniqueClients) {
        try {
          await client.query(
            'INSERT INTO clients (user_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [clientData.user_id, clientData.client_name]
          );
        } catch (err) {
          console.warn(`Couldn't insert client ${clientData.client_name}:`, err.message);
        }
      }
      console.log('Clients inserted successfully');
    }
    
    console.log('Updating engagements with client_id...');
    const updateResult = await client.query(`
      UPDATE engagements e
      SET client_id = c.id
      FROM clients c
      WHERE e.client_name = c.name
        AND e.user_id = c.user_id
        AND e.client_id IS NULL
      RETURNING e.id
    `);
    
    console.log(`Updated ${updateResult.rowCount} engagements with client IDs`);
    
    // Only try to make client_id NOT NULL if all engagements have been updated
    const { rows: remaining } = await client.query(
      'SELECT COUNT(*) as count FROM engagements WHERE client_id IS NULL'
    );
    
    if (parseInt(remaining[0].count) === 0) {
      console.log('Making client_id NOT NULL...');
      await client.query(`
        ALTER TABLE engagements
        ALTER COLUMN client_id SET NOT NULL
      `);
    } else {
      console.warn(`Cannot make client_id NOT NULL yet. ${remaining[0].count} engagements still have NULL client_id`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateClients()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration process failed:', err);
    process.exit(1);
  }); 