#!/bin/sh
# =============================================================================
# SRS Master — Consumer Docker Entrypoint
# =============================================================================
# Runs Prisma migrations before starting the consumer.
# This ensures the database schema is always up to date on container start.
# =============================================================================

set -e

echo "=== Running Prisma migrations ==="
cd /app/packages/consumer
npx prisma migrate deploy

echo "=== Migrations complete, starting consumer ==="
cd /app
exec "$@"
