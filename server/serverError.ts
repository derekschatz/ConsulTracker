import { Response } from 'express';
import { ZodError } from 'zod';

/**
 * Custom error class for server errors with HTTP status codes
 */
export class ServerError extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ServerError';
    this.status = status;
  }
}

/**
 * Handle errors in API routes
 * @param err The error to handle
 * @param res The Express response object
 */
export function handleError(err: unknown, res: Response): void {
  console.error('API Error:', err);

  if (err instanceof ServerError) {
    // Handle custom server errors
    res.status(err.status).json({ message: err.message });
  } else if (err instanceof ZodError) {
    // Handle validation errors
    res.status(400).json({ 
      message: 'Invalid data provided',
      errors: err.errors
    });
  } else {
    // Handle generic errors
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    res.status(500).json({ message });
  }
} 