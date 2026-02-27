#!/bin/bash
# =============================================================================
# SRS Master — SCRAM-SHA-512 User Creation Script
# =============================================================================
#
# Creates SASL/SCRAM-SHA-512 users for Kafka authentication.
#
# Users:
#   producer-user  — Used by all Level-2 remote SCADA nodes
#   consumer-user  — Used by the Level-3 master aggregation station
#   admin-user     — Used for cluster management (topic/ACL operations)
#
# IMPORTANT: Change the default passwords before production use!
#
# Usage:
#   ./create-scram-users.sh [bootstrap-server]
# =============================================================================

set -euo pipefail

BOOTSTRAP=${1:-kafka-1:9092}
KAFKA_BIN=${KAFKA_BIN:-/usr/bin}

# Read passwords from environment or use defaults for development
PRODUCER_PASSWORD=${PRODUCER_PASSWORD:-producer-secret-change-me}
CONSUMER_PASSWORD=${CONSUMER_PASSWORD:-consumer-secret-change-me}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin-secret-change-me}

echo "=== Creating SCRAM-SHA-512 Users ==="
echo ""

echo "[1/3] Creating producer-user..."
${KAFKA_BIN}/kafka-configs --alter \
  --bootstrap-server "${BOOTSTRAP}" \
  --entity-type users \
  --entity-name producer-user \
  --add-config "SCRAM-SHA-512=[password=${PRODUCER_PASSWORD}]"

echo "[2/3] Creating consumer-user..."
${KAFKA_BIN}/kafka-configs --alter \
  --bootstrap-server "${BOOTSTRAP}" \
  --entity-type users \
  --entity-name consumer-user \
  --add-config "SCRAM-SHA-512=[password=${CONSUMER_PASSWORD}]"

echo "[3/3] Creating admin-user..."
${KAFKA_BIN}/kafka-configs --alter \
  --bootstrap-server "${BOOTSTRAP}" \
  --entity-type users \
  --entity-name admin-user \
  --add-config "SCRAM-SHA-512=[password=${ADMIN_PASSWORD}]"

echo ""
echo "=== SCRAM-SHA-512 Users Created ==="
echo ""
echo "SECURITY REMINDER: Change default passwords in production!"
echo "Set environment variables: PRODUCER_PASSWORD, CONSUMER_PASSWORD, ADMIN_PASSWORD"
