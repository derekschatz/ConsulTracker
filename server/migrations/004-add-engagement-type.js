exports.up = async function(db) {
  // Add type column to engagements table with default value 'hourly'
  await db.runSql(`
    ALTER TABLE engagements
    ADD COLUMN type TEXT NOT NULL DEFAULT 'hourly'
  `);
  
  // Make hourly_rate nullable
  await db.runSql(`
    ALTER TABLE engagements 
    ALTER COLUMN hourly_rate DROP NOT NULL
  `);
  
  // Add total_cost column to engagements table
  await db.runSql(`
    ALTER TABLE engagements
    ADD COLUMN total_cost NUMERIC
  `);
  
  console.log('Migration: Added engagement type and total_cost columns');
};

exports.down = async function(db) {
  // Remove total_cost column
  await db.runSql(`
    ALTER TABLE engagements
    DROP COLUMN total_cost
  `);
  
  // Make hourly_rate not null again
  await db.runSql(`
    ALTER TABLE engagements 
    ALTER COLUMN hourly_rate SET NOT NULL
  `);
  
  // Remove type column
  await db.runSql(`
    ALTER TABLE engagements
    DROP COLUMN type
  `);
  
  console.log('Migration: Removed engagement type and total_cost columns');
}; 