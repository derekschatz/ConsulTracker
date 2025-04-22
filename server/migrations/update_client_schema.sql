-- Update clients table with billing information
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_state TEXT,
ADD COLUMN IF NOT EXISTS billing_zip TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT;

-- Copy client names from engagements to clients
INSERT INTO clients (user_id, name)
SELECT DISTINCT user_id, client_name
FROM engagements
WHERE client_id IS NULL
ON CONFLICT DO NOTHING;

-- Update engagements with client_id based on client_name
UPDATE engagements e
SET client_id = c.id
FROM clients c
WHERE e.client_name = c.name
  AND e.user_id = c.user_id
  AND e.client_id IS NULL;

-- Make client_id NOT NULL after setting it
ALTER TABLE engagements
ALTER COLUMN client_id SET NOT NULL;

-- Update invoices with billing information from clients
UPDATE invoices i
SET 
  billing_contact_name = c.billing_contact_name,
  billing_contact_email = c.billing_contact_email,
  billing_address = c.billing_address,
  billing_city = c.billing_city,
  billing_state = c.billing_state,
  billing_zip = c.billing_zip,
  billing_country = c.billing_country
FROM engagements e
JOIN clients c ON e.client_id = c.id
WHERE i.engagement_id = e.id
  AND i.user_id = e.user_id;

-- Remove client_name column from engagements (uncomment when ready)
-- ALTER TABLE engagements DROP COLUMN client_name; 