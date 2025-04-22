-- Add client_id column to engagements table
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS client_id INTEGER;

-- Add foreign key constraint
ALTER TABLE engagements ADD CONSTRAINT fk_client_id FOREIGN KEY (client_id) REFERENCES clients(id);

-- Update existing records to have a client_id if possible
-- This is a placeholder for a more sophisticated migration in a real scenario
-- For each engagement, we would ideally find the corresponding client by name and set the client_id
-- For now, this is commented out as it would require more complex logic
/* 
DO $$
DECLARE
    engagement_rec RECORD;
    client_id INTEGER;
BEGIN
    FOR engagement_rec IN SELECT id, client_name, user_id FROM engagements LOOP
        -- Try to find a matching client by name and user_id
        SELECT id INTO client_id FROM clients 
        WHERE name = engagement_rec.client_name AND user_id = engagement_rec.user_id
        LIMIT 1;
        
        -- If a client is found, update the engagement
        IF client_id IS NOT NULL THEN
            UPDATE engagements SET client_id = client_id WHERE id = engagement_rec.id;
        END IF;
    END LOOP;
END; 
$$;
*/ 