// Serverless API handler for Vercel
import express from 'express';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Initialize PostgreSQL connection
const pool = process.env.DATABASE_URL 
  ? new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // For Supabase
    })
  : null;

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Database status endpoint
app.get('/api/dbstatus', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ status: 'error', message: 'Database not configured' });
  }
  
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'connected',
      serverTime: result.rows[0].now
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// Clients API endpoint
app.get('/api/clients', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ status: 'error', message: 'Database not configured' });
  }
  
  try {
    // Try to fetch clients, but check if the table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({ 
        status: 'no_table', 
        message: 'Clients table does not exist',
        tables: await listTables()
      });
    }
    
    const result = await pool.query('SELECT * FROM clients LIMIT 10');
    res.json({
      status: 'success',
      data: result.rows,
      count: result.rowCount
    });
  } catch (err) {
    console.error('Error fetching clients:', err);
    
    try {
      // If there's an error, try to list available tables
      const tables = await listTables();
      res.status(500).json({
        status: 'error',
        message: err.message,
        tables
      });
    } catch (tableErr) {
      res.status(500).json({
        status: 'error',
        message: err.message,
        tableError: tableErr.message
      });
    }
  }
});

// Helper function to list available tables
async function listTables() {
  if (!pool) return [];
  
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    return result.rows.map(row => row.table_name);
  } catch (err) {
    console.error('Error listing tables:', err);
    return [];
  }
}

// Helper for creating paths in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Static file serving for production
const publicDir = path.resolve(process.cwd(), 'dist', 'public');
app.use(express.static(publicDir));

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Unknown error'
  });
});

// Export handler for Vercel
export default function handler(req, res) {
  return app(req, res);
} 