import express, { type Request, Response, NextFunction } from "express";
// Import our custom route initialization instead of directory imports
import { initializeRoutes } from "./routes-init.js";
import { setupVite, serveStatic, log } from "./vite";
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { handleError } from './serverError';
import { ensureDirectoryStructure } from './esm-compat';
import http from 'http';
dotenv.config();

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(error);
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});

// Log file system paths for debugging routes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Server root directory:', __dirname);
console.log('Routes directory should be at:', path.join(__dirname, 'routes'));
console.log('Current environment:', process.env.NODE_ENV);

// Call the directory structure utility for ESM compatibility
if (process.env.NODE_ENV === 'production') {
  console.log('Running production mode setup');
  ensureDirectoryStructure();
  
  // Create ES Module version of routes files
  const routesIndexPath = path.join(__dirname, 'routes', 'index.js');
  console.log('Creating ES Module routes index at:', routesIndexPath);
  if (!fs.existsSync(path.dirname(routesIndexPath))) {
    fs.mkdirSync(path.dirname(routesIndexPath), { recursive: true });
  }
  fs.writeFileSync(
    routesIndexPath,
    `/**\n * Routes index - auto-generated for ES module compatibility\n */\n\nexport default {};\nexport const routes = {};\nexport const __esModule = true;`
  );
  
  // Create empty index.js in routes/api as ES Module
  const apiDirPath = path.join(__dirname, 'routes', 'api');
  if (!fs.existsSync(apiDirPath)) {
    fs.mkdirSync(apiDirPath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(apiDirPath, 'index.js'),
    `/**\n * API routes index - auto-generated for ES module compatibility\n */\n\nexport default {};\nexport const routes = {};\nexport const __esModule = true;`
  );
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add middleware for raw bodies (needed for Stripe webhook verification)
app.use((req, res, next) => {
  if (req.path === '/api/stripe/webhook') {
    bodyParser.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
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

      log(logLine);
    }
  });

  next();
});

// Add a test route before registering other routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Add a test route for the stripe endpoint to diagnose
app.post('/api/stripe-test', (req, res) => {
  console.log('Received stripe-test request:', {
    body: req.body,
    headers: req.headers,
    method: req.method,
  });
  res.json({ success: true, message: 'Stripe test endpoint working', received: req.body });
});

console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  STRIPE_KEY_AVAILABLE: !!process.env.STRIPE_SECRET_KEY,
});

// Initialize routes and start server
(async () => {
  try {
    // Use initializeRoutes instead of registerRoutes
    const server = await initializeRoutes(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const preferredPort = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    let port = preferredPort;
    let maxPortAttempts = 10;
    let httpServer;

    // Try to start on the preferred port, or find an available port if it's taken
    while (maxPortAttempts > 0) {
      try {
        httpServer = http.createServer(app);
        httpServer.listen(port, '0.0.0.0', () => {
          console.log(`Server running on port ${port}`);
        });
        break; // If server starts successfully, break the loop
      } catch (err: any) {
        if (err.code === 'EADDRINUSE' && maxPortAttempts > 1) {
          console.log(`Port ${port} is in use, trying port ${port + 1}`);
          port++;
          maxPortAttempts--;
        } else {
          throw err; // Rethrow if it's not a port conflict or we've tried too many times
        }
      }
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
