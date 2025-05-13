import { Router } from 'express';
import stripeRoutes from '../api/stripe';
import testRoutes from '../api/test';

const router = Router();

export function registerRoutes(app) {
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/test', testRoutes);
  return router;
}

export default router;