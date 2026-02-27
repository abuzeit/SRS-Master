#!/bin/bash
# =============================================================================
# SRS Master — Producer Docker Entrypoint
# =============================================================================
#
# Runs Prisma migrations against the local PostgreSQL database before starting
# the producer application. This ensures the outbox_events table exists.
# =============================================================================

set -e

echo "Running Prisma migrations for producer local database..."
./node_modules/.bin/prisma migrate deploy

echo "Starting producer..."
exec node dist/index.js
