// Test ES modules directory imports
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current directory:', __dirname);

// Try importing the routes-init.js file
try {
  const routesInitPath = './dist/server/routes-init.js';
  console.log(`Importing ${routesInitPath}...`);
  const routesInit = await import(routesInitPath);
  console.log('Successfully imported routes-init.js:', Object.keys(routesInit));
} catch (err) {
  console.error('Error importing routes-init.js:', err.message);
}

// Try importing the routes/index.js file
try {
  const routesIndexPath = './dist/server/routes/index.js';
  console.log(`Importing ${routesIndexPath}...`);
  const routesIndex = await import(routesIndexPath);
  console.log('Successfully imported routes/index.js:', Object.keys(routesIndex));
} catch (err) {
  console.error('Error importing routes/index.js:', err.message);
}

// Try importing the API modules
try {
  const stripeApiPath = './dist/server/api/stripe.js';
  console.log(`Importing ${stripeApiPath}...`);
  // Since we just copied the .ts file, this will fail
  // But we can check if the file exists
  console.log('File exists:', fs.existsSync(path.join(__dirname, 'dist/server/api/stripe.js')));
} catch (err) {
  console.error('Error importing API module:', err.message);
}
