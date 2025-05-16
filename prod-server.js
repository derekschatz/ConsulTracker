// Production server entry point (no TypeScript syntax)
import express from "express";
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// File system paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Server root directory:', __dirname);

// Set up Express app
const app = express();

// Configure middleware
app.use(express.urlencoded({ extended: false }));

// Configure JSON parsing for different routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  if (req.path === '/api/stripe/webhook') {
    bodyParser.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// Add response time and debug logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.call(res, bodyJson, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Import routes if they exist
try {
  // We don't actually try to import these in production since they're not needed
  // This minimal server will work without them
  console.log('Skipping route imports in minimal production server');
} catch (error) {
  console.warn('Routes module not found or could not be loaded:', error.message);
}

// 404 handler for API routes to prevent fallthrough to client routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.originalUrl}` });
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Final catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Function to try different ports
const tryPort = async (port, maxAttempts = 10) => {
  let currentPort = port;
  let attempts = 0;
  
  const server = createServer(app);
  
  while (attempts < maxAttempts) {
    try {
      await new Promise((resolve, reject) => {
        server.listen(currentPort, '0.0.0.0', () => {
          console.log(`Server running on port ${currentPort}`);
          resolve();
        });
        
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Port ${currentPort} already in use, trying ${currentPort + 1}`);
            server.close();
            currentPort++;
            attempts++;
            reject(err);
          } else {
            reject(err);
          }
        });
      });
      
      // If we get here, the server started successfully
      return;
    } catch (err) {
      if (attempts >= maxAttempts) {
        console.error(`Failed to find an available port after ${maxAttempts} attempts`);
        throw err;
      }
      // Continue to the next iteration to try the next port
    }
  }
};

// Start server with port retry logic
const startPort = process.env.PORT ? parseInt(process.env.PORT) : 5000;
tryPort(startPort).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 