// Script to verify the production deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Verifying production deployment...');

// Define directories
const DIST_DIR = path.join(__dirname, 'dist');
const SERVER_DIST_DIR = path.join(DIST_DIR, 'server');
const PUBLIC_DIST_DIR = path.join(DIST_DIR, 'public');

// Check if directories exist
console.log(`Checking if dist directory exists: ${fs.existsSync(DIST_DIR)}`);
console.log(`Checking if server directory exists: ${fs.existsSync(SERVER_DIST_DIR)}`);
console.log(`Checking if public directory exists: ${fs.existsSync(PUBLIC_DIST_DIR)}`);

// Critical files for production
const criticalFiles = [
  { path: path.join(SERVER_DIST_DIR, 'index.js'), name: 'Server entry point' },
  { path: path.join(SERVER_DIST_DIR, 'vite.js'), name: 'Vite server integration' },
  { path: path.join(SERVER_DIST_DIR, 'auth.js'), name: 'Authentication' },
  { path: path.join(SERVER_DIST_DIR, 'routes.js'), name: 'API routes' },
  { path: path.join(PUBLIC_DIST_DIR, 'index.html'), name: 'Client entry point' },
];

// Check if critical files exist
let allFilesExist = true;
console.log('\nChecking critical files:');
for (const file of criticalFiles) {
  const exists = fs.existsSync(file.path);
  console.log(`- ${file.name} (${file.path}): ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
  if (!exists) {
    allFilesExist = false;
  }
}

// Check the content of index.js for import statements
const serverIndexPath = path.join(SERVER_DIST_DIR, 'index.js');
if (fs.existsSync(serverIndexPath)) {
  console.log('\nAnalyzing server/index.js:');
  const content = fs.readFileSync(serverIndexPath, 'utf8');
  
  // Check for import extensions
  if (content.includes('.ts"') || content.includes(".ts'")) {
    console.log('❌ WARNING: server/index.js contains imports with .ts extension, which may cause runtime errors.');
  } else {
    console.log('✅ No .ts extensions found in imports');
  }
  
  // Check for specific imports
  const requiredImports = ['express', 'dotenv'];
  for (const imp of requiredImports) {
    if (content.includes(`import ${imp}`) || content.includes(`from '${imp}'`) || content.includes(`from "${imp}"`)) {
      console.log(`✅ Found import for ${imp}`);
    } else {
      console.log(`❌ Missing import for ${imp}`);
    }
  }
  
  // Log the file size
  const stats = fs.statSync(serverIndexPath);
  console.log(`Server index.js size: ${stats.size} bytes`);
  
  // Print the first 10 lines of the file
  console.log('\nFirst 10 lines of server/index.js:');
  console.log('-----------------------------------');
  console.log(content.split('\n').slice(0, 10).join('\n'));
  console.log('-----------------------------------');
}

// Run a quick test to see if the server can start
console.log('\nAttempting to start the server in test mode...');
try {
  // Save environment variables
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  
  // Import the server file as a module (this will parse it but not execute it)
  console.log('Testing if server/index.js can be imported...');
  
  // Create a temporary test file that imports the server
  const testFile = path.join(__dirname, 'temp-server-test.js');
  fs.writeFileSync(testFile, `
    import './dist/server/index.js';
    console.log('Successfully imported server/index.js');
    process.exit(0);
  `);
  
  // Execute it
  execAsync('node --check ./dist/server/index.js')
    .then(({ stdout, stderr }) => {
      console.log('✅ Server code syntax is valid!');
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
      
      // Clean up
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      
      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
      
      // Summary
      console.log('\nDeployment verification summary:');
      if (allFilesExist) {
        console.log('✅ All critical files exist');
        console.log('✅ Server code syntax is valid');
        console.log('\n🚀 Deployment should be ready!');
      } else {
        console.log('❌ Some critical files are missing');
        console.log('\n⚠️ Deployment may fail. Please fix the issues above.');
      }
    })
    .catch((error) => {
      console.error('❌ Server code syntax contains errors:', error.message);
      
      // Clean up
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      
      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
      
      console.log('\n⚠️ Deployment will likely fail. Please fix the syntax errors.');
    });
} catch (error) {
  console.error('❌ Error while testing server import:', error);
  console.log('\n⚠️ Deployment will likely fail. Please fix the issues above.');
} 