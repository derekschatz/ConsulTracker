-- Simple test insert

-- Add test user if not exists
INSERT INTO users (username, password, name, email, created_at)
VALUES ('testuser', '$2a$10$iqEHxmX9PdgaS5hkS6MdNeOTHnQI0N5nVGq2TZk3Cm4DCpPeAXr3K', 'Test User', 'testuser@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Get user ID 
DO $$
DECLARE
    test_user_id INTEGER;
BEGIN
    SELECT id INTO test_user_id FROM users WHERE username = 'testuser';
    
    -- Add a client
    INSERT INTO clients (user_id, name)
    VALUES (test_user_id, 'Test Client')
    ON CONFLICT DO NOTHING;
    
    -- Get client ID
    WITH client_id AS (
        SELECT id FROM clients WHERE user_id = test_user_id AND name = 'Test Client'
    )
    
    -- Add engagement
    INSERT INTO engagements (
        user_id, 
        client_id, 
        project_name, 
        start_date, 
        end_date, 
        engagement_type, 
        hourly_rate
    )
    SELECT
        test_user_id, 
        id, 
        'Test Project', 
        CURRENT_DATE - INTERVAL '30 days', 
        CURRENT_DATE + INTERVAL '30 days', 
        'hourly', 
        100.00
    FROM clients
    WHERE user_id = test_user_id 
    AND name = 'Test Client'
    ON CONFLICT DO NOTHING;
    
    -- Get engagement ID
    WITH engagement_id AS (
        SELECT id FROM engagements 
        WHERE user_id = test_user_id AND project_name = 'Test Project'
    )
    
    -- Add invoice
    INSERT INTO invoices (
        user_id,
        invoice_number,
        client_name,
        engagement_id,
        issue_date,
        due_date,
        total_amount,
        total_hours,
        status,
        period_start,
        period_end,
        project_name
    )
    SELECT
        test_user_id,
        'INV-TEST-001',
        'Test Client',
        e.id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        500.00,
        5.0,
        'submitted',
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE,
        'Test Project'
    FROM engagements e
    WHERE e.user_id = test_user_id AND e.project_name = 'Test Project';
    
END $$; 