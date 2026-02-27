# =============================================================================
# SRS Master — Producer Dockerfile (with Outbox / Prisma v6)
# =============================================================================
#
# Multi-stage build optimized for production:
#
#   1. base    — Alpine Node.js + npm workspace setup
#   2. build   — TypeScript compilation + Prisma generation
#   3. runtime — Minimal production image with Prisma engine
#
# The producer now has its own local PostgreSQL for the outbox pattern.
# Prisma migrations run at container startup via docker-entrypoint.sh.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Base — Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app

# Install OpenSSL for Prisma's query engine
RUN apk add --no-cache openssl

# Copy workspace root files
COPY package.json package-lock.json* tsconfig.base.json ./

# Copy package manifests for workspace packages
COPY packages/shared/package.json packages/shared/
COPY packages/producer/package.json packages/producer/

# Copy Prisma schema (needed for generate step)
COPY packages/producer/prisma/schema.prisma packages/producer/prisma/

# Install all dependencies (including devDependencies for build)
RUN npm install --workspace=packages/shared --workspace=packages/producer

# ---------------------------------------------------------------------------
# Stage 2: Build — Compile TypeScript + Generate Prisma Client
# ---------------------------------------------------------------------------
FROM base AS build
WORKDIR /app

# Copy all source code
COPY packages/shared/ packages/shared/
COPY packages/producer/ packages/producer/

# Generate Prisma client
RUN npx prisma generate --schema=packages/producer/prisma/schema.prisma

# Build shared package first (producer depends on it)
RUN npm run build --workspace=packages/shared

# Build producer
RUN npm run build --workspace=packages/producer

# ---------------------------------------------------------------------------
# Stage 3: Runtime — Minimal production image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

# Install OpenSSL for Prisma query engine at runtime
RUN apk add --no-cache openssl

# Security: Run as non-root user
RUN addgroup -S scada && adduser -S scada -G scada

# Copy built artifacts and dependencies
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/producer/dist ./packages/producer/dist
COPY --from=build /app/packages/producer/package.json ./packages/producer/
# Copy Prisma schema and migration files (needed for migrate deploy)
COPY --from=build /app/packages/producer/prisma ./packages/producer/prisma

# Copy entrypoint script
COPY packages/producer/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Set working directory to producer package
WORKDIR /app/packages/producer

USER scada

# Health check — verify the process is running
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD pgrep -x node || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
