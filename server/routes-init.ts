/**
 * Routes initialization module to avoid direct directory imports
 * This provides a single entry point for all route registrations
 */

import { Router } from 'express';
import type { Express } from 'express';
import { createServer, type Server } from "http";
import stripeRoutes from './api/stripe';
import testRoutes from './api/test';

// Create a master router
const masterRouter = Router();

// Initialize and register all routes through this function
export async function initializeRoutes(app: Express): Promise<Server> {
  // Create an HTTP server
  const server = createServer(app);
  
  // Register API routes
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/test', testRoutes);
  
  // Register the master router
  app.use('/', masterRouter);
  
  console.log('Routes initialized via routes-init.ts');
  
  return server;
}

// Export default router for compatibility
export default masterRouter; 