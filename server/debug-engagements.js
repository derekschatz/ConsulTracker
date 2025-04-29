// Debug script to examine engagements in the database
// Run this script with: node server/debug-engagements.js

import { db } from './db.js';
import { engagements, clients } from './schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function debugEngagements() {
  console.log('======= DEBUG ENGAGEMENTS TOOL =======');
  console.log('Examining database for engagement issues...');
  
  try {
    // Get all engagements regardless of user
    const allEngagements = await db.select({
      id: engagements.id,
      userId: engagements.userId,
      clientId: engagements.clientId,
      projectName: engagements.projectName,
      startDate: engagements.startDate,
      endDate: engagements.endDate,
      status: engagements.status,
    })
    .from(engagements);
    
    console.log(`\nTotal engagements in database: ${allEngagements.length}`);
    
    if (allEngagements.length === 0) {
      console.log('No engagements found in the database at all.');
      console.log('This indicates you need to create engagements first.');
      return;
    }
    
    // Get unique user IDs
    const userIds = [...new Set(allEngagements.map(e => e.userId))];
    console.log(`\nEngagements belong to ${userIds.length} unique users: ${userIds.join(', ')}`);
    
    // Get engagement counts by user
    console.log('\nEngagements per user:');
    for (const userId of userIds) {
      const count = allEngagements.filter(e => e.userId === userId).length;
      console.log(`User ID ${userId}: ${count} engagements`);
    }
    
    // Get unique client IDs
    const clientIds = [...new Set(allEngagements.map(e => e.clientId).filter(Boolean))];
    console.log(`\nEngagements reference ${clientIds.length} unique clients: ${clientIds.join(', ')}`);
    
    // Check for missing client associations
    const missingClientEngagements = allEngagements.filter(e => !e.clientId);
    if (missingClientEngagements.length > 0) {
      console.log('\n⚠️ WARNING: Found engagements with missing client IDs:');
      missingClientEngagements.forEach(e => {
        console.log(`  - Engagement ID ${e.id}, Name: "${e.projectName}", User ID: ${e.userId}`);
      });
    }
    
    // Get clients information
    const allClients = await db.select({
      id: clients.id,
      userId: clients.userId,
      name: clients.name,
    })
    .from(clients);
    
    console.log(`\nTotal clients in database: ${allClients.length}`);
    
    // Check for client-user mismatches
    const clientUserMap = new Map();
    allClients.forEach(c => clientUserMap.set(c.id, c.userId));
    
    const mismatchedEngagements = allEngagements.filter(e => {
      if (!e.clientId) return false;
      const clientUserId = clientUserMap.get(e.clientId);
      return clientUserId !== undefined && clientUserId !== e.userId;
    });
    
    if (mismatchedEngagements.length > 0) {
      console.log('\n⚠️ CRITICAL: Found engagements where client belongs to a different user:');
      mismatchedEngagements.forEach(e => {
        const clientUserId = clientUserMap.get(e.clientId);
        const clientName = allClients.find(c => c.id === e.clientId)?.name || 'Unknown';
        console.log(`  - Engagement ID ${e.id}, Name: "${e.projectName}", Assigned to User ${e.userId} but client "${clientName}" belongs to User ${clientUserId}`);
      });
      console.log('\nThis is likely the cause of missing engagements - users can only see engagements with clients they own.');
    }
    
    // Check for date range issues
    const currentDate = new Date();
    const invalidDateEngagements = allEngagements.filter(e => {
      const startDate = new Date(e.startDate);
      const endDate = new Date(e.endDate);
      return isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate;
    });
    
    if (invalidDateEngagements.length > 0) {
      console.log('\n⚠️ WARNING: Found engagements with invalid date ranges:');
      invalidDateEngagements.forEach(e => {
        console.log(`  - Engagement ID ${e.id}, Name: "${e.projectName}", Start: ${e.startDate}, End: ${e.endDate}`);
      });
    }
    
    // Recommendation
    console.log('\n======= RECOMMENDATIONS =======');
    if (mismatchedEngagements.length > 0) {
      console.log('1. Fix client-user mismatches by ensuring engagements use clients that belong to the same user.');
      console.log('   Run the following SQL to fix (replace user_id and client_id with actual values):');
      console.log('   UPDATE engagements SET client_id = [correct_client_id] WHERE id = [engagement_id];');
    }
    
    if (missingClientEngagements.length > 0) {
      console.log('2. Assign proper clients to engagements missing client IDs.');
      console.log('   Run the following SQL to fix (replace with actual values):');
      console.log('   UPDATE engagements SET client_id = [client_id] WHERE id = [engagement_id];');
    }
    
    if (invalidDateEngagements.length > 0) {
      console.log('3. Fix invalid date ranges on engagements.');
      console.log('   Run the following SQL to fix (replace with actual values):');
      console.log('   UPDATE engagements SET start_date = \'YYYY-MM-DD\', end_date = \'YYYY-MM-DD\' WHERE id = [engagement_id];');
    }
    
  } catch (error) {
    console.error('Error debugging engagements:', error);
  }
}

// Run the debug function
debugEngagements()
  .then(() => {
    console.log('\nDebug complete. Exiting.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 