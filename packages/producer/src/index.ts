/**
 * =============================================================================
 * SRS Master — SCADA Level-2 Producer Entry Point (Outbox Pattern)
 * =============================================================================
 *
 * This is the main entry point for a single SCADA remote node.
 *
 * Architecture (Outbox Pattern):
 *
 *   ┌───────────────────────────────────────────────────┐
 *   │  Generator Loop (1 second cycle)                  │
 *   │    → Generate telemetry, events, alarms           │
 *   │    → Write to local PostgreSQL outbox (atomic TX) │
 *   └──────────────────────┬────────────────────────────┘
 *                          │
 *   ┌──────────────────────▼────────────────────────────┐
 *   │  Outbox Dispatcher (500ms poll cycle)             │
 *   │    → SELECT PENDING events (SKIP LOCKED)          │
 *   │    → Lock → Publish to Kafka → Mark SENT          │
 *   │    → On failure: retry with backoff               │
 *   │    → Crash recovery for stale locks               │
 *   └──────────────────────────────────────────────────┘
 *
 * Why Outbox?
 *   Without outbox: If Kafka is down, events are LOST.
 *   With outbox: Events are persisted locally FIRST, then dispatched.
 *   The node can operate offline — events queue up and flush when Kafka returns.
 *
 * Environment:
 *   NODE_ID          — Unique integer identifying this remote node
 *   PLANT_ID         — ISA-95 plant code (e.g., PLANT01)
 *   AREA_ID          — ISA-95 area code (e.g., AREA01)
 *   PRODUCER_DATABASE_URL — Local PostgreSQL connection string
 * =============================================================================
 */

import { createKafkaClient } from './kafka/client.js';
import { ScadaProducer } from './kafka/producer.js';
import { generateTelemetry } from './generators/telemetry.js';
import { generateEvents } from './generators/events.js';
import { generateAlarms } from './generators/alarms.js';
import { OutboxService } from './outbox/service.js';
import { OutboxDispatcher } from './outbox/dispatcher.js';
import { OutboxPruner } from './outbox/pruner.js';
import { testConnection, disconnectPrisma } from './db/prisma.js';
import pino from 'pino';

const logger = pino({
    name: 'scada-node',
    level: process.env.LOG_LEVEL ?? 'info',
});

// ---------------------------------------------------------------------------
// Node Identity (from environment — set per Docker container)
// ---------------------------------------------------------------------------

const NODE_ID = parseInt(process.env.NODE_ID ?? '1', 10);
const PLANT_ID = process.env.PLANT_ID ?? 'PLANT01';
const AREA_ID = process.env.AREA_ID ?? 'AREA01';
const UNIT_NAME = `UNIT_${String(NODE_ID).padStart(2, '0')}`;
const INTERVAL_MS = parseInt(process.env.PRODUCER_INTERVAL_MS ?? '1000', 10);
const METRICS_LOG_INTERVAL = parseInt(process.env.METRICS_LOG_INTERVAL ?? '60', 10);

let running = true;

async function main(): Promise<void> {
    logger.info(
        { nodeId: NODE_ID, plant: PLANT_ID, area: AREA_ID, unit: UNIT_NAME },
        '=== SCADA Level-2 Node Starting (Outbox Pattern) ===',
    );

    // -----------------------------------------------------------------------
    // Step 1: Verify local database connectivity (fail fast)
    // -----------------------------------------------------------------------
    logger.info('Testing local PostgreSQL connection...');
    await testConnection();

    // -----------------------------------------------------------------------
    // Step 2: Initialize Kafka producer
    // -----------------------------------------------------------------------
    const kafka = createKafkaClient();
    const producer = new ScadaProducer(kafka);
    await producer.connect();

    // -----------------------------------------------------------------------
    // Step 3: Initialize Outbox components
    // -----------------------------------------------------------------------
    const outboxService = new OutboxService();
    const dispatcher = new OutboxDispatcher(producer);
    await dispatcher.start();
    logger.info('Outbox dispatcher started');

    const pruner = new OutboxPruner();
    await pruner.start();
    logger.info('Outbox pruner started');

    // -----------------------------------------------------------------------
    // Step 4: Graceful shutdown handlers
    // -----------------------------------------------------------------------
    const shutdown = async (signal: string): Promise<void> => {
        logger.info({ signal }, 'Shutdown signal received');
        running = false;

        // Stop pruner
        await pruner.stop();
        logger.info('Outbox pruner stopped');

        // Stop reading new events
        await dispatcher.stop();
        logger.info('Outbox dispatcher stopped');

        // Disconnect Kafka
        await producer.disconnect();
        logger.info('Producer disconnected');

        // Disconnect local database
        await disconnectPrisma();
        logger.info('Local database disconnected');

        logger.info('=== SCADA Node shutdown complete ===');
        process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    // -----------------------------------------------------------------------
    // Step 5: Main event generation loop
    //
    // Events are written to the OUTBOX — not directly to Kafka.
    // The dispatcher handles Kafka publishing independently.
    // -----------------------------------------------------------------------
    logger.info({ intervalMs: INTERVAL_MS }, 'Entering main event generation loop');

    let cycleCount = 0;
    while (running) {
        try {
            cycleCount++;

            // Generate all event types
            const telemetry = generateTelemetry(NODE_ID, PLANT_ID, AREA_ID, UNIT_NAME);
            const events = generateEvents(NODE_ID, PLANT_ID, AREA_ID, UNIT_NAME);
            const alarms = generateAlarms(NODE_ID, PLANT_ID, AREA_ID, UNIT_NAME);

            // Write ALL events to the outbox (atomic batch insert)
            const allEvents = [...telemetry, ...events, ...alarms];

            if (allEvents.length > 0) {
                await outboxService.writeBatch(allEvents);
            }

            // Periodic status log with outbox metrics
            if (cycleCount % METRICS_LOG_INTERVAL === 0) {
                const metrics = await dispatcher.getMetrics();
                logger.info(
                    {
                        cycle: cycleCount,
                        telemetryCount: telemetry.length,
                        eventCount: events.length,
                        alarmCount: alarms.length,
                        outbox: {
                            pending: metrics.pendingCount,
                            inProgress: metrics.inProgressCount,
                            failed: metrics.failedCount,
                            sent: metrics.sentCount,
                            oldestPendingAgeMs: metrics.oldestPendingAgeMs,
                        },
                    },
                    'Publishing status',
                );

                // Alert if pending events are accumulating
                if (metrics.pendingCount > 100) {
                    logger.warn(
                        { pendingCount: metrics.pendingCount },
                        'High pending event count — Kafka may be unreachable',
                    );
                }
                if (metrics.failedCount > 0) {
                    logger.error(
                        { failedCount: metrics.failedCount },
                        'POISON MESSAGES detected — manual intervention required',
                    );
                }
            }
        } catch (error) {
            // Log but don't crash — local DB writes are fast and reliable
            // In a 24/7 industrial system, transient errors must not kill the process
            logger.error({ error }, 'Error in event generation cycle — will retry next cycle');
        }

        // Wait for next cycle
        await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    }
}

main().catch((error) => {
    logger.fatal({ error }, 'Fatal error — producer process exiting');
    process.exit(1);
});
