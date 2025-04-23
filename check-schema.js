// Simple script to check the database schema
const { Client } = require('pg');

require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check clients table
    const clientsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);

    console.log('\nClients table schema:');
    console.table(clientsSchema.rows);

    // Check a sample client
    const clientSample = await client.query('SELECT * FROM clients LIMIT 1');
    
    if (clientSample.rows.length > 0) {
      console.log('\nSample client record:');
      console.log(clientSample.rows[0]);
    } else {
      console.log('\nNo clients found in the database');
    }

    // Check if billing fields contain data
    const billingData = await client.query(`
      SELECT COUNT(*) as total,
        COUNT(billing_contact_name) as has_contact_name,
        COUNT(billing_contact_email) as has_contact_email,
        COUNT(billing_address) as has_address,
        COUNT(billing_city) as has_city,
        COUNT(billing_state) as has_state,
        COUNT(billing_zip) as has_zip,
        COUNT(billing_country) as has_country
      FROM clients
    `);

    console.log('\nBilling data statistics:');
    console.log(billingData.rows[0]);

  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

checkSchema().catch(console.error); 