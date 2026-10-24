# Stage 1: Build stage
FROM node:22-alpine AS builder

# Install build tools for native addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root and package manifests for clean caching
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies including devDependencies across workspaces
RUN npm ci --include=dev

# Copy all source code
COPY . .

# Build shared types, server (tsc), and client (vite)
RUN npm run build

# Stage 2: Production runner stage
FROM node:22-alpine AS runner

# Install build tools for native addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy root and package manifests
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled outputs from builder
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Create SQLite data directory
RUN mkdir -p /app/server/data

EXPOSE 4000

# Start Express server (serves both API and production client)
CMD ["npm", "start"]
