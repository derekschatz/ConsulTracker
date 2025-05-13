/**
 * Routes index file - provides explicit exports for ES module compatibility
 */

import { Router } from 'express';

// Create and export the router
const router = Router();
export default router;

// Empty exports to ensure this module can be imported properly
export const routes = {};
export const __esModule = true; 