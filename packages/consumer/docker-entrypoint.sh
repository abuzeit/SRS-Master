#!/bin/sh
set -e

echo "=== Running Prisma migrations ==="
cd /app
./node_modules/.bin/prisma migrate deploy --schema=packages/consumer/prisma/schema.prisma

echo "=== Migrations complete, starting consumer ==="
exec "$@"
