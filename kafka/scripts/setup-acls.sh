#!/bin/bash
# =============================================================================
# SRS Master — Kafka ACL Setup Script
# =============================================================================
#
# Configures least-privilege access control lists for the SCADA system.
#
# Principle: Every identity gets ONLY the permissions it needs.
#
#   Producer users → WRITE to scada.l2.* topics
#   Consumer users → READ from scada.l2.* topics + consumer group access
#   Admin users    → Full cluster management (topic create/delete, ACL mgmt)
#
# Usage:
#   ./setup-acls.sh [bootstrap-server]
# =============================================================================

set -euo pipefail

BOOTSTRAP=${1:-kafka-1:9092}
KAFKA_BIN=${KAFKA_BIN:-/usr/bin}

echo "=== Configuring Kafka ACLs (Least Privilege) ==="
echo ""

# ---------------------------------------------------------------------------
# Producer ACLs — WRITE only to scada.l2.* topics
# ---------------------------------------------------------------------------

echo "[Producers] Granting WRITE access to scada.l2.* topics..."

for TOPIC in scada.l2.telemetry.flow scada.l2.telemetry.pressure scada.l2.telemetry.temperature scada.l2.events scada.l2.alarms; do
  ${KAFKA_BIN}/kafka-acls --add \
    --bootstrap-server "${BOOTSTRAP}" \
    --allow-principal "User:producer-user" \
    --operation Write \
    --operation Describe \
    --topic "${TOPIC}"
done

# Producers also need IdempotentWrite for exactly-once semantics
${KAFKA_BIN}/kafka-acls --add \
  --bootstrap-server "${BOOTSTRAP}" \
  --allow-principal "User:producer-user" \
  --operation IdempotentWrite \
  --cluster

echo "[Producers] ACLs configured"

# ---------------------------------------------------------------------------
# Consumer ACLs — READ from topics + consumer group management
# ---------------------------------------------------------------------------

echo "[Consumers] Granting READ access to scada.l2.* topics..."

for TOPIC in scada.l2.telemetry.flow scada.l2.telemetry.pressure scada.l2.telemetry.temperature scada.l2.events scada.l2.alarms; do
  ${KAFKA_BIN}/kafka-acls --add \
    --bootstrap-server "${BOOTSTRAP}" \
    --allow-principal "User:consumer-user" \
    --operation Read \
    --operation Describe \
    --topic "${TOPIC}"
done

# Consumer group access
${KAFKA_BIN}/kafka-acls --add \
  --bootstrap-server "${BOOTSTRAP}" \
  --allow-principal "User:consumer-user" \
  --operation Read \
  --group "master-aggregator"

echo "[Consumers] ACLs configured"

# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------

echo ""
echo "=== ACL Configuration Complete ==="
echo "Listing all ACLs:"
${KAFKA_BIN}/kafka-acls --list --bootstrap-server "${BOOTSTRAP}"
