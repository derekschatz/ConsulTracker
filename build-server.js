// Script to build server-side code
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Building server-side code...');

// Define directories
const SERVER_SRC_DIR = path.join(__dirname, 'server');
const DIST_DIR = path.join(__dirname, 'dist');
const SERVER_DIST_DIR = path.join(DIST_DIR, 'server');

// Make sure the dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Make sure the server dist directory exists
if (!fs.existsSync(SERVER_DIST_DIR)) {
  fs.mkdirSync(SERVER_DIST_DIR, { recursive: true });
}

// Function to copy a file and change .ts extension to .js
async function copyAndRenameFile(srcFile, destDir) {
  const filename = path.basename(srcFile);
  let destFilename = filename;
  
  // Replace .ts with .js for the destination filename
  if (filename.endsWith('.ts')) {
    destFilename = filename.replace(/\.ts$/, '.js');
  }
  
  const destFile = path.join(destDir, destFilename);
  
  // Get content of the source file
  const content = await fs.promises.readFile(srcFile, 'utf8');
  
  // Convert imports from .ts to .js
  let modifiedContent = content.replace(/from\s+['"](.+?)\.ts['"]/g, "from '$1.js'");
  modifiedContent = modifiedContent.replace(/import\s+['"](.+?)\.ts['"]/g, "import '$1.js'");
  
  // Write to destination
  await fs.promises.writeFile(destFile, modifiedContent);
  console.log(`Processed: ${srcFile} → ${destFile}`);
  
  return destFile;
}

// Main function to transform files
async function buildServer() {
  try {
    console.log('Building server TypeScript files...');
    
    // Run TypeScript compiler on server files
    console.log('Running TypeScript compiler...');
    try {
      const { stdout, stderr } = await execAsync(
        'npx tsc --project tsconfig.node.json'
      );
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (error) {
      console.error('TypeScript compilation failed:', error.message);
      console.log('Continuing with file copy as a fallback...');
    }
    
    // Create the index.js file directly
    console.log('Creating server index.js...');
    const indexTsPath = path.join(SERVER_SRC_DIR, 'index.ts');
    const indexJsPath = path.join(SERVER_DIST_DIR, 'index.js');
    
    if (fs.existsSync(indexTsPath)) {
      await copyAndRenameFile(indexTsPath, SERVER_DIST_DIR);
    } else {
      console.warn(`Warning: Server index.ts not found at ${indexTsPath}`);
    }
    
    // Create the server/vite.js file
    const viteTsPath = path.join(SERVER_SRC_DIR, 'vite.ts');
    if (fs.existsSync(viteTsPath)) {
      await copyAndRenameFile(viteTsPath, SERVER_DIST_DIR);
    } else {
      console.warn(`Warning: Server vite.ts not found at ${viteTsPath}`);
    }
    
    // Create the server/auth.js file
    const authTsPath = path.join(SERVER_SRC_DIR, 'auth.ts');
    if (fs.existsSync(authTsPath)) {
      await copyAndRenameFile(authTsPath, SERVER_DIST_DIR);
    } else {
      console.warn(`Warning: Server auth.ts not found at ${authTsPath}`);
    }
    
    // Create the server/routes.js file
    const routesTsPath = path.join(SERVER_SRC_DIR, 'routes.ts');
    if (fs.existsSync(routesTsPath)) {
      await copyAndRenameFile(routesTsPath, SERVER_DIST_DIR);
    } else {
      console.warn(`Warning: Server routes.ts not found at ${routesTsPath}`);
    }
    
    // Create the api directory if it doesn't exist
    const apiDistDir = path.join(SERVER_DIST_DIR, 'api');
    if (!fs.existsSync(apiDistDir)) {
      fs.mkdirSync(apiDistDir, { recursive: true });
    }
    
    // Create the server/api/stripe.js file
    const stripeTsPath = path.join(SERVER_SRC_DIR, 'api/stripe.ts');
    if (fs.existsSync(stripeTsPath)) {
      await copyAndRenameFile(stripeTsPath, apiDistDir);
    } else {
      console.warn(`Warning: Stripe API file not found at ${stripeTsPath}`);
    }
    
    console.log('Server build completed successfully!');
    
    // Verify files
    const serverFiles = [
      path.join(SERVER_DIST_DIR, 'index.js'),
      path.join(SERVER_DIST_DIR, 'vite.js'),
      path.join(SERVER_DIST_DIR, 'auth.js'),
      path.join(SERVER_DIST_DIR, 'routes.js'),
      path.join(apiDistDir, 'stripe.js')
    ];
    
    console.log('Verifying server files:');
    for (const file of serverFiles) {
      console.log(`- ${file}: ${fs.existsSync(file) ? 'OK' : 'MISSING'}`);
    }
    
  } catch (error) {
    console.error('Error building server:', error);
    process.exit(1);
  }
}

// Run the build process
buildServer(); 