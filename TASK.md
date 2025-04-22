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
- [x] Add PDF generation for invoices
- [ ] Implement email notifications
- [ ] Add data validation and error handling
- [ ] Set up automated testing
- [ ] Deploy application

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

## Notes
- Using Drizzle ORM for database operations
- Schema includes support for multiple clients and engagements
- Time logs are linked to engagements for proper tracking
- Invoice system supports line items and different statuses 