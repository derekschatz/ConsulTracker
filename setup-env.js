#!/usr/bin/env node

/**
 * Environment Setup Script for Supabase Connection
 * 
 * This script helps set up the required environment variables
 * for connecting to a Supabase PostgreSQL database.
 */

const fs = require('fs');
const readline = require('readline');
const { exec } = require('child_process');
const path = require('path');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Environment file path
const envPath = path.join(__dirname, '.env');

// Check if .env file already exists
const envExists = fs.existsSync(envPath);

console.log('\n📝 Supabase Database Connection Setup\n');

if (envExists) {
  console.log('An .env file already exists. Do you want to update it? (y/n)');
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      getSupabaseCredentials();
    } else {
      console.log('\nSetup cancelled. Existing .env file was not modified.');
      rl.close();
    }
  });
} else {
  getSupabaseCredentials();
}

function getSupabaseCredentials() {
  console.log('\nPlease enter your Supabase credentials:');
  
  rl.question('Supabase Project ID: ', (projectId) => {
    rl.question('Supabase Database Password: ', (password) => {
      rl.question('Session Secret (or press enter to generate one): ', (sessionSecret) => {
        // Generate a random session secret if not provided
        if (!sessionSecret) {
          sessionSecret = require('crypto').randomBytes(32).toString('hex');
          console.log(`Generated session secret: ${sessionSecret}`);
        }
        
        // Create the DATABASE_URL
        const databaseUrl = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;
        
        // Read existing env file if it exists
        let envContent = '';
        if (envExists) {
          envContent = fs.readFileSync(envPath, 'utf8');
          
          // Update DATABASE_URL
          if (envContent.includes('DATABASE_URL=')) {
            envContent = envContent.replace(/DATABASE_URL=.*$/m, `DATABASE_URL=${databaseUrl}`);
          } else {
            envContent += `\nDATABASE_URL=${databaseUrl}`;
          }
          
          // Update SESSION_SECRET
          if (envContent.includes('SESSION_SECRET=')) {
            envContent = envContent.replace(/SESSION_SECRET=.*$/m, `SESSION_SECRET=${sessionSecret}`);
          } else {
            envContent += `\nSESSION_SECRET=${sessionSecret}`;
          }
        } else {
          // Create new env content
          envContent = `# Database connection to Supabase
DATABASE_URL=${databaseUrl}

# Session configuration
SESSION_SECRET=${sessionSecret}

# Application settings
NODE_ENV=development
PORT=3000
`;
        }
        
        // Write to .env file
        fs.writeFileSync(envPath, envContent);
        console.log('\n✅ .env file has been created/updated with your Supabase credentials.');
        
        // Suggest to test the connection
        console.log('\nWould you like to test the database connection now? (y/n)');
        rl.question('> ', (answer) => {
          if (answer.toLowerCase() === 'y') {
            console.log('\nTesting database connection...');
            exec('node test-db-connection.js', (error, stdout, stderr) => {
              console.log(stdout);
              if (error) {
                console.error(stderr);
                console.log('\n❌ Connection test failed. Please check your credentials and try again.');
              }
              rl.close();
            });
          } else {
            console.log('\nYou can test the connection later by running:');
            console.log('node test-db-connection.js');
            rl.close();
          }
        });
      });
    });
  });
}

rl.on('close', () => {
  console.log('\n👋 Setup completed.');
  process.exit(0);
}); 