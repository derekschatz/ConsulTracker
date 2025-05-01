import { Express } from 'express';
import { storage } from './storage';

export function setupDebugRoutes(app: Express) {
  // Add a special route to directly fix the active engagements issue
  app.get("/api/fix-active-engagements", async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = (req.user as any).id;
      
      // Get all engagements first
      const allEngagements = await storage.getEngagements(userId);
      console.log(`User has ${allEngagements.length} total engagements`);
      
      // Force update all engagements to show proper status based on dates
      const { calculateEngagementStatus } = await import('./calculateEngagementStatus');
      
      // Create an array to store active engagements
      const activeEngagements = [];
      
      // For each engagement, determine if it's active based on dates
      for (const engagement of allEngagements) {
        const status = calculateEngagementStatus(
          new Date(engagement.startDate),
          new Date(engagement.endDate)
        );
        
        if (status === 'active') {
          activeEngagements.push({
            id: engagement.id,
            projectName: engagement.projectName,
            status: 'active',
            startDate: engagement.startDate,
            endDate: engagement.endDate
          });
        }
      }
      
      // Return info about active engagements
      res.json({
        totalEngagements: allEngagements.length,
        activeEngagements: activeEngagements.length,
        activeProjects: activeEngagements
      });
    } catch (error) {
      console.error('Error fixing active engagements:', error);
      res.status(500).json({ error: error.message });
    }
  });
} 