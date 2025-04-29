-- Add net_terms column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS net_terms TEXT;

-- Update existing invoices to have a default value of '30'
UPDATE invoices SET net_terms = '30' WHERE net_terms IS NULL; 