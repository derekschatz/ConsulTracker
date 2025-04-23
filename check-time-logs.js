// Script to check time logs description values
import { Pool } from 'pg';
import fs from 'fs';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/consultracker'
});

async function checkTimeLogDescriptions() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Check all time logs, focusing on description values
    console.log('\nAnalyzing time_logs description values:');
    
    const allLogsResult = await client.query(`
      SELECT id, date, hours, description,
             pg_typeof(description) as description_type,
             octet_length(description) as description_length,
             case 
               when description IS NULL then 'NULL'
               when description = '' then 'EMPTY'
               when trim(description) = '' then 'WHITESPACE'
               else 'TEXT'
             end as description_category
      FROM time_logs
      ORDER BY id DESC
      LIMIT 50;
    `);
    
    console.log(`Examined ${allLogsResult.rows.length} time logs`);
    
    // Group by description category
    const categoryCounts = {
      NULL: 0,
      EMPTY: 0,
      WHITESPACE: 0,
      TEXT: 0
    };
    
    allLogsResult.rows.forEach(row => {
      categoryCounts[row.description_category]++;
    });
    
    console.log('\nDescription category counts:');
    console.log(categoryCounts);
    
    // Show sample rows for each category
    console.log('\nSample rows by category:');
    const categorySamples = {
      NULL: allLogsResult.rows.filter(row => row.description_category === 'NULL').slice(0, 3),
      EMPTY: allLogsResult.rows.filter(row => row.description_category === 'EMPTY').slice(0, 3),
      WHITESPACE: allLogsResult.rows.filter(row => row.description_category === 'WHITESPACE').slice(0, 3),
      TEXT: allLogsResult.rows.filter(row => row.description_category === 'TEXT').slice(0, 3)
    };
    
    console.log(JSON.stringify(categorySamples, null, 2));
    
    // Direct check of time logs with specific IDs
    if (process.argv.length > 2) {
      const idToCheck = process.argv[2];
      console.log(`\nChecking specific time log ID: ${idToCheck}`);
      
      const specificLogResult = await client.query(`
        SELECT id, date, hours, description,
               pg_typeof(description) as description_type,
               octet_length(description) as description_length,
               case 
                 when description IS NULL then 'NULL'
                 when description = '' then 'EMPTY'
                 when trim(description) = '' then 'WHITESPACE'
                 else 'TEXT'
               end as description_category
        FROM time_logs
        WHERE id = $1;
      `, [idToCheck]);
      
      if (specificLogResult.rows.length > 0) {
        console.log('Found time log:');
        console.log(specificLogResult.rows[0]);
      } else {
        console.log(`No time log found with ID ${idToCheck}`);
      }
    }
    
    // Log results to file for debug purposes
    fs.writeFileSync('time-logs-analysis.log', JSON.stringify({
      allLogs: allLogsResult.rows,
      categoryCounts,
      categorySamples
    }, null, 2));
    
    console.log('\nAnalysis complete. Results saved to time-logs-analysis.log');
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkTimeLogDescriptions().catch(console.error); 