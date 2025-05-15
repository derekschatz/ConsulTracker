
import express, { type Express, Router as ExpressRouter } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer, type Server } from "http";
import { pool } from '../db';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create API routes directory if it doesn't exist
const apiDir = path.join(__dirname, 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Add registerRoutes function
async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);
  
  // Add basic test route
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
  });

  return server;
}

// Export both router and registerRoutes
export default { router, registerRoutes };
