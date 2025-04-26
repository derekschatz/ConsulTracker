import express from 'express';
import { registerRoutes } from '../server/routes';
import { serveStatic } from '../server/vite';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create a serverless-compatible handler
const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Setup middleware for logging
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

        console.log(logLine);
      }
    });

    next();
  });

  // Register Express routes
  try {
    const server = await registerRoutes(app);
    
    // Error handling middleware
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    });
    
    // Setup static files if in production
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    }
    
    // Handle the request with the configured app
    return app(req, res);
  } catch (error) {
    console.error('Error initializing server:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initialize server'
    });
  }
};

export default handler; 