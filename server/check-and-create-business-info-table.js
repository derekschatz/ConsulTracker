// Script to check if business_info table exists and create it if needed
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('Starting check-and-create-business-info-table script...');

// Check if DATABASE_URL is set
const connectionString = process.env.DATABASE_URL;
console.log('Database URL available:', !!connectionString);

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const run = async () => {
  let client;
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Successfully connected to database');

    // Check if business_info table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'business_info'
      );
    `;
    
    const tableExists = await client.query(checkTableQuery);
    console.log('business_info table exists:', tableExists.rows[0].exists);
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating business_info table...');
      
      // Create the table
      const createTableQuery = `
        CREATE TABLE business_info (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          company_name VARCHAR(255) NOT NULL,
          address TEXT,
          city VARCHAR(255),
          state VARCHAR(255),
          zip VARCHAR(50),
          phone_number VARCHAR(50),
          tax_id VARCHAR(100),
          company_logo VARCHAR(255),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Add index for faster lookups
        CREATE INDEX business_info_user_id_idx ON business_info(user_id);
        
        -- Ensure user_id is unique
        ALTER TABLE business_info ADD CONSTRAINT unique_user_id UNIQUE (user_id);
      `;
      
      await client.query(createTableQuery);
      console.log('business_info table created successfully');
    } else {
      // Check if business_info table has phone_number column
      const checkPhoneNumberColumnQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'business_info'
          AND column_name = 'phone_number'
        );
      `;
      
      const phoneNumberExists = await client.query(checkPhoneNumberColumnQuery);
      console.log('phone_number column exists:', phoneNumberExists.rows[0].exists);
      
      // Check if business_info table has country column
      const checkCountryColumnQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'business_info'
          AND column_name = 'country'
        );
      `;
      
      const countryExists = await client.query(checkCountryColumnQuery);
      console.log('country column exists:', countryExists.rows[0].exists);
      
      // If country exists but phone_number doesn't, alter the table
      if (countryExists.rows[0].exists && !phoneNumberExists.rows[0].exists) {
        console.log('Altering business_info table to replace country with phone_number...');
        await client.query('BEGIN');
        try {
          // Add phone_number column
          await client.query('ALTER TABLE business_info ADD COLUMN phone_number VARCHAR(50)');
          console.log('Added phone_number column');
          
          // Copy data from country to phone_number (optional)
          await client.query('UPDATE business_info SET phone_number = country');
          console.log('Copied data from country to phone_number');
          
          // Drop country column
          await client.query('ALTER TABLE business_info DROP COLUMN country');
          console.log('Dropped country column');
          
          await client.query('COMMIT');
          console.log('Table alteration completed successfully');
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('Error altering table:', err);
          throw err;
        }
      }
    }
    
    console.log('Script completed successfully');
    
  } catch (err) {
    console.error('Error:', err);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
};

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
}); 