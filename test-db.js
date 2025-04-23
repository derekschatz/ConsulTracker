// Direct database test script
const { Client } = require('pg');
require('dotenv').config();

// Get connection string from environment variable
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create a new client
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testDatabase() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Successfully connected to database');

    // 1. Check if the clients table exists
    console.log('\nChecking if clients table exists:');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
      );
    `);
    console.log('Clients table exists:', tableCheck.rows[0].exists);

    // 2. Check table schema
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

    // 3. List all clients
    console.log('\nListing all clients:');
    const clients = await client.query('SELECT * FROM clients');
    console.log(`Found ${clients.rows.length} clients`);
    
    if (clients.rows.length > 0) {
      console.log('First client:', clients.rows[0]);
      
      // 4. Try direct update on the first client
      const clientId = clients.rows[0].id;
      console.log(`\nAttempting direct update on client ID ${clientId}:`);
      
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
        RETURNING *
      `, [clientId]);
      
      if (updateResult.rows.length > 0) {
        console.log('Update successful. Updated client:', updateResult.rows[0]);
      } else {
        console.log('Update query executed but no rows were modified');
      }
      
      // 5. Verify the update
      console.log('\nVerifying update:');
      const verification = await client.query('SELECT * FROM clients WHERE id = $1', [clientId]);
      if (verification.rows.length > 0) {
        console.log('Client after update:', verification.rows[0]);
      } else {
        console.log('Could not find client after update');
      }
    }
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

testDatabase().catch(console.error); 