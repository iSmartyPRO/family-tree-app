# ──────────────────────────────────────────────
# Stage 1: Build Frontend
# ──────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/src/frontend

COPY src/frontend/package*.json ./
RUN npm ci --omit=dev=false

COPY src/frontend/ ./
RUN npm run build
# Output goes to /app/dist (vite.config.js: build.outDir = '../../dist')

# ──────────────────────────────────────────────
# Stage 2: Production Image
# ──────────────────────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Install backend deps
COPY src/backend/package*.json ./src/backend/
RUN cd src/backend && npm ci --omit=dev

# Copy backend source
COPY src/backend/ ./src/backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy config (will be overridden by volume mount in production)
COPY config.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S rodolog -u 1001 && \
    chown -R rodolog:nodejs /app

USER rodolog

EXPOSE 3000

# Use dumb-init to handle PID 1 properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/backend/server.js"]
