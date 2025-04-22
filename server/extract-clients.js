import pg from 'pg';
const { Pool } = pg;

// Get the database URL from environment variables or use a default
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function extractClients() {
  const pool = new Pool({ connectionString: dbUrl });
  
  try {
    console.log('Connected to database');
    
    // 1. Get all unique clients from engagements table
    const { rows: uniqueClients } = await pool.query(`
      SELECT DISTINCT user_id, client_name 
      FROM engagements 
      WHERE client_id IS NULL
    `);
    
    console.log(`Found ${uniqueClients.length} unique clients to migrate`);
    
    // 2. Insert them into clients table
    if (uniqueClients.length > 0) {
      const insertPromises = uniqueClients.map(client => 
        pool.query(
          'INSERT INTO clients (user_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
          [client.user_id, client.client_name]
        )
      );
      
      const results = await Promise.all(insertPromises);
      console.log(`Inserted ${results.filter(r => r.rowCount > 0).length} new clients`);
    }
    
    // 3. Update engagements with client_id
    const updateResult = await pool.query(`
      UPDATE engagements e
      SET client_id = c.id
      FROM clients c
      WHERE e.client_name = c.name
        AND e.user_id = c.user_id
        AND e.client_id IS NULL
      RETURNING e.id
    `);
    
    console.log(`Updated ${updateResult.rowCount} engagements with client IDs`);
    
    // 4. Check if there are any engagements left without client_id
    const { rows: remaining } = await pool.query(
      'SELECT COUNT(*) as count FROM engagements WHERE client_id IS NULL'
    );
    
    console.log(`Remaining engagements without client_id: ${remaining[0].count}`);
    
    console.log('Client extraction completed successfully');
  } catch (error) {
    console.error('Error during client extraction:', error);
  } finally {
    await pool.end();
  }
}

// Run the extraction
extractClients().catch(console.error); 