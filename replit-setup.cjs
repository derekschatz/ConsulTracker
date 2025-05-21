// Replit setup script
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running Replit setup script...');

// Check if we need to create a fix-prod-build.js file
if (!fs.existsSync('fix-prod-build.js')) {
  console.log('Creating fix-prod-build.js file...');
  
  const fixProdBuildContent = `// Script to prepare the build for production environment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');
const SERVER_DIST_DIR = path.join(DIST_DIR, 'server');
const CLIENT_DIST_DIR = path.join(DIST_DIR, 'client');

console.log('Preparing production build...');

// Verify the dist directory structure
function verifyDistStructure() {
  // Check if main dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error(\`Error: Dist directory not found at \${DIST_DIR}\`);
    process.exit(1);
  }

  // Check if server dist directory exists
  if (!fs.existsSync(SERVER_DIST_DIR)) {
    console.error(\`Error: Server dist directory not found at \${SERVER_DIST_DIR}\`);
    process.exit(1);
  }

  console.log('Dist directory structure verified.');
}

// Create a proper server entry point
function ensureServerEntry() {
  const serverIndexPath = path.join(SERVER_DIST_DIR, 'index.js');
  
  if (fs.existsSync(serverIndexPath)) {
    // Check if we need to modify the index.js file
    const content = fs.readFileSync(serverIndexPath, 'utf8');
    
    // If it already has our modifications, don't do anything
    if (content.includes('// Modified for production by fix-prod-build.js')) {
      console.log('Server entry point already modified for production.');
      return;
    }
    
    // Create a backup of the original file
    fs.writeFileSync(\`\${serverIndexPath}.bak\`, content);
    console.log(\`Created backup of server entry point at \${serverIndexPath}.bak\`);
  }
  
  // Create a robust server entry point that correctly handles imports
  console.log(\`Creating/updating server entry point at \${serverIndexPath}\`);
  const content = \`// Modified for production by fix-prod-build.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Ensure we have proper dirname support in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up Express app
const app = express();

// Try to load server routes or use fallback
try {
  // First try to import the production server
  const prodServerPath = path.join(__dirname, '..', 'prod-server.js');
  if (fs.existsSync(prodServerPath)) {
    console.log('Loading production server from prod-server.js');
    import('../prod-server.js');
  } else {
    console.log('Loading routes from server routes.js');
    // Import routes module
    const routes = await import('./routes.js');
    if (typeof routes.default === 'function') {
      routes.default(app);
    } else if (typeof routes.registerRoutes === 'function') {
      routes.registerRoutes(app);
    } else {
      console.warn('Could not find routes export, setting up minimal server');
      
      // Serve static files
      app.use(express.static(path.join(__dirname, '..', 'public')));
      
      // Basic API endpoint
      app.get('/api/status', (req, res) => {
        res.json({ status: 'ok', env: process.env.NODE_ENV });
      });
      
      // SPA handler
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
      });
      
      // Start the server
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(\\\`Server running on port \\\${PORT}\\\`);
      });
    }
  }
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}
\`;
  fs.writeFileSync(serverIndexPath, content);
  console.log('Server entry point updated for production.');
}

// Copy production server file if needed
function copyProdServer() {
  const prodServerSrc = path.join(__dirname, 'prod-server.js');
  const prodServerDest = path.join(DIST_DIR, 'prod-server.js');
  
  if (fs.existsSync(prodServerSrc)) {
    fs.copyFileSync(prodServerSrc, prodServerDest);
    console.log(\`Copied production server from \${prodServerSrc} to \${prodServerDest}\`);
  } else {
    console.warn(\`Warning: Production server file not found at \${prodServerSrc}\`);
  }
}

// Main function to prepare the production build
function prepareProductionBuild() {
  try {
    console.log('Starting production build preparation...');
    
    // Verify the dist structure
    verifyDistStructure();
    
    // Ensure server entry point is set up correctly
    ensureServerEntry();
    
    // Copy production server file
    copyProdServer();
    
    console.log('Production build preparation completed successfully!');
  } catch (error) {
    console.error('Error preparing production build:', error);
    process.exit(1);
  }
}

// Run the preparation
prepareProductionBuild();`;
  
  fs.writeFileSync('fix-prod-build.js', fixProdBuildContent);
  console.log('Created fix-prod-build.js file.');
}

// Update package.json to ensure postbuild script is correct
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    console.log('Checking package.json postbuild script...');
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check if postbuild script exists and points to fix-prod-build.js
    if (!packageJson.scripts || !packageJson.scripts.postbuild || packageJson.scripts.postbuild !== 'node fix-prod-build.js') {
      console.log('Updating package.json postbuild script...');
      
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      packageJson.scripts.postbuild = 'node fix-prod-build.js';
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('Updated package.json postbuild script.');
    } else {
      console.log('Package.json postbuild script is already correct.');
    }
  }
} catch (error) {
  console.error('Error updating package.json:', error);
}

console.log('Replit setup completed successfully!'); 