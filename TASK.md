# Contraq Tasks

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
  - [x] Add client management button and modal to Engagements page
  - [x] Prevent deletion of clients with active engagements
  - [x] Add support for project-based engagements alongside hourly engagements
  - [x] Integrate HeroSection component with responsive design and animations
  - [x] Fix invoice modal to show correct fields for hourly engagements (2024-06-08)
  - [x] Redesign account settings page to use sub-navigation panel and scrollable sections (2024-07-14)
  - [x] Make Dashboard accessible only to users with "Pro" or "Team" subscription tiers (2024-07-19)
- [x] Add PDF generation for invoices
- [ ] Implement email notifications
- [ ] Add data validation and error handling
- [ ] Set up automated testing
- [x] Deploy application
  - [x] Clean up unnecessary files for deployment
  - [x] Update .gitignore to exclude test and debug files
  - [x] Configure production environment
  - [x] Set up client-side build in Replit deployment (2024-05-13)
  - [ ] Set up CI/CD pipeline

## Completed Tasks
- [x] Project setup and configuration
- [x] Define database schema
- [x] Rebrand from ConsulTracker to Contraq

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
- Added reusable HeroSection component with animations and theme support for landing pages
- Fixed active engagement metric on dashboard to use date-based calculation instead of stored status
- Updated YTD Revenue to "Total Paid YTD" to accurately show revenue from paid invoices
- [x] Moved pricing table to its own page and added a "Get Started Today" CTA button on the landing page (2024-07-12)
- [x] Removed Stripe integration for the Solo pricing tier and directed it to the signup form (2024-07-12)
- [x] Implemented Stripe subscription status check API and React hook (2024-07-12)
- [x] Fixed Stripe API key configuration issues with fallback to hardcoded test keys in development (2024-07-12)
- [x] Added Stripe billing section to account settings with customer portal integration (2024-07-16)
- [x] Enhanced pricing page to show "Current Plan" for authenticated users on their current tier (2024-07-16)
- [x] Implemented subscription-based access control for the Dashboard, making it accessible only to Pro and Team tier subscribers (2024-07-19)
- [x] Added client limit of 5 clients for users on the free (Solo) tier with upgrade prompt (2024-07-20)
- [x] Enhanced navbar to display user profile and navigation options when authenticated (2024-07-20)
- [x] Updated navbar to show consistent app navigation links for authenticated users across all pages (2024-07-20)
- [x] Replaced sidebar with consistent top navigation bar across the entire application (2024-07-20)
- [x] Improved navigation by removing Pricing link and adding Upgrade button to user dropdown menu (2024-07-20)
- [x] Implemented new animated sidebar navigation for authenticated users to replace header navigation (2024-07-27)
- [x] Fixed client-side application deployment in Replit by properly configuring build process (2024-05-13)

## Notes
- Using Drizzle ORM for database operations
- Schema includes support for multiple clients and engagements
- Time logs are linked to engagements for proper tracking
- Invoice system supports line items and different statuses 
- Client billing details are automatically pulled when creating invoices 