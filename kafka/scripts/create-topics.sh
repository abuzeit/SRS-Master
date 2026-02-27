#!/bin/bash
# =============================================================================
# SRS Master — Kafka Topic Creation Script
# =============================================================================
#
# Creates ISA-95 aligned Kafka topics with correct partition counts and
# retention policies.
#
# Topic Naming Convention:
#   <domain>.<isa-level>.<category>.<type>
#
# Must be run AFTER the Kafka cluster is fully initialized.
#
# Usage:
#   ./create-topics.sh [bootstrap-server]
#   Default bootstrap server: kafka-1:9092
# =============================================================================

set -euo pipefail

BOOTSTRAP=${1:-kafka-1:9092}
KAFKA_BIN=${KAFKA_BIN:-/usr/bin}

echo "=== Creating ISA-95 Aligned Kafka Topics ==="
echo "Bootstrap server: ${BOOTSTRAP}"
echo ""

# ---------------------------------------------------------------------------
# Telemetry Topics — 7-day retention, 200 partitions each
# High partition count supports 100 remote nodes with parallel writes
# ---------------------------------------------------------------------------

echo "[1/5] Creating scada.l2.telemetry.flow..."
${KAFKA_BIN}/kafka-topics --create \
  --bootstrap-server "${BOOTSTRAP}" \
  --topic scada.l2.telemetry.flow \
  --partitions 200 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config cleanup.policy=delete \
  --config min.insync.replicas=2 \
  --config segment.ms=3600000 \
  --if-not-exists

echo "[2/5] Creating scada.l2.telemetry.pressure..."
${KAFKA_BIN}/kafka-topics --create \
  --bootstrap-server "${BOOTSTRAP}" \
  --topic scada.l2.telemetry.pressure \
  --partitions 200 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config cleanup.policy=delete \
  --config min.insync.replicas=2 \
  --config segment.ms=3600000 \
  --if-not-exists

echo "[3/5] Creating scada.l2.telemetry.temperature..."
${KAFKA_BIN}/kafka-topics --create \
  --bootstrap-server "${BOOTSTRAP}" \
  --topic scada.l2.telemetry.temperature \
  --partitions 200 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config cleanup.policy=delete \
  --config min.insync.replicas=2 \
  --config segment.ms=3600000 \
  --if-not-exists

# ---------------------------------------------------------------------------
# Events Topic — 30-day retention
# Operational events: start/stop, mode changes, setpoint adjustments
# ---------------------------------------------------------------------------

echo "[4/5] Creating scada.l2.events..."
${KAFKA_BIN}/kafka-topics --create \
  --bootstrap-server "${BOOTSTRAP}" \
  --topic scada.l2.events \
  --partitions 200 \
  --replication-factor 3 \
  --config retention.ms=2592000000 \
  --config cleanup.policy=delete \
  --config min.insync.replicas=2 \
  --config segment.ms=3600000 \
  --if-not-exists

# ---------------------------------------------------------------------------
# Alarms Topic — 90-day retention (regulatory compliance)
# Critical for incident investigation and ISA-18.2 alarm management
# ---------------------------------------------------------------------------

echo "[5/5] Creating scada.l2.alarms..."
${KAFKA_BIN}/kafka-topics --create \
  --bootstrap-server "${BOOTSTRAP}" \
  --topic scada.l2.alarms \
  --partitions 200 \
  --replication-factor 3 \
  --config retention.ms=7776000000 \
  --config cleanup.policy=delete \
  --config min.insync.replicas=2 \
  --config segment.ms=3600000 \
  --if-not-exists

echo ""
echo "=== Topic Creation Complete ==="
echo "Listing all topics:"
${KAFKA_BIN}/kafka-topics --list --bootstrap-server "${BOOTSTRAP}"
