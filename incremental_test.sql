-- Incremental test script for testuser
-- Creating data step by step

-- Make sure testuser exists
INSERT INTO users (username, password, name, email, created_at)
VALUES ('testuser', '$2a$10$iqEHxmX9PdgaS5hkS6MdNeOTHnQI0N5nVGq2TZk3Cm4DCpPeAXr3K', 'Test User', 'testuser@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Get user ID
WITH user_data AS (
    SELECT id FROM users WHERE username = 'testuser'
)

-- Add clients
INSERT INTO clients (user_id, name, billing_contact_name, billing_contact_email, billing_address, billing_city, billing_state, billing_zip, billing_country)
SELECT 
    id, 'Acme Corporation', 'John Doe', 'john@acme.com', '123 Main St', 'Metropolis', 'NY', '10001', 'USA'
FROM user_data;

INSERT INTO clients (user_id, name, billing_contact_name, billing_contact_email, billing_address, billing_city, billing_state, billing_zip, billing_country)
SELECT 
    id, 'TechStart Inc', 'Jane Smith', 'jane@techstart.com', '456 Tech Blvd', 'Silicon Valley', 'CA', '94025', 'USA'
FROM users WHERE username = 'testuser';

-- Add engagements
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
SELECT 
    u.id, 
    c.id, 
    'Website Redesign', 
    CURRENT_DATE - INTERVAL '45 days', 
    CURRENT_DATE + INTERVAL '45 days', 
    'hourly', 
    95.00, 
    'Complete redesign of corporate website', 
    'active'
FROM 
    users u
JOIN 
    clients c ON c.user_id = u.id
WHERE 
    u.username = 'testuser' AND c.name = 'Acme Corporation';

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
SELECT 
    u.id, 
    c.id, 
    'API Integration', 
    CURRENT_DATE - INTERVAL '30 days', 
    CURRENT_DATE + INTERVAL '60 days', 
    'hourly', 
    125.00, 
    'Integrate payment processing APIs', 
    'active'
FROM 
    users u
JOIN 
    clients c ON c.user_id = u.id
WHERE 
    u.username = 'testuser' AND c.name = 'TechStart Inc';

-- Add time logs
INSERT INTO time_logs (user_id, engagement_id, date, hours, description, created_at)
SELECT
    u.id,
    e.id,
    CURRENT_DATE - INTERVAL '30 days',
    4.0,
    'Initial planning',
    CURRENT_TIMESTAMP
FROM
    users u
JOIN
    engagements e ON e.user_id = u.id
WHERE
    u.username = 'testuser' AND e.project_name = 'Website Redesign';

INSERT INTO time_logs (user_id, engagement_id, date, hours, description, created_at)
SELECT
    u.id,
    e.id,
    CURRENT_DATE - INTERVAL '25 days',
    6.0,
    'Frontend development',
    CURRENT_TIMESTAMP
FROM
    users u
JOIN
    engagements e ON e.user_id = u.id
WHERE
    u.username = 'testuser' AND e.project_name = 'Website Redesign';

INSERT INTO time_logs (user_id, engagement_id, date, hours, description, created_at)
SELECT
    u.id,
    e.id,
    CURRENT_DATE - INTERVAL '20 days',
    5.0,
    'API research',
    CURRENT_TIMESTAMP
FROM
    users u
JOIN
    engagements e ON e.user_id = u.id
WHERE
    u.username = 'testuser' AND e.project_name = 'API Integration';

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
SELECT
    u.id,
    'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-001',
    c.name,
    e.id,
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '25 days',
    950.00,
    10.0,
    'submitted',
    'Invoice for website redesign services',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '5 days',
    e.project_name
FROM
    users u
JOIN
    engagements e ON e.user_id = u.id
JOIN
    clients c ON e.client_id = c.id
WHERE
    u.username = 'testuser' AND e.project_name = 'Website Redesign';

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
SELECT
    u.id,
    'INV-PAID-' || to_char(CURRENT_DATE, 'YYYYMM'),
    c.name,
    e.id,
    CURRENT_DATE - INTERVAL '20 days',
    CURRENT_DATE - INTERVAL '5 days',
    625.00,
    5.0,
    'paid',
    'Invoice for API integration services - PAID',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '20 days',
    e.project_name
FROM
    users u
JOIN
    engagements e ON e.user_id = u.id
JOIN
    clients c ON e.client_id = c.id
WHERE
    u.username = 'testuser' AND e.project_name = 'API Integration';

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
SELECT
    u.id,
    'INV-OVERDUE-' || to_char(CURRENT_DATE, 'YYYYMM'),
    c.name,
    e.id,
    CURRENT_DATE - INTERVAL '45 days',
    CURRENT_DATE - INTERVAL '15 days',
    475.00,
    5.0,
    'overdue',
    'This invoice is overdue',
    CURRENT_DATE - INTERVAL '60 days',
    CURRENT_DATE - INTERVAL '45 days',
    e.project_name
FROM
    users u
JOIN
    engagements e ON e.user_id = u.id
JOIN
    clients c ON e.client_id = c.id
WHERE
    u.username = 'testuser' AND e.project_name = 'Website Redesign'; 