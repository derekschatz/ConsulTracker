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