// This file ensures that the routes directory structure is properly copied to the dist folder
// It can be imported from server code using ESM imports

import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log directory contents for debugging
console.log('Routes directory contents:', fs.readdirSync(__dirname));
console.log('API directory path:', path.join(__dirname, 'api'));

// Check for API directory and create it if it doesn't exist (for production build)
const apiDirPath = path.join(__dirname, 'api');
if (!fs.existsSync(apiDirPath)) {
  try {
    fs.mkdirSync(apiDirPath, { recursive: true });
    console.log('Created API directory:', apiDirPath);
  } catch (err) {
    console.error('Error creating API directory:', err);
  }
}

// Check if api directory exists
if (fs.existsSync(path.join(__dirname, 'api'))) {
  console.log('API directory contents:', fs.readdirSync(path.join(__dirname, 'api')));
}

// Export as CommonJS for compatibility
export default router;
export const __esModule = true; 