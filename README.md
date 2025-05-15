# Consulting Time Tracker

A full-stack web application for consultants to manage client engagements, track billable hours, and generate invoices.

## 📋 Overview

This application streamlines consulting operations by providing an integrated solution for:
- Managing client engagements
- Tracking daily time entries
- Generating professional invoices
- Visualizing revenue through a dashboard

## ✨ Features

- **Engagement Management:** Create and manage client engagements with details like hourly rates and project dates
- **Time Tracking:** Log daily work hours with descriptions linked to specific engagements
- **Dashboard:** View year-to-date revenue and key performance metrics
- **Invoice Generation:** Automatically generate monthly invoices based on time entries with PDF export
- **Detailed History:** Review and filter time logs by date range and engagement

## 🛠️ Tech Stack

### Frontend
- React with TypeScript
- Shadcn UI component library 
- Tailwind CSS for styling
- React Query for data fetching
- React Hook Form for form handling
- jsPDF for PDF generation

### Backend
- Express.js server
- Drizzle ORM with PostgreSQL
- Zod for validation
- Passport.js for authentication

### Testing
- Vitest for unit and integration testing
- Supertest for API testing

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd consulting-time-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/dbname
   SESSION_SECRET=your_session_secret
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## 📊 Data Structure

The application uses the following data models:
- **Clients:** Represent consulting clients
- **Engagements:** Projects with specific clients, including hourly rates and date ranges
- **Time Logs:** Daily time entries linked to engagements
- **Invoices:** Monthly billing documents with line items based on time logs

## 🧪 Testing

Run tests using the following commands:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

## 🐳 Docker Deployment

The application includes Docker configuration for easy deployment:

```bash
# Build and start with Docker Compose
docker-compose up -d
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 