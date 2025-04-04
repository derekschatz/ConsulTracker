# Use Node.js LTS version
FROM node:20-alpine

# Install PostgreSQL client and wait-for-it script
RUN apk add --no-cache postgresql-client bash
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /usr/local/bin/wait-for-it
RUN chmod +x /usr/local/bin/wait-for-it

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000
ENV DATABASE_URL=postgres://user:password@db:5432/app_db

# Expose port 3000
EXPOSE 3000

# Create start script
RUN echo '#!/bin/sh\nwait-for-it db:5432 -t 60 -- npm run db:push && npm run dev' > /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Start the application
CMD ["/usr/local/bin/start.sh"] 