import { Express } from 'express';
import { storage } from './storage';

export function setupDebugRoutes(app: Express) {
  // Add a debug route directly to the app
  app.get("/api/debug/active-engagements", async (req, res) => {
    try {
      console.log("Debug endpoint called");
      // Ensure user is authenticated for security
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view engagements" });
      }
      
      // Get user ID from authenticated session
      const userId = (req.user as any).id;
      console.log(`Debugging active engagements for userId: ${userId}`);
      
      // First, get all engagements
      const allEngagements = await storage.getEngagements(userId);
      console.log(`Total engagements for user: ${allEngagements.length}`);
      
      // Get engagements with status 'active' in database
      const statusActiveEngagements = allEngagements.filter(e => e.status === 'active');
      console.log(`Engagements with status='active' in database: ${statusActiveEngagements.length}`);
      
      // Import the status calculation function
      const { calculateEngagementStatus } = await import('./calculateEngagementStatus');
      
      // Calculate status for each engagement based on date ranges
      const calculatedStatuses = allEngagements.map(engagement => {
        const currentStatus = calculateEngagementStatus(
          new Date(engagement.startDate), 
          new Date(engagement.endDate)
        );
        
        return {
          id: engagement.id,
          projectName: engagement.projectName,
          databaseStatus: engagement.status,
          calculatedStatus: currentStatus,
          startDate: new Date(engagement.startDate).toISOString(),
          endDate: new Date(engagement.endDate).toISOString(),
          isActive: currentStatus === 'active'
        };
      });
      
      // Count engagements that should be active based on date calculation
      const dateActiveEngagements = calculatedStatuses.filter(e => e.calculatedStatus === 'active');
      console.log(`Engagements that should be active based on date calculation: ${dateActiveEngagements.length}`);
      
      // Get active engagements using the storage method
      const activeEngagements = await storage.getActiveEngagements(userId);
      console.log(`Active engagements from storage.getActiveEngagements: ${activeEngagements.length}`);
      
      // Return detailed info for debugging
      res.json({
        user: { id: userId },
        totals: {
          allEngagements: allEngagements.length,
          statusActive: statusActiveEngagements.length,
          calculatedActive: dateActiveEngagements.length,
          fromStorageMethod: activeEngagements.length
        },
        engagementDetails: calculatedStatuses,
        activeEngagements: activeEngagements.map(e => ({
          id: e.id,
          projectName: e.projectName,
          status: e.status,
          startDate: e.startDate,
          endDate: e.endDate
        }))
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ 
        message: "Failed to fetch debug information",
        error: error.message
      });
    }
  });
} 