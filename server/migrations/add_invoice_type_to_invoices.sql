-- Add invoice_type column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT CHECK (invoice_type IN ('hourly', 'project'));

-- Update existing invoices based on their associated engagement's type
UPDATE invoices i
SET invoice_type = e.engagement_type
FROM engagements e
WHERE i.engagement_id = e.id AND i.invoice_type IS NULL;

-- Make invoice_type NOT NULL after updating existing records
ALTER TABLE invoices ALTER COLUMN invoice_type SET NOT NULL; 