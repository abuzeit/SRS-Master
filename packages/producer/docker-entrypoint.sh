#!/bin/sh
set -e

echo "Running Prisma migrations for producer local database..."
cd /app
./node_modules/.bin/prisma migrate deploy --schema=packages/producer/prisma/schema.prisma

echo "Starting producer..."
cd /app/packages/producer
exec node /app/packages/producer/dist/index.js
