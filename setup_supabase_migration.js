import fs from 'fs';

// Read the PostgreSQL dump file
const dumpFile = 'supabase_ready_dump.sql';
const rawSql = fs.readFileSync(dumpFile, 'utf8');

// Supabase-specific modifications
let supabaseSql = rawSql;

// 1. Remove owner assignments as Supabase uses 'postgres' or 'supabase_admin'
supabaseSql = supabaseSql.replace(/OWNER TO neondb_owner;/g, 'OWNER TO postgres;');

// 2. Add RLS policies for Supabase Auth integration
const rlsPolicies = `
-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Users can view their own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can insert their own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id::text);
  
CREATE POLICY "Users can update their own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can delete their own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id::text);

-- Similar policies for other tables
-- Engagements
CREATE POLICY "Users can view their own engagements" ON public.engagements
  FOR SELECT USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can insert their own engagements" ON public.engagements
  FOR INSERT WITH CHECK (auth.uid() = user_id::text);
  
CREATE POLICY "Users can update their own engagements" ON public.engagements
  FOR UPDATE USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can delete their own engagements" ON public.engagements
  FOR DELETE USING (auth.uid() = user_id::text);

-- Time logs
CREATE POLICY "Users can view their own time logs" ON public.time_logs
  FOR SELECT USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can insert their own time logs" ON public.time_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id::text);
  
CREATE POLICY "Users can update their own time logs" ON public.time_logs
  FOR UPDATE USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can delete their own time logs" ON public.time_logs
  FOR DELETE USING (auth.uid() = user_id::text);

-- Invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can insert their own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id::text);
  
CREATE POLICY "Users can update their own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can delete their own invoices" ON public.invoices
  FOR DELETE USING (auth.uid() = user_id::text);

-- Business info
CREATE POLICY "Users can view their own business info" ON public.business_info
  FOR SELECT USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can insert their own business info" ON public.business_info
  FOR INSERT WITH CHECK (auth.uid() = user_id::text);
  
CREATE POLICY "Users can update their own business info" ON public.business_info
  FOR UPDATE USING (auth.uid() = user_id::text);
  
CREATE POLICY "Users can delete their own business info" ON public.business_info
  FOR DELETE USING (auth.uid() = user_id::text);
`;

// 3. Add type cast for user_id fields for Supabase Auth compatibility
supabaseSql = supabaseSql.replace(/user_id integer/g, 'user_id uuid');

// 4. Add Supabase specific schema adjustments
const supabaseSchema = `
-- Add Supabase extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Modify user_id in existing data to work with Supabase Auth
-- This will need to be handled carefully with your actual data migration
`;

// Add our modifications at the end of the file
supabaseSql = supabaseSql + '\n' + supabaseSchema + '\n' + rlsPolicies;

// Write the modified SQL to a new file
fs.writeFileSync('supabase_import.sql', supabaseSql);

console.log('Supabase-compatible SQL file has been created: supabase_import.sql'); 