/**
 * ESM compatibility utilities for production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Create a __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Ensures directory structure exists for ESM imports
 */
export function ensureDirectoryStructure() {
  // Check and create server/routes directory
  const routesDir = path.join(__dirname, 'routes');
  if (!fs.existsSync(routesDir)) {
    console.log('[ESM] Creating routes directory:', routesDir);
    fs.mkdirSync(routesDir, { recursive: true });
    
    // Create ES module-compatible index.js
    const indexPath = path.join(routesDir, 'index.js');
    fs.writeFileSync(
      indexPath,
      `/**
 * Routes index - auto-generated for ES module compatibility
 */

export default {};
export const routes = {};
export const __esModule = true;`
    );
    console.log('[ESM] Created routes/index.js as ES module');
  }
  
  // Check and create server/routes/api directory
  const apiDir = path.join(routesDir, 'api');
  if (!fs.existsSync(apiDir)) {
    console.log('[ESM] Creating routes/api directory:', apiDir);
    fs.mkdirSync(apiDir, { recursive: true });
    
    // Create ES module-compatible index.js
    const apiIndexPath = path.join(apiDir, 'index.js');
    fs.writeFileSync(
      apiIndexPath,
      `/**
 * API routes index - auto-generated for ES module compatibility
 */

export default {};
export const routes = {};
export const __esModule = true;`
    );
    console.log('[ESM] Created routes/api/index.js as ES module');
  }
  
  // Log status
  console.log('[ESM] Directory structure check complete');
  console.log('[ESM] - Routes dir:', fs.existsSync(routesDir));
  console.log('[ESM] - API dir:', fs.existsSync(apiDir));
  
  return {
    routesDir,
    apiDir
  };
}

/**
 * Gets a safe import object that won't fail in production
 */
export function getSafeImport(importPath: string) {
  // Return a default empty object that works with ESM
  return { default: {}, routes: {}, __esModule: true };
} 