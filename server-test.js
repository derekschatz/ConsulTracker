#!/usr/bin/env node

/**
 * Express Server Test Script
 * 
 * This script starts a simple Express server that connects to the database
 * and provides a health check endpoint to verify database connectivity.
 */

// Import required dependencies
const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: DATABASE_URL environment variable is not set');
  console.log('\nPlease configure your database connection by running:');
  console.log('node setup-env.js');
  process.exit(1);
}

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections
  }
});

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Attempt database connection
    const client = await pool.connect();
    const result = await client.query('SELECT current_timestamp as server_time');
    client.release();
    
    res.json({
      status: 'ok',
      database: 'connected',
      server_time: result.rows[0].server_time,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Database test endpoint
app.get('/api/tables', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    client.release();
    
    res.json({
      tables: result.rows.map(row => row.table_name)
    });
  } catch (error) {
    console.error('Failed to fetch database tables:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`\n🚀 Server running at http://localhost:${port}`);
  console.log('Database connection configured. Try these endpoints:');
  console.log(`- http://localhost:${port}/api/health`);
  console.log(`- http://localhost:${port}/api/tables`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (err) {
    console.error('Error closing database pool:', err);
  }
  
  process.exit(0);
}); 