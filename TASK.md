# ConsulTracker Tasks

## Current Tasks
- [ ] Set up database schema and migrations
  - [x] Define initial schema (clients, engagements, time logs, invoices)
  - [ ] Create initial migration
  - [ ] Add indexes for performance optimization
  - [ ] Add foreign key constraints
- [ ] Implement authentication
  - [x] Set up user registration
  - [x] Set up login/logout
  - [ ] Add session management
- [ ] Create API routes
  - [x] Client management endpoints
  - [x] Engagement management endpoints
  - [x] Time log management endpoints
  - [x] Invoice management endpoints
  - [x] User and business settings endpoints
- [ ] Develop frontend components
  - [x] Dashboard layout
  - [x] Client management UI
  - [x] Engagement management UI
  - [x] Time logging UI
  - [x] Invoice generation UI
  - [x] Enhanced client information display on Engagements page
  - [x] Separate client and project columns in Engagements table
  - [x] Reverse display focus to prioritize engagements over clients
  - [x] Add clickable client names with sliding details panel
  - [x] Automatically populate client billing details on invoices
  - [x] User account settings page with personal info and business details
- [x] Add PDF generation for invoices
- [ ] Implement email notifications
- [ ] Add data validation and error handling
- [ ] Set up automated testing
- [ ] Deploy application
  - [x] Migrate database to Supabase
  - [ ] Migrate application to Vercel (in progress - 2023-10-20)
    - [x] Remove Replit-specific dependencies
    - [x] Configure vercel.json
    - [x] Fix server/index.ts export for serverless environment
    - [x] Update build scripts for Vercel
    - [x] Refactor to serverless architecture with api directory
    - [x] Fix path resolution issues for Vercel
    - [x] Address TypeScript compilation errors for deployment
    - [x] Switch to esbuild for serverless compilation
    - [x] Fix module resolution issues with explicit file extensions
    - [x] Create bundle-based deployment approach

## Completed Tasks
- [x] Project setup and configuration
- [x] Define database schema

## Discovered During Work
- Need to add indexes for frequently queried fields
- Consider adding soft delete for data retention
- Plan for data backup strategy
- Consider adding audit logging for critical operations
- Enhance UX by displaying additional client information on Engagements page
- Improve data table layout with separate columns for client and project information
- Enhance UX by making project/engagement information more prominent than client information
- Enhance client management workflow with inline editing capabilities
- Need to implement APIs for managing user personal info and business details
- Create backend endpoints for business logo upload and retrieval
- Add error handling for the account settings forms
- Modified business info form to use phone number instead of country field
- Need to refactor application for Vercel deployment from Replit
  - Remove Replit-specific dependencies and plugins
  - Update server configuration for serverless environment
  - Configure proper routing in vercel.json
  - Fix TypeScript compilation issues with esbuild for Vercel
  - Create serverless-compatible API structure
  - Use process.cwd() instead of import.meta.dirname
  - Add error handling for static file serving
  - Bypass TypeScript strict checking in favor of direct esbuild compilation
  - Use explicit file extensions for ESM compatibility
  - Use a single-bundle approach for serverless deployment

## Notes
- Using Drizzle ORM for database operations
- Schema includes support for multiple clients and engagements
- Time logs are linked to engagements for proper tracking
- Invoice system supports line items and different statuses 
- Client billing details are automatically pulled when creating invoices 