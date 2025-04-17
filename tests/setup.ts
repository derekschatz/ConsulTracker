// This file is used to set up the test environment
import { beforeAll, afterAll } from 'vitest';
import { pool } from '../server/db';

beforeAll(async () => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0].now);
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}, 30000); // Increase timeout to 30 seconds

afterAll(async () => {
  try {
    // End all database connections
    await pool.end();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
    throw error;
  }
}, 30000); // Increase timeout to 30 seconds 