-- Add net_terms column to engagements table if it doesn't exist
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS net_terms INTEGER DEFAULT 30;

-- Set default value for existing engagements
UPDATE engagements SET net_terms = 30 WHERE net_terms IS NULL;

-- Add comment to the column
COMMENT ON COLUMN engagements.net_terms IS 'Number of days after issuing date when an invoice is due'; 