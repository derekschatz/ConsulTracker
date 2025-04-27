/**
 * Client Routes
 * 
 * This file contains the API routes for client management.
 */

import { Router, Request, Response } from 'express';
import { DatabaseStorage } from './database-storage';
import { auth, handleError } from './auth-middleware';
import { ServerError } from './serverError';
import { z } from 'zod';

// Define client schema for input validation
const clientSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters" }),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  billingContactName: z.string().optional(),
  billingContactEmail: z.string().email().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().optional(),
});

export function createClientRoutes(storage: DatabaseStorage): Router {
  const router = Router();

  // Get all clients
  router.get('/', auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get single client
  router.get('/:id', auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        throw new ServerError("Invalid client ID", 400);
      }
      
      const client = await storage.getClient(id, userId);
      
      if (!client) {
        throw new ServerError("Client not found", 404);
      }
      
      res.json(client);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create client
  router.post('/', auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      
      // Validate client data
      const validData = clientSchema.parse(req.body);
      
      // Create client with validated data
      const client = await storage.createClient({
        ...validData,
        userId
      });
      
      res.status(201).json(client);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Update client
  router.put('/:id', auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        throw new ServerError("Invalid client ID", 400);
      }
      
      // Validate update data
      const validData = clientSchema.partial().parse(req.body);
      
      // Update client with validated data
      const client = await storage.updateClient(id, validData, userId);
      
      if (!client) {
        throw new ServerError("Client not found", 404);
      }
      
      res.json(client);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Delete client
  router.delete('/:id', auth, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        throw new ServerError("Invalid client ID", 400);
      }
      
      const success = await storage.deleteClient(id, userId);
      
      if (!success) {
        throw new ServerError("Client not found", 404);
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
} 