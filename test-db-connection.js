#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * This script tests the connection to the Supabase PostgreSQL database
 * and provides detailed diagnostics if the connection fails.
 */

// Import the PostgreSQL client
const { Pool } = require('pg');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: DATABASE_URL environment variable is not set');
  console.log('\nPlease set the DATABASE_URL environment variable in one of these ways:');
  console.log('1. Create a .env file with DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres');
  console.log('2. Export it in your terminal: export DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres');
  console.log('3. Set it in your project settings in your IDE or deployment platform\n');
  process.exit(1);
}

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set a reasonable timeout
  connectionTimeoutMillis: 10000,
});

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

console.log('\n🔍 Testing database connection...');
console.log('Connection string: ' + formatConnectionString(process.env.DATABASE_URL));

// Test the connection
(async () => {
  let client;
  
  try {
    // Attempt to connect
    console.log('Connecting to database...');
    client = await pool.connect();
    
    // Run a simple query
    console.log('Running test query...');
    const result = await client.query('SELECT current_timestamp as now');
    
    // Print success message
    console.log('\x1b[32m%s\x1b[0m', '✅ Database connection successful!');
    console.log(`Server time: ${result.rows[0].now}`);
    
  } catch (err) {
    // Handle connection errors with detailed diagnostics
    console.error('\x1b[31m%s\x1b[0m', '❌ Database connection failed');
    console.error('\nError details:');
    console.error(err.message);
    
    // Provide helpful error diagnostics
    if (err.code === 'ENOTFOUND') {
      console.log('\nThe database hostname could not be found. Please check:');
      console.log('1. The hostname part of your connection string is correct');
      console.log('2. Your internet connection is working');
      console.log('3. DNS resolution is working correctly');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('\nConnection was refused. Please check:');
      console.log('1. The database server is running and accepting connections');
      console.log('2. The port number is correct');
      console.log('3. Any firewalls or network security groups allow the connection');
    } else if (err.code === '28P01') {
      console.log('\nAuthentication failed. Please check:');
      console.log('1. The username and password are correct');
      console.log('2. The user has permission to access the database');
    } else if (err.code === '3D000') {
      console.log('\nDatabase does not exist. Please check:');
      console.log('1. The database name is correct');
      console.log('2. The database has been created on the server');
    } else {
      console.log('\nTroubleshooting tips:');
      console.log('1. Check if the Supabase project is running');
      console.log('2. Verify that the connection string format is correct');
      console.log('3. Make sure your IP address is allowed in Supabase network settings');
      console.log('4. Check if your database supports SSL (Supabase requires it)');
    }
    
    process.exit(1);
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
    
    // Close the pool
    await pool.end();
  }
})(); 