// Direct database test script that works with ES modules
import { pool } from './db.js';

async function testClientUpdate() {
  try {
    console.log('Connecting to database pool...');
    const client = await pool.connect();
    console.log('Successfully connected to database');

    // 1. Check if the clients table exists
    console.log('\nChecking clients table schema:');
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position;
    `);
    console.log('Clients table schema:');
    schema.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // 2. Check for null billing fields
    console.log('\nChecking for clients with null billing fields:');
    const nullBillingFields = await client.query(`
      SELECT id, name, 
        billing_contact_name IS NULL as null_contact_name,
        billing_contact_email IS NULL as null_contact_email,
        billing_address IS NULL as null_address
      FROM clients
      LIMIT 5;
    `);
    console.log('Clients with null billing fields:');
    console.table(nullBillingFields.rows);

    // 3. Try direct update on a specific client (ID 9 or another client ID that exists in your system)
    const clientId = 9;
    console.log(`\nAttempting direct update on client ID ${clientId} with empty string values:`);
    
    // First update: using empty string values
    const updateResultEmptyStrings = await client.query(`
      UPDATE clients 
      SET 
        billing_contact_name = $1, 
        billing_contact_email = $2,
        billing_address = $3,
        billing_city = $4,
        billing_state = $5,
        billing_zip = $6,
        billing_country = $7
      WHERE id = $8
      RETURNING *;
    `, ['', '', '', '', '', '', '', clientId]);
    
    if (updateResultEmptyStrings.rows.length > 0) {
      console.log('Empty string update - successful. Updated client:');
      const updatedClient = updateResultEmptyStrings.rows[0];
      console.log(JSON.stringify(updatedClient, null, 2));
      
      // Log the exact types and values for verification
      console.log('\nVerifying billing field values after empty string update:');
      console.log(`billing_contact_name: "${updatedClient.billing_contact_name}" (${typeof updatedClient.billing_contact_name}, ${updatedClient.billing_contact_name === null ? 'NULL' : 'NOT NULL'})`);
      console.log(`billing_contact_email: "${updatedClient.billing_contact_email}" (${typeof updatedClient.billing_contact_email}, ${updatedClient.billing_contact_email === null ? 'NULL' : 'NOT NULL'})`);
      console.log(`billing_address: "${updatedClient.billing_address}" (${typeof updatedClient.billing_address}, ${updatedClient.billing_address === null ? 'NULL' : 'NOT NULL'})`);
    } else {
      console.log('Empty string update - query executed but no rows were modified');
    }
    
    // Now test with actual values
    console.log(`\nAttempting direct update on client ID ${clientId} with real values:`);
    const updateResult = await client.query(`
      UPDATE clients 
      SET 
        billing_contact_name = 'Direct Update Test', 
        billing_contact_email = 'direct-update@test.com',
        billing_address = '123 Direct Update St',
        billing_city = 'Direct City',
        billing_state = 'Direct State',
        billing_zip = '12345',
        billing_country = 'Direct Country'
      WHERE id = $1
      RETURNING *;
    `, [clientId]);
    
    if (updateResult.rows.length > 0) {
      console.log('Real value update - successful. Updated client:');
      console.log(JSON.stringify(updateResult.rows[0], null, 2));
    } else {
      console.log('Real value update - query executed but no rows were modified');
    }
    
    client.release();
    console.log('\nTest completed successfully');
  } catch (err) {
    console.error('Database error:', err);
  }
}

testClientUpdate().catch(console.error); 