/**
 * Module loader utility for dynamic imports in both development and production environments
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Loads a module dynamically with fallbacks for different environments
 */
export async function loadModule(modulePath: string) {
  try {
    // First try direct ES module import
    return await import(modulePath);
  } catch (error) {
    console.error(`Failed to load module: ${modulePath}`, error);
    
    // Try alternative paths if the direct import fails
    try {
      const alternativePath = path.join(__dirname, '..', modulePath.replace('@shared/', 'shared/'));
      console.log(`Trying alternative path: ${alternativePath}`);
      return await import(alternativePath);
    } catch (altError) {
      console.error(`Failed to load module from alternative path: ${altError}`);
      
      // Last resort - try CommonJS require
      try {
        console.log(`Trying require for: ${modulePath}`);
        const resolved = require.resolve(modulePath.replace('@shared/', 'shared/'));
        return require(resolved);
      } catch (requireError) {
        console.error(`All module loading attempts failed for: ${modulePath}`, requireError);
        throw new Error(`Unable to load module: ${modulePath}`);
      }
    }
  }
}

/**
 * Specifically loads the shared schema with fallbacks
 */
export async function loadSharedSchema() {
  try {
    // Try different paths for the schema
    const possiblePaths = [
      '@shared/schema.js',
      '../shared/schema.js',
      '../../shared/schema.js',
      path.join(__dirname, '../shared/schema.js'),
      path.join(__dirname, '../../shared/schema.js')
    ];
    
    // Try each path in sequence
    for (const schemaPath of possiblePaths) {
      try {
        console.log(`Trying to load schema from: ${schemaPath}`);
        return await import(schemaPath);
      } catch (e) {
        console.log(`Failed to load from ${schemaPath}`);
      }
    }
    
    // If all imports fail, try CommonJS require
    return require('../shared/schema.js');
  } catch (error) {
    console.error('All attempts to load schema failed:', error);
    throw new Error('Could not load shared schema from any location');
  }
}

export default {
  loadModule,
  loadSharedSchema
}; 