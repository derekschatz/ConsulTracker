-- Initialize Contraq Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  billing_contact_name VARCHAR(100),
  billing_contact_email VARCHAR(100),
  billing_address TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(50),
  billing_zip VARCHAR(20),
  billing_country VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Engagements Table
CREATE TABLE IF NOT EXISTS engagements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  project_name VARCHAR(100) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  engagement_type VARCHAR(20) NOT NULL DEFAULT 'hourly',
  hourly_rate NUMERIC(10,2),
  project_amount NUMERIC(10,2),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  net_terms INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Time Logs Table
CREATE TABLE IF NOT EXISTS time_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  engagement_id INTEGER NOT NULL REFERENCES engagements(id),
  date TIMESTAMP NOT NULL,
  hours DOUBLE PRECISION NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  client_name VARCHAR(100) NOT NULL,
  engagement_id INTEGER NOT NULL REFERENCES engagements(id),
  issue_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  total_hours DOUBLE PRECISION NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  notes TEXT,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  project_name VARCHAR(100),
  invoice_type VARCHAR(20) NOT NULL,
  billing_contact_name VARCHAR(100),
  billing_contact_email VARCHAR(100),
  billing_address TEXT,
  billing_city VARCHAR(50),
  billing_state VARCHAR(50),
  billing_zip VARCHAR(20),
  billing_country VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  plan VARCHAR(20) NOT NULL DEFAULT 'basic',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business Info Table
CREATE TABLE IF NOT EXISTS business_info (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  business_name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100),
  contact_email VARCHAR(100),
  address TEXT,
  city VARCHAR(50),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(50),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Sample Data

-- Sample User
INSERT INTO users (username, password, name, email)
VALUES ('admin', 'adminpassword', 'Admin User', 'admin@example.com')
ON CONFLICT (username) DO NOTHING;

-- Sample Clients
INSERT INTO clients (user_id, name, billing_contact_name, billing_contact_email)
VALUES 
  (1, 'Acme Corporation', 'John Smith', 'john@acme.com'),
  (1, 'TechCorp Industries', 'Sarah Johnson', 'sarah@techcorp.com')
ON CONFLICT DO NOTHING;

-- Sample Engagements
INSERT INTO engagements (user_id, client_id, project_name, start_date, end_date, engagement_type, hourly_rate, status)
VALUES 
  (1, 1, 'Website Redesign', '2025-01-01', '2025-06-30', 'hourly', 120.00, 'active'),
  (1, 2, 'Mobile App Development', '2025-02-15', '2025-05-15', 'hourly', 150.00, 'active')
ON CONFLICT DO NOTHING;

-- Sample Subscription
INSERT INTO subscriptions (user_id, status, plan, current_period_start, current_period_end)
VALUES (1, 'active', 'basic', NOW(), NOW() + INTERVAL '1 year')
ON CONFLICT DO NOTHING;

-- Sample Business Info
INSERT INTO business_info (user_id, business_name, contact_name, contact_email, address, city, state, zip, country)
VALUES (1, 'My Consulting Firm', 'Admin User', 'admin@example.com', '123 Main St', 'San Francisco', 'CA', '94105', 'USA')
ON CONFLICT DO NOTHING; 