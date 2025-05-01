-- Test Data SQL Script for 'testuser'

-- First, make sure 'testuser' exists in the users table
INSERT INTO users (username, password, name, email, created_at)
VALUES ('testuser', '$2a$10$iqEHxmX9PdgaS5hkS6MdNeOTHnQI0N5nVGq2TZk3Cm4DCpPeAXr3K', 'Test User', 'testuser@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Insert test data in a transaction
DO $$
DECLARE
    test_user_id INTEGER;
    acme_client_id INTEGER;
    techstart_client_id INTEGER;
    global_client_id INTEGER;
    website_engagement_id INTEGER;
    api_engagement_id INTEGER;
    marketing_engagement_id INTEGER;
    logo_engagement_id INTEGER;
    mobile_engagement_id INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO test_user_id FROM users WHERE username = 'testuser';
    
    -- Insert 3 sample clients
    INSERT INTO clients (user_id, name, billing_contact_name, billing_contact_email, billing_address, billing_city, billing_state, billing_zip, billing_country)
    VALUES
        (test_user_id, 'Acme Corporation', 'John Doe', 'john@acme.com', '123 Main St', 'Metropolis', 'NY', '10001', 'USA'),
        (test_user_id, 'TechStart Inc', 'Jane Smith', 'jane@techstart.com', '456 Tech Blvd', 'Silicon Valley', 'CA', '94025', 'USA'),
        (test_user_id, 'Global Marketing Ltd', 'Mark Johnson', 'mark@globalmarketing.com', '789 Commerce Ave', 'Chicago', 'IL', '60601', 'USA')
    ON CONFLICT DO NOTHING;
    
    -- Get client IDs
    SELECT id INTO acme_client_id FROM clients WHERE user_id = test_user_id AND name = 'Acme Corporation';
    SELECT id INTO techstart_client_id FROM clients WHERE user_id = test_user_id AND name = 'TechStart Inc';
    SELECT id INTO global_client_id FROM clients WHERE user_id = test_user_id AND name = 'Global Marketing Ltd';
    
    -- Insert engagements
    -- Hourly engagements
    INSERT INTO engagements (user_id, client_id, project_name, start_date, end_date, engagement_type, hourly_rate, project_amount, description, status, net_terms)
    VALUES
        (test_user_id, acme_client_id, 'Website Redesign', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '45 days', 'hourly', 95.00, NULL, 'Complete redesign of corporate website', 'active', 30)
    RETURNING id INTO website_engagement_id;
    
    INSERT INTO engagements (user_id, client_id, project_name, start_date, end_date, engagement_type, hourly_rate, project_amount, description, status, net_terms)
    VALUES
        (test_user_id, techstart_client_id, 'API Integration', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', 'hourly', 125.00, NULL, 'Integrate payment processing APIs', 'active', 15)
    RETURNING id INTO api_engagement_id;
    
    -- Project-based engagement
    INSERT INTO engagements (user_id, client_id, project_name, start_date, end_date, engagement_type, hourly_rate, project_amount, description, status, net_terms)
    VALUES
        (test_user_id, global_client_id, 'Marketing Campaign', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '75 days', 'project', NULL, 3500.00, 'Q2 marketing campaign strategy and execution', 'active', 30)
    RETURNING id INTO marketing_engagement_id;
    
    -- Completed engagement
    INSERT INTO engagements (user_id, client_id, project_name, start_date, end_date, engagement_type, hourly_rate, project_amount, description, status, net_terms)
    VALUES
        (test_user_id, acme_client_id, 'Logo Design', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '30 days', 'project', NULL, 1200.00, 'New logo design and branding guide', 'completed', 30)
    RETURNING id INTO logo_engagement_id;
    
    -- Upcoming engagement
    INSERT INTO engagements (user_id, client_id, project_name, start_date, end_date, engagement_type, hourly_rate, project_amount, description, status, net_terms)
    VALUES
        (test_user_id, techstart_client_id, 'Mobile App Development', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '105 days', 'hourly', 110.00, NULL, 'Develop iOS and Android mobile apps', 'upcoming', 15)
    RETURNING id INTO mobile_engagement_id;
    
    -- Insert time logs for active engagements
    -- Website Redesign time logs (spread over past 30 days)
    INSERT INTO time_logs (user_id, engagement_id, date, hours, description, created_at)
    SELECT 
        test_user_id,
        website_engagement_id,
        CURRENT_DATE - INTERVAL '1 day' * day_num,
        CASE 
            WHEN day_num % 5 = 0 THEN 2.5
            WHEN day_num % 3 = 0 THEN 4.0
            WHEN day_num % 2 = 0 THEN 3.0
            ELSE 1.5
        END,
        CASE 
            WHEN day_num % 3 = 0 THEN 'UI development'
            WHEN day_num % 2 = 0 THEN 'Backend integration'
            ELSE 'Client meeting and planning'
        END,
        CURRENT_TIMESTAMP - INTERVAL '1 day' * day_num
    FROM generate_series(1, 25, 1) AS day_num
    WHERE day_num % 7 NOT IN (0, 6); -- Skip weekends
    
    -- API Integration time logs (spread over past 20 days)
    INSERT INTO time_logs (user_id, engagement_id, date, hours, description, created_at)
    SELECT 
        test_user_id,
        api_engagement_id,
        CURRENT_DATE - INTERVAL '1 day' * day_num,
        CASE 
            WHEN day_num % 4 = 0 THEN 6.0
            WHEN day_num % 3 = 0 THEN 3.5
            WHEN day_num % 2 = 0 THEN 2.0
            ELSE 4.5
        END,
        CASE 
            WHEN day_num % 4 = 0 THEN 'API testing and debugging'
            WHEN day_num % 3 = 0 THEN 'Documentation'
            WHEN day_num % 2 = 0 THEN 'Code review'
            ELSE 'Development work'
        END,
        CURRENT_TIMESTAMP - INTERVAL '1 day' * day_num
    FROM generate_series(1, 15, 1) AS day_num
    WHERE day_num % 7 NOT IN (0, 6); -- Skip weekends
    
    -- Calculate total hours and amount for Website Redesign invoice
    DECLARE
        website_total_hours NUMERIC;
        website_total_amount NUMERIC;
    BEGIN
        SELECT 
            COALESCE(SUM(hours), 0), 
            COALESCE(SUM(hours * 95.00), 0)
        INTO 
            website_total_hours, 
            website_total_amount
        FROM time_logs
        WHERE engagement_id = website_engagement_id
        AND date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE - INTERVAL '16 days';
        
        -- Invoice for Website Redesign
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
            project_name,
            billing_contact_name,
            billing_contact_email,
            billing_address,
            billing_city,
            billing_state,
            billing_zip,
            billing_country
        )
        VALUES (
            test_user_id,
            'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-001',
            'Acme Corporation',
            website_engagement_id,
            CURRENT_DATE - INTERVAL '15 days',
            CURRENT_DATE + INTERVAL '15 days',
            website_total_amount,
            website_total_hours,
            'submitted',
            'Invoice for website redesign services',
            CURRENT_DATE - INTERVAL '30 days',
            CURRENT_DATE - INTERVAL '16 days',
            'Website Redesign',
            'John Doe',
            'john@acme.com',
            '123 Main St',
            'Metropolis',
            'NY',
            '10001',
            'USA'
        );
    END;
    
    -- Calculate total hours and amount for API Integration invoice
    DECLARE
        api_total_hours NUMERIC;
        api_total_amount NUMERIC;
    BEGIN
        SELECT 
            COALESCE(SUM(hours), 0), 
            COALESCE(SUM(hours * 125.00), 0)
        INTO 
            api_total_hours, 
            api_total_amount
        FROM time_logs
        WHERE engagement_id = api_engagement_id
        AND date BETWEEN CURRENT_DATE - INTERVAL '20 days' AND CURRENT_DATE - INTERVAL '11 days';
        
        -- Invoice for API Integration (paid status)
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
            project_name,
            billing_contact_name,
            billing_contact_email,
            billing_address,
            billing_city,
            billing_state,
            billing_zip,
            billing_country
        )
        VALUES (
            test_user_id,
            'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-002',
            'TechStart Inc',
            api_engagement_id,
            CURRENT_DATE - INTERVAL '10 days',
            CURRENT_DATE + INTERVAL '5 days',
            api_total_amount,
            api_total_hours,
            'paid',
            'Invoice for API integration services - Phase 1',
            CURRENT_DATE - INTERVAL '20 days',
            CURRENT_DATE - INTERVAL '11 days',
            'API Integration',
            'Jane Smith',
            'jane@techstart.com',
            '456 Tech Blvd',
            'Silicon Valley',
            'CA',
            '94025',
            'USA'
        );
    END;
    
    -- Invoice for Global Marketing project-based work (partial billing)
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
        project_name,
        billing_contact_name,
        billing_contact_email,
        billing_address,
        billing_city,
        billing_state,
        billing_zip,
        billing_country
    )
    VALUES (
        test_user_id,
        'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-003',
        'Global Marketing Ltd',
        marketing_engagement_id,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        1750.00, -- 50% of project amount
        0, -- No hours for project-based
        'submitted',
        'Phase 1 deliverable for marketing campaign (50% of project fee)',
        CURRENT_DATE - INTERVAL '15 days',
        CURRENT_DATE,
        'Marketing Campaign',
        'Mark Johnson',
        'mark@globalmarketing.com',
        '789 Commerce Ave',
        'Chicago',
        'IL',
        '60601',
        'USA'
    );
    
    -- Insert an overdue invoice for completed work
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
        project_name,
        billing_contact_name,
        billing_contact_email,
        billing_address,
        billing_city,
        billing_state,
        billing_zip,
        billing_country
    )
    VALUES (
        test_user_id,
        'INV-' || to_char(CURRENT_DATE - INTERVAL '60 days', 'YYYYMM') || '-001',
        'Acme Corporation',
        logo_engagement_id,
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE - INTERVAL '30 days',
        1200.00, -- Project amount
        0, -- No hours for project-based
        'overdue',
        'Logo design and brand identity package',
        CURRENT_DATE - INTERVAL '90 days',
        CURRENT_DATE - INTERVAL '30 days',
        'Logo Design',
        'John Doe',
        'john@acme.com',
        '123 Main St',
        'Metropolis',
        'NY',
        '10001',
        'USA'
    );
    
END $$; 