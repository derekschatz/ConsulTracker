-- Simple test data script with various invoice statuses
-- First make sure the testuser exists
INSERT INTO users (username, password, name, email, created_at)
VALUES ('testuser', '$2a$10$iqEHxmX9PdgaS5hkS6MdNeOTHnQI0N5nVGq2TZk3Cm4DCpPeAXr3K', 'Test User', 'testuser@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Now insert test data
DO $$
DECLARE
    user_id INTEGER;
    acme_id INTEGER;
    techstart_id INTEGER;
    website_id INTEGER;
    api_id INTEGER;
BEGIN
    -- Get the user ID
    SELECT id INTO user_id FROM users WHERE username = 'testuser';
    
    -- Create clients
    INSERT INTO clients (user_id, name, billing_contact_name, billing_contact_email, billing_address, billing_city, billing_state, billing_zip, billing_country)
    VALUES (user_id, 'Acme Corporation', 'John Doe', 'john@acme.com', '123 Main St', 'Metropolis', 'NY', '10001', 'USA')
    RETURNING id INTO acme_id;
    
    INSERT INTO clients (user_id, name, billing_contact_name, billing_contact_email, billing_address, billing_city, billing_state, billing_zip, billing_country)
    VALUES (user_id, 'TechStart Inc', 'Jane Smith', 'jane@techstart.com', '456 Tech Blvd', 'Silicon Valley', 'CA', '94025', 'USA')
    RETURNING id INTO techstart_id;
    
    -- Create engagements
    INSERT INTO engagements (
        user_id, 
        client_id, 
        project_name, 
        start_date, 
        end_date, 
        engagement_type, 
        hourly_rate, 
        description, 
        status
    )
    VALUES (
        user_id, 
        acme_id, 
        'Website Redesign', 
        CURRENT_DATE - INTERVAL '45 days', 
        CURRENT_DATE + INTERVAL '45 days', 
        'hourly', 
        95.00, 
        'Complete redesign of corporate website', 
        'active'
    )
    RETURNING id INTO website_id;
    
    INSERT INTO engagements (
        user_id, 
        client_id, 
        project_name, 
        start_date, 
        end_date, 
        engagement_type, 
        hourly_rate, 
        description, 
        status
    )
    VALUES (
        user_id, 
        techstart_id, 
        'API Integration', 
        CURRENT_DATE - INTERVAL '30 days', 
        CURRENT_DATE + INTERVAL '60 days', 
        'hourly', 
        125.00, 
        'Integrate payment processing APIs', 
        'active'
    )
    RETURNING id INTO api_id;
    
    -- Add time logs
    INSERT INTO time_logs (user_id, engagement_id, date, hours, description, created_at)
    VALUES
        (user_id, website_id, CURRENT_DATE - INTERVAL '30 days', 4.0, 'Initial planning', CURRENT_TIMESTAMP),
        (user_id, website_id, CURRENT_DATE - INTERVAL '28 days', 6.0, 'UI design', CURRENT_TIMESTAMP),
        (user_id, website_id, CURRENT_DATE - INTERVAL '25 days', 5.0, 'Frontend development', CURRENT_TIMESTAMP),
        (user_id, website_id, CURRENT_DATE - INTERVAL '20 days', 7.0, 'Backend integration', CURRENT_TIMESTAMP),
        (user_id, website_id, CURRENT_DATE - INTERVAL '15 days', 3.0, 'Testing', CURRENT_TIMESTAMP),
        (user_id, api_id, CURRENT_DATE - INTERVAL '20 days', 5.0, 'API research', CURRENT_TIMESTAMP),
        (user_id, api_id, CURRENT_DATE - INTERVAL '18 days', 6.5, 'Implementation', CURRENT_TIMESTAMP),
        (user_id, api_id, CURRENT_DATE - INTERVAL '15 days', 4.0, 'Testing', CURRENT_TIMESTAMP);
    
    -- Add submitted invoice
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
        notes,
        period_start,
        period_end,
        project_name
    )
    VALUES (
        user_id,
        'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-001',
        'Acme Corporation',
        website_id,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        2375.00, -- 25 hours * $95/hr
        25.0,
        'submitted',
        'Invoice for website redesign services',
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '1 day',
        'Website Redesign'
    );
    
    -- Add paid invoice
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
        notes,
        period_start,
        period_end,
        project_name
    )
    VALUES (
        user_id,
        'INV-PAID-' || to_char(CURRENT_DATE, 'YYYYMM'),
        'TechStart Inc',
        api_id,
        CURRENT_DATE - INTERVAL '20 days',
        CURRENT_DATE - INTERVAL '5 days',
        1937.50, -- 15.5 hours * $125/hr
        15.5,
        'paid',
        'Invoice for API integration services - PAID',
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '20 days',
        'API Integration'
    );
    
    -- Add overdue invoice
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
        notes,
        period_start,
        period_end,
        project_name
    )
    VALUES (
        user_id,
        'INV-OVERDUE-' || to_char(CURRENT_DATE, 'YYYYMM'),
        'Acme Corporation',
        website_id,
        CURRENT_DATE - INTERVAL '45 days',
        CURRENT_DATE - INTERVAL '15 days',
        1425.00, -- 15 hours * $95/hr
        15.0,
        'overdue',
        'This invoice is overdue',
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE - INTERVAL '45 days',
        'Website Redesign'
    );
    
END $$; 