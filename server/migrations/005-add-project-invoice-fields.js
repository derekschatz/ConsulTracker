exports.up = async function(db) {
  // Make period_start and period_end nullable
  await db.runSql(`
    ALTER TABLE invoices
    ALTER COLUMN period_start DROP NOT NULL;
  `);
  
  await db.runSql(`
    ALTER TABLE invoices
    ALTER COLUMN period_end DROP NOT NULL;
  `);
  
  // Add milestone_name and amount_due columns
  await db.runSql(`
    ALTER TABLE invoices
    ADD COLUMN milestone_name TEXT;
  `);
  
  await db.runSql(`
    ALTER TABLE invoices
    ADD COLUMN amount_due NUMERIC;
  `);
  
  console.log('Migration: Added milestone_name and amount_due columns to invoices table, and made period_start and period_end nullable');
};

exports.down = async function(db) {
  // Remove milestone_name and amount_due columns
  await db.runSql(`
    ALTER TABLE invoices
    DROP COLUMN amount_due;
  `);
  
  await db.runSql(`
    ALTER TABLE invoices
    DROP COLUMN milestone_name;
  `);
  
  // Make period_start and period_end NOT NULL again
  await db.runSql(`
    ALTER TABLE invoices
    ALTER COLUMN period_start SET NOT NULL;
  `);
  
  await db.runSql(`
    ALTER TABLE invoices
    ALTER COLUMN period_end SET NOT NULL;
  `);
  
  console.log('Migration: Removed milestone_name and amount_due columns from invoices table, and made period_start and period_end NOT NULL again');
}; 