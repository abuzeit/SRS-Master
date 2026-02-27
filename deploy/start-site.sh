#!/usr/bin/env bash
# =============================================================================
# SRS Master — Start Remote Site
# =============================================================================
#
# Starts a remote site's producer and outbox database.
#
# Prerequisites:
#   1. Copy .env.site.example to .env
#   2. Set NODE_ID, PLANT_ID, AREA_ID
#   3. Set KAFKA_BROKERS to Master Station IP(s)
#   4. Docker and Docker Compose installed
#
# Usage:
#   ./deploy/start-site.sh              # Start in background
#   ./deploy/start-site.sh logs         # Start and follow logs
#   ./deploy/start-site.sh down         # Stop site
#   ./deploy/start-site.sh status       # Show service status
#
# Quick setup for a new site:
#   ./deploy/start-site.sh setup 42 PLANT03 AREA01 192.168.1.100
#   ./deploy/start-site.sh up
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.site.yml"

cd "$PROJECT_DIR"

ACTION="${1:-up}"

case "$ACTION" in
    setup)
        # Quick setup: ./deploy/start-site.sh setup <NODE_ID> <PLANT_ID> <AREA_ID> <MASTER_IP>
        NODE_ID="${2:?Usage: $0 setup <NODE_ID> <PLANT_ID> <AREA_ID> <MASTER_IP>}"
        PLANT_ID="${3:?Missing PLANT_ID}"
        AREA_ID="${4:?Missing AREA_ID}"
        MASTER_IP="${5:?Missing MASTER_IP}"

        echo "📝 Creating .env for Site ${NODE_ID} (${PLANT_ID}/${AREA_ID})..."

        cat > "$PROJECT_DIR/.env" <<EOF
# SRS Master — Remote Site ${NODE_ID}
NODE_ID=${NODE_ID}
PLANT_ID=${PLANT_ID}
AREA_ID=${AREA_ID}
KAFKA_BROKERS=${MASTER_IP}:9092,${MASTER_IP}:9094,${MASTER_IP}:9095
PRODUCER_DB_PASSWORD=producer-db-secret
OUTBOX_PG_PORT=5433
PRODUCER_INTERVAL_MS=1000
OUTBOX_BATCH_SIZE=50
OUTBOX_POLL_INTERVAL_MS=500
OUTBOX_MAX_RETRIES=10
OUTBOX_LOCK_TIMEOUT_SECONDS=120
OUTBOX_RECOVERY_INTERVAL_MS=30000
LOG_LEVEL=info
EOF

        echo "✅ .env created. Start with: ./deploy/start-site.sh up"
        ;;
    up)
        if [ ! -f ".env" ]; then
            echo "❌ No .env file found."
            echo "   Option 1: cp .env.site.example .env && edit .env"
            echo "   Option 2: ./deploy/start-site.sh setup <NODE_ID> <PLANT_ID> <AREA_ID> <MASTER_IP>"
            exit 1
        fi

        NODE_ID=$(grep '^NODE_ID=' .env | cut -d= -f2)
        echo "🚀 Starting Remote Site ${NODE_ID}..."
        docker compose -f "$COMPOSE_FILE" up -d --build
        echo ""
        echo "✅ Site ${NODE_ID} is running."
        echo "   Producer:    srs-site-${NODE_ID}-producer"
        echo "   Outbox DB:   srs-site-${NODE_ID}-outbox-pg (port $(grep '^OUTBOX_PG_PORT=' .env | cut -d= -f2 || echo 5433))"
        echo ""
        echo "   View logs:   ./deploy/start-site.sh logs"
        echo "   Stop:        ./deploy/start-site.sh down"
        ;;
    logs)
        docker compose -f "$COMPOSE_FILE" up -d --build
        docker compose -f "$COMPOSE_FILE" logs -f
        ;;
    down)
        NODE_ID=$(grep '^NODE_ID=' .env 2>/dev/null | cut -d= -f2 || echo "?")
        echo "🛑 Stopping Remote Site ${NODE_ID}..."
        docker compose -f "$COMPOSE_FILE" down
        echo "✅ Site ${NODE_ID} stopped."
        ;;
    status)
        docker compose -f "$COMPOSE_FILE" ps
        ;;
    *)
        echo "Usage: $0 {setup|up|logs|down|status}"
        echo ""
        echo "Commands:"
        echo "  setup <NODE_ID> <PLANT_ID> <AREA_ID> <MASTER_IP>  — Generate .env"
        echo "  up                                                  — Start site"
        echo "  logs                                                — Start + follow logs"
        echo "  down                                                — Stop site"
        echo "  status                                              — Show status"
        exit 1
        ;;
esac
