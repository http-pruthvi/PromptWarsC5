# Use lightweight Node.js 20 LTS Alpine image
FROM node:20-alpine

# Install build tools for native addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root and package manifests for clean caching
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies across npm workspaces
RUN npm install

# Copy all source code
COPY . .

# Build shared types, server, and client bundles
RUN npm run build

# Default environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Create SQLite data directory
RUN mkdir -p /app/server/data

EXPOSE 4000

# Start Express server (serves both API and production client)
CMD ["npm", "start"]
