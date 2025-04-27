#!/usr/bin/env node

/**
 * Supabase Migration Script
 * 
 * This script helps migrate the database schema to a Supabase PostgreSQL database.
 * It creates the tables defined in the simplified schema for Supabase.
 */

require('dotenv').config();
const { Pool } = require('pg');
const schema = require('./server/supabase-schema');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: DATABASE_URL environment variable is not set');
  console.log('\nPlease set up your database connection first by running:');
  console.log('node setup-env.js');
  process.exit(1);
}

// Format the connection string for display (hide password)
const formatConnectionString = (connString) => {
  try {
    const url = new URL(connString);
    // Mask the password
    url.password = '********';
    return url.toString();
  } catch (err) {
    return 'Invalid connection string format';
  }
};

// Create SQL for a table
const createTableSQL = (table) => {
  const tableName = table._._name;
  const columns = [];
  
  for (const [columnName, column] of Object.entries(table.$inferInsert.columns)) {
    let sqlType = '';
    
    switch (column.dataType) {
      case 'text':
        sqlType = 'TEXT';
        break;
      case 'serial':
        sqlType = 'SERIAL';
        break;
      case 'integer':
        sqlType = 'INTEGER';
        break;
      case 'timestamp':
        sqlType = 'TIMESTAMP WITH TIME ZONE';
        break;
      case 'numeric':
        sqlType = 'NUMERIC';
        break;
      case 'varchar':
        sqlType = 'VARCHAR';
        break;
      default:
        sqlType = 'TEXT';
    }
    
    let columnDef = `"${column.name}" ${sqlType}`;
    
    if (column.primaryKey) {
      columnDef += ' PRIMARY KEY';
    }
    
    if (column.notNull) {
      columnDef += ' NOT NULL';
    }
    
    if (column.unique) {
      columnDef += ' UNIQUE';
    }
    
    if (column.default !== undefined) {
      if (column.default === 'now()') {
        columnDef += ' DEFAULT NOW()';
      } else if (typeof column.default === 'string') {
        columnDef += ` DEFAULT '${column.default}'`;
      } else {
        columnDef += ` DEFAULT ${column.default}`;
      }
    }
    
    columns.push(columnDef);
  }
  
  return `
CREATE TABLE IF NOT EXISTS "${tableName}" (
  ${columns.join(',\n  ')}
);

-- Add RLS policies for Supabase
ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access only their own data
CREATE POLICY "${tableName}_user_policy" 
  ON "${tableName}" 
  FOR ALL 
  USING (user_id = auth.uid()::integer);
  `.trim();
};

// Main migration function
async function migrateToSupabase() {
  console.log('\n🚀 Starting Supabase Schema Migration\n');
  console.log('Connection:', formatConnectionString(process.env.DATABASE_URL));
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Supabase connections
    }
  });
  
  let client;
  
  try {
    // Connect to the database
    console.log('Connecting to database...');
    client = await pool.connect();
    
    // Enable UUID extension for Supabase Auth
    console.log('\nEnabling UUID extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    // Create the tables
    for (const [tableName, table] of Object.entries(schema)) {
      console.log(`\nCreating table: ${tableName}`);
      
      try {
        const sql = createTableSQL(table);
        console.log(sql);
        await client.query(sql);
        console.log(`✅ Table ${tableName} created successfully`);
      } catch (err) {
        console.error(`❌ Error creating table ${tableName}:`, err.message);
      }
    }
    
    console.log('\n✅ Schema migration completed successfully');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
  } finally {
    if (client) {
      client.release();
    }
    
    await pool.end();
  }
}

// Run the migration
migrateToSupabase().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 