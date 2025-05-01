-- Script to add paid and overdue invoices for testuser

DO $$
DECLARE
    test_user_id INTEGER;
    client_id INTEGER;
    engagement_id INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO test_user_id FROM users WHERE username = 'testuser';
    
    -- Get client ID (create if doesn't exist)
    SELECT id INTO client_id FROM clients WHERE user_id = test_user_id AND name = 'Test Client';
    
    IF client_id IS NULL THEN
        INSERT INTO clients (user_id, name, billing_contact_name, billing_contact_email)
        VALUES (test_user_id, 'Test Client', 'Contact Person', 'contact@testclient.com')
        RETURNING id INTO client_id;
    END IF;
    
    -- Create a test engagement for invoices (if not exists)
    SELECT id INTO engagement_id FROM engagements 
    WHERE user_id = test_user_id AND client_id = client_id AND project_name = 'Test Project';
    
    IF engagement_id IS NULL THEN
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
            test_user_id, 
            client_id, 
            'Test Project', 
            CURRENT_DATE - INTERVAL '90 days', 
            CURRENT_DATE + INTERVAL '90 days', 
            'hourly', 
            100.00,
            'Test project for invoice status examples',
            'active'
        )
        RETURNING id INTO engagement_id;
    END IF;
    
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
        test_user_id,
        'INV-PAID-001',
        'Test Client',
        engagement_id,
        CURRENT_DATE - INTERVAL '45 days', -- Issued 45 days ago
        CURRENT_DATE - INTERVAL '15 days', -- Due 15 days ago
        850.00,
        8.5,
        'paid',
        'This invoice has been paid in full',
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE - INTERVAL '45 days',
        'Test Project'
    );
    
    -- Add overdue invoice (30 days overdue)
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
        test_user_id,
        'INV-OVERDUE-001',
        'Test Client',
        engagement_id,
        CURRENT_DATE - INTERVAL '60 days', -- Issued 60 days ago
        CURRENT_DATE - INTERVAL '30 days', -- Due 30 days ago
        1250.00,
        12.5,
        'overdue',
        'This invoice is 30 days overdue',
        CURRENT_DATE - INTERVAL '75 days',
        CURRENT_DATE - INTERVAL '60 days',
        'Test Project'
    );
    
    -- Add severely overdue invoice (90 days overdue)
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
        test_user_id,
        'INV-OVERDUE-002',
        'Test Client',
        engagement_id,
        CURRENT_DATE - INTERVAL '120 days', -- Issued 120 days ago
        CURRENT_DATE - INTERVAL '90 days', -- Due 90 days ago
        1750.00,
        17.5,
        'overdue',
        'This invoice is 90 days overdue',
        CURRENT_DATE - INTERVAL '135 days',
        CURRENT_DATE - INTERVAL '120 days',
        'Test Project'
    );
    
    -- Add another paid invoice with different payment terms
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
        test_user_id,
        'INV-PAID-002',
        'Test Client',
        engagement_id,
        CURRENT_DATE - INTERVAL '15 days', -- Recent invoice
        CURRENT_DATE + INTERVAL '15 days', -- Not due yet but paid early
        650.00,
        6.5,
        'paid',
        'This invoice was paid early',
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '15 days',
        'Test Project'
    );
    
    -- Add draft/pending invoice 
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
        test_user_id,
        'INV-DRAFT-001',
        'Test Client',
        engagement_id,
        CURRENT_DATE, -- Today
        CURRENT_DATE + INTERVAL '30 days', -- Due in 30 days
        950.00,
        9.5,
        'submitted',
        'This invoice is pending payment',
        CURRENT_DATE - INTERVAL '15 days',
        CURRENT_DATE,
        'Test Project'
    );
    
END $$; 