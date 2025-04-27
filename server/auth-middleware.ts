/**
 * Authentication Middleware
 * 
 * This file contains middleware for authentication and extends the Request type
 * to include the authenticated user information.
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from './db';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

/**
 * Authentication middleware that checks if a user is logged in
 * and adds the user ID to the request object
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  // Check if user exists in the session (provided by Passport.js)
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get user ID from the user object
    if (typeof req.user === 'object' && req.user !== null && 'id' in req.user) {
      req.userId = (req.user as { id: number }).id;
      return next();
    }
    
    // If user is just an ID (number)
    if (typeof req.user === 'number') {
      req.userId = req.user;
      return next();
    }
    
    // In case user is stored differently, try to look it up
    const userId = req.user.toString();
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user' });
    }
    
    req.userId = result.rows[0].id;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper function to handle errors and send appropriate responses
 */
export const handleError = (err: any, res: Response) => {
  console.error('API Error:', err);
  
  // Handle Zod validation errors
  if (err.issues) {
    return res.status(400).json({ 
      error: 'Validation Error', 
      details: err.issues 
    });
  }
  
  // Handle our custom server errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  
  // Handle PostgreSQL errors
  if (err.code && err.code.startsWith('23')) {
    // 23xxx errors are constraint violations
    return res.status(400).json({ 
      error: 'Database constraint violation', 
      details: err.message 
    });
  }
  
  // Default error response
  res.status(500).json({ error: 'Internal server error' });
}; 