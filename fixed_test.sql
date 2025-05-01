-- Insert test user (if not exists)
INSERT INTO users (username, password, name, email, created_at) 
VALUES ('testuser', '$2a$10$iqEHxmX9PdgaS5hkS6MdNeOTHnQI0N5nVGq2TZk3Cm4DCpPeAXr3K', 'Test User', 'testuser@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Get user ID
DO $$
DECLARE
    test_user_id INTEGER;
BEGIN
    -- Get the user's ID
    SELECT id INTO test_user_id FROM users WHERE username = 'testuser';
    
    -- Create a test client (if not exists)
    INSERT INTO clients (user_id, name)
    VALUES (test_user_id, 'Test Client')
    ON CONFLICT DO NOTHING;
    
    -- Create a test engagement (if not exists)
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
        c.id, 
        'Test Project', 
        CURRENT_DATE - INTERVAL '30 days', 
        CURRENT_DATE + INTERVAL '30 days', 
        'hourly', 
        100.00
    FROM clients c
    WHERE c.user_id = test_user_id AND c.name = 'Test Client'
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    -- Create a test invoice
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
        c.name,
        e.id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        500.00,
        5.0,
        'submitted',
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE,
        e.project_name
    FROM engagements e
    JOIN clients c ON e.client_id = c.id
    WHERE e.user_id = test_user_id AND e.project_name = 'Test Project'
    LIMIT 1;
    
END $$; 