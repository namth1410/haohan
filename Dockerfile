# ========================================
# Stage 1: Build Frontend
# ========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# ========================================
# Stage 2: Production Runtime
# ========================================
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy server code (including production.ts)
COPY server ./server
COPY tsconfig*.json ./

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Install tsx for running TypeScript server
RUN npm install tsx --save-dev

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/bucket/check || exit 1

# Run the production server
CMD ["npx", "tsx", "server/production.ts"]
