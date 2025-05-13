import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index.js";
import { setupVite, serveStatic, log } from "./vite";
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { handleError } from './serverError';
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

// Ensure the routes directory structure exists in production
if (process.env.NODE_ENV === 'production') {
  const routesDir = path.join(__dirname, 'routes');
  const apiDir = path.join(routesDir, 'api');
  
  if (!fs.existsSync(routesDir)) {
    console.log('Creating routes directory:', routesDir);
    fs.mkdirSync(routesDir, { recursive: true });
  }
  
  if (!fs.existsSync(apiDir)) {
    console.log('Creating routes/api directory:', apiDir);
    fs.mkdirSync(apiDir, { recursive: true });
  }
  
  // Log directory structure for debugging
  console.log('Directory structure after ensuring paths:');
  console.log('- Routes dir exists:', fs.existsSync(routesDir));
  console.log('- API dir exists:', fs.existsSync(apiDir));
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

(async () => {
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try ports in sequence until one works
  const tryPort = async (port: number): Promise<number> => {
    try {
      await new Promise((resolve, reject) => {
        server.listen({
          port,
          host: "0.0.0.0",
          reusePort: true,
        }, () => {
          log(`serving on port ${port}`);
          resolve(port);
        }).once('error', reject);
      });
      return port;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE') {
        log(`Port ${port} in use, trying ${port + 1}`);
        return tryPort(port + 1);
      }
      throw err;
    }
  };

  // Start with preferred port (from env or 5000)
  const startPort = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  try {
    // For Replit deployment, port 5000 is mapped to external port 80
    const portToUse = app.get("env") === "production" ? 5000 : startPort;
    await tryPort(portToUse);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
