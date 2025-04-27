/**
 * Main Router
 * 
 * This file creates the main Express router and combines all route handlers.
 */

import { Router } from 'express';
import { createClientRoutes } from './client-routes';
import { DatabaseStorage } from './database-storage';

/**
 * Create the main application router
 */
export function createRouter(storage: DatabaseStorage): Router {
  const router = Router();
  
  // Mount specific route modules
  router.use('/clients', createClientRoutes(storage));
  
  // Add more route modules as they are created
  // router.use('/engagements', createEngagementRoutes(storage));
  // router.use('/time-logs', createTimeLogRoutes(storage));
  // router.use('/invoices', createInvoiceRoutes(storage));
  
  return router;
} 