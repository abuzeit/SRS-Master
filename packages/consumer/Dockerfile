# =============================================================================
# SRS Master — Consumer Dockerfile
# =============================================================================
# Multi-stage build with Prisma v6 client generation.
#
# Key difference from producer Dockerfile:
#   - Includes `prisma generate` step to build the query engine
#   - Copies prisma/ directory containing schema.prisma
#   - Runs migrations on startup via entrypoint script
#
# Stage 1 (builder): npm install → prisma generate → tsc
# Stage 2 (runner):  Node.js 20 Alpine with generated Prisma client
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root and relevant packages
COPY package.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/consumer/package.json ./packages/consumer/

# Install ALL dependencies (dev deps needed for build)
RUN npm install --workspace=packages/shared --workspace=packages/consumer

# Copy source code and Prisma schema
COPY packages/shared/ ./packages/shared/
COPY packages/consumer/ ./packages/consumer/

# Generate Prisma client (must happen before TypeScript compilation)
RUN npx prisma generate --schema=packages/consumer/prisma/schema.prisma

# Compile TypeScript
RUN npm run build --workspace=packages/shared
RUN cd packages/consumer && npx tsc

# ---------------------------------------------------------------------------
# Stage 2: Production Runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma's query engine
RUN apk add --no-cache openssl

USER node
WORKDIR /app

# Copy build artifacts
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=node:node /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=builder --chown=node:node /app/packages/consumer/package.json ./packages/consumer/
COPY --from=builder --chown=node:node /app/packages/consumer/dist/ ./packages/consumer/dist/
COPY --from=builder --chown=node:node /app/packages/consumer/prisma/ ./packages/consumer/prisma/
COPY --from=builder --chown=node:node /app/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /app/packages/shared/node_modules/ ./packages/shared/node_modules/
COPY --from=builder --chown=node:node /app/packages/consumer/node_modules/ ./packages/consumer/node_modules/

# Copy the entrypoint script
COPY --chown=node:node packages/consumer/docker-entrypoint.sh /app/docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "process.exit(0)"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "packages/consumer/dist/index.js"]
