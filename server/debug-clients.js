// Script to debug client table data
import { db } from './db.js';
import { clients } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function debugClients() {
  try {
    console.log('Fetching all clients from the database...');
    const allClients = await db.select().from(clients);
    
    console.log(`Found ${allClients.length} clients`);
    console.log('Client data sample:');
    console.log(JSON.stringify(allClients[0] || {}, null, 2));
    
    console.log('\nChecking billing fields:');
    const results = allClients.map(client => ({
      id: client.id,
      name: client.name,
      hasBillingName: client.billingContactName !== null && client.billingContactName !== undefined,
      hasBillingEmail: client.billingContactEmail !== null && client.billingContactEmail !== undefined,
      hasBillingAddress: client.billingAddress !== null && client.billingAddress !== undefined,
    }));
    
    console.log(results);
    
    // Try manually updating a client with billing information
    if (allClients.length > 0) {
      const clientToUpdate = allClients[0];
      console.log(`Updating client ${clientToUpdate.id} with test billing data...`);
      
      const updateResult = await db.update(clients)
        .set({
          billingContactName: 'Test Contact',
          billingContactEmail: 'test@example.com',
          billingAddress: '123 Test St',
          billingCity: 'Test City',
          billingState: 'Test State',
          billingZip: '12345',
          billingCountry: 'Test Country'
        })
        .where(eq(clients.id, clientToUpdate.id))
        .returning();
      
      console.log('Update result:');
      console.log(JSON.stringify(updateResult, null, 2));
      
      // Verify the update worked
      const updatedClient = await db.select().from(clients)
        .where(eq(clients.id, clientToUpdate.id));
      
      console.log('Updated client:');
      console.log(JSON.stringify(updatedClient[0], null, 2));
    }
  } catch (error) {
    console.error('Error debugging clients:', error);
  }
}

debugClients()
  .then(() => console.log('Debug complete'))
  .catch(err => console.error('Error running debug script:', err)); 