-- Add engagement_type column with default value 'hourly'
ALTER TABLE engagements 
  ADD COLUMN IF NOT EXISTS engagement_type TEXT NOT NULL DEFAULT 'hourly';

-- Add project_amount column as nullable (only required for project-based engagements)
ALTER TABLE engagements 
  ADD COLUMN IF NOT EXISTS project_amount NUMERIC;

-- Make hourly_rate nullable (since it's only required for hourly engagements)
ALTER TABLE engagements 
  ALTER COLUMN hourly_rate DROP NOT NULL;

-- Update existing engagements to ensure consistency
UPDATE engagements
  SET engagement_type = 'hourly'
  WHERE engagement_type IS NULL;

-- Add comment explaining the schema change
COMMENT ON COLUMN engagements.engagement_type IS 'Type of engagement: hourly or project-based';
COMMENT ON COLUMN engagements.project_amount IS 'Total amount for project-based engagements'; 