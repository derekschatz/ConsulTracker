// Serverless API handler for Vercel
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

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

// Static file serving for production
const publicDir = path.join(process.cwd(), 'dist', 'public');
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
module.exports = (req, res) => {
  return app(req, res);
}; 