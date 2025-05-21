const fs = require('fs');
const path = require('path');

console.log('Current directory:', __dirname);
console.log('Files in current directory:');

try {
  const files = fs.readdirSync(__dirname);
  files.forEach(file => {
    const stats = fs.statSync(path.join(__dirname, file));
    console.log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'}, ${stats.size} bytes)`);
  });
} catch (error) {
  console.error('Error reading directory:', error);
}

// Check if fix-prod-build.js exists
const fixProdBuildPath = path.join(__dirname, 'fix-prod-build.js');
console.log(`\nChecking for fix-prod-build.js at ${fixProdBuildPath}:`);
console.log(`Exists: ${fs.existsSync(fixProdBuildPath)}`);

// Check the prod-server.js was updated
const prodServerPath = path.join(__dirname, 'prod-server.js');
console.log(`\nChecking for prod-server.js at ${prodServerPath}:`);
console.log(`Exists: ${fs.existsSync(prodServerPath)}`);

if (fs.existsSync(prodServerPath)) {
  const content = fs.readFileSync(prodServerPath, 'utf8');
  console.log(`Contains MIME type configuration: ${content.includes('setHeader(\'Content-Type\', \'application/javascript\')')}`);
} 