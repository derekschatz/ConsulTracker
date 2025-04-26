# Migrating ConsulTracker to Supabase

This document provides step-by-step instructions for migrating the ConsulTracker database to Supabase.

## Overview

The migration process involves:
1. Generating a database dump
2. Modifying the dump to be compatible with Supabase
3. Creating a Supabase project
4. Importing the modified dump
5. Updating application code to use Supabase

## Prerequisites

- Node.js installed
- Access to your current PostgreSQL database
- A Supabase account

## Step 1: Generate a Database Dump

We've already created a PostgreSQL dump file `supabase_ready_dump.sql`.

## Step 2: Prepare the Dump for Supabase

Run the script to convert the dump into a Supabase-compatible format:

```bash
node setup_supabase_migration.js
```

This will create a `supabase_import.sql` file with necessary modifications:
- Changed owner assignments to 'postgres'
- Added Row Level Security (RLS) policies
- Added Supabase UUID extension
- Prepared user_id fields for Supabase Auth

## Step 3: Create a Supabase Project

1. Go to [https://app.supabase.com/](https://app.supabase.com/)
2. Click "New Project"
3. Enter project details:
   - Name: ConsulTracker (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose closest to your users
4. Click "Create project" and wait for it to be provisioned

## Step 4: Import the Database

1. In your Supabase project, go to "SQL Editor"
2. Click "New Query"
3. Upload or paste the contents of `supabase_import.sql`
4. Run the query

### Important Note on User Data

The migration script converts user IDs to UUIDs for Supabase Auth compatibility. When migrating:

1. Create Supabase Auth users before or during migration
2. Update the user_id values in your tables to match the Auth user UUIDs
3. Test thoroughly to ensure data ownership works correctly

## Step 5: Update Your Application

### Update Environment Variables

Replace your current DATABASE_URL with Supabase connection:

```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

### Update Authentication

1. Replace your current auth system with Supabase Auth
2. Use the Supabase client for authentication:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'example-password',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'example-password',
});
```

### Update Database Access

Replace direct database access with Supabase client:

```typescript
// Query data
const { data, error } = await supabase
  .from('clients')
  .select('*');

// Insert data
const { data, error } = await supabase
  .from('clients')
  .insert([{ name: 'Client Name', user_id: user.id }]);

// Update data
const { data, error } = await supabase
  .from('clients')
  .update({ name: 'Updated Name' })
  .eq('id', clientId);

// Delete data
const { data, error } = await supabase
  .from('clients')
  .delete()
  .eq('id', clientId);
```

## Step 6: Test Thoroughly

After migration:
1. Test all CRUD operations
2. Verify RLS policies work correctly (users can only access their own data)
3. Test authentication flows
4. Verify data integrity

## Further Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introducing-javascript-client)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) 