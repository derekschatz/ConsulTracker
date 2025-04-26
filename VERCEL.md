# Vercel Deployment Guide

This document explains how the application is structured for Vercel deployment.

## Architecture

The application is deployed as a combination of:

1. **Static Frontend**: Built with Vite and served from the `dist/public` directory
2. **API Handler**: A serverless Express application in `api/handler.js` using ES modules

## Files

- `api/handler.js`: The main serverless handler that serves both the API and static content (ES module)
- `vercel.json`: Configuration for routing and builds
- `package.json`: NPM scripts and dependencies (has "type": "module")

## Environment Variables

Make sure to set these in your Vercel project:

- `DATABASE_URL`: The PostgreSQL connection string (required)
- `NODE_ENV`: Set to "production" for production deployments

## Testing the Deployment

Once deployed, you can test the following endpoints:

- `/api/health`: Should return a basic health check response
- `/api/dbstatus`: Should check the database connection

## Debugging

If you encounter issues:

1. Check the Function Logs in the Vercel dashboard
2. Verify that environment variables are set correctly
3. Check if the database connection is working

## JavaScript Module System

This project uses ES modules (ESM) rather than CommonJS:
- All `.js` files are treated as ES modules because `package.json` has `"type": "module"`
- We use `import` and `export` syntax instead of `require` and `module.exports`
- Path resolution is handled with `import.meta.url` and `fileURLToPath`

## Future Improvements

As we continue to enhance the serverless deployment:

1. Add more API endpoints based on the original routes
2. Implement authentication
3. Add better error handling
4. Optimize database connections

## Notes

- Express is compatible with serverless functions, but requires special handling
- Each function invocation creates a new Express app instance
- Database connections should be reused when possible 