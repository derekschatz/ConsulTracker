-- Create business_info table for storing company details
CREATE TABLE IF NOT EXISTS business_info (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  company_name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(255),
  zip VARCHAR(50),
  phone_number VARCHAR(50),
  tax_id VARCHAR(100),
  company_logo VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS business_info_user_id_idx ON business_info(user_id);

-- Ensure user_id is unique
ALTER TABLE business_info ADD CONSTRAINT unique_user_id UNIQUE (user_id); 