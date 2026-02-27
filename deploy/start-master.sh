#!/usr/bin/env bash
# =============================================================================
# SRS Master — Start Master Station
# =============================================================================
#
# Starts the Master Station stack (Kafka, Consumer, Historian).
#
# Prerequisites:
#   1. Copy .env.master to .env and set MASTER_HOST_IP
#   2. Docker and Docker Compose installed
#
# Usage:
#   ./deploy/start-master.sh          # Start in background
#   ./deploy/start-master.sh logs     # Start and follow logs
#   ./deploy/start-master.sh down     # Stop all services
#   ./deploy/start-master.sh status   # Show service status
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.master.yml"

cd "$PROJECT_DIR"

# Check for .env file
if [ ! -f ".env" ] && [ -f ".env.master" ]; then
    echo "⚠  No .env file found. Copying .env.master → .env"
    echo "   ➤ Edit .env and set MASTER_HOST_IP before starting!"
    cp .env.master .env
    exit 1
fi

ACTION="${1:-up}"

case "$ACTION" in
    up)
        echo "🚀 Starting Master Station..."
        docker compose -f "$COMPOSE_FILE" up -d --build
        echo ""
        echo "✅ Master Station is running."
        echo "   Kafka:      localhost:9092, :9094, :9095"
        echo "   Historian:   localhost:5432"
        echo ""
        echo "   View logs:   ./deploy/start-master.sh logs"
        echo "   Stop:        ./deploy/start-master.sh down"
        ;;
    logs)
        echo "📋 Following Master Station logs (Ctrl+C to stop)..."
        docker compose -f "$COMPOSE_FILE" up -d --build
        docker compose -f "$COMPOSE_FILE" logs -f
        ;;
    down)
        echo "🛑 Stopping Master Station..."
        docker compose -f "$COMPOSE_FILE" down
        echo "✅ Master Station stopped."
        ;;
    status)
        docker compose -f "$COMPOSE_FILE" ps
        ;;
    *)
        echo "Usage: $0 {up|logs|down|status}"
        exit 1
        ;;
esac
