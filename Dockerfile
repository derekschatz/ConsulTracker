# Base stage for shared settings
FROM node:20-alpine AS base

WORKDIR /app

# Development stage
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_ENV=development
ENV PORT=3000
EXPOSE 3000
# Install tsx globally for development
RUN npm install -g tsx
# Create a startup script
COPY <<-"EOF" /docker-entrypoint.sh
#!/bin/sh
echo "Running database migrations..."
npm run db:push
echo "Starting development server..."
npm run dev
EOF
RUN chmod +x /docker-entrypoint.sh
CMD ["/docker-entrypoint.sh"]

# Build stage
FROM base AS builder
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM base AS production
COPY package*.json ./
# Install both production and development dependencies for build tools
RUN npm install
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"] 