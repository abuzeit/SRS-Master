#!/bin/sh
# =============================================================================
# SRS Master — Consumer Docker Entrypoint
# =============================================================================
# Runs Prisma migrations before starting the consumer.
# This ensures the database schema is always up to date on container start.
# =============================================================================

set -e

echo "=== Running Prisma migrations ==="
cd /app
./node_modules/.bin/prisma migrate deploy --schema=packages/consumer/prisma/schema.prisma

echo "=== Migrations complete, starting consumer ==="
cd /app
exec "$@"
