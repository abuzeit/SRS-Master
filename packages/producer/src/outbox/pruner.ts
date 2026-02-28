// =============================================================================
// SRS Master — Outbox Pruner (Maintenance Service)
// =============================================================================
//
// The pruner is a background task that periodically cleans up:
//   1. SENT events from the outbox table
//   2. Old telemetry from the local cache
//
// This prevents the local SQLite/PostgreSQL database from growing indefinitely
// on the remote SCADA nodes.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../db/prisma.js';
import pino from 'pino';

const logger = pino({ name: 'outbox-pruner', level: process.env.LOG_LEVEL ?? 'info' });

/** Retention period in days for SENT events and local telemetry */
const RETENTION_DAYS = parseInt(process.env.STORAGE_RETENTION_DAYS ?? '30', 10);

/** How often to run the pruning task (milliseconds) */
const PRUNE_INTERVAL_MS = parseInt(process.env.PRUNE_INTERVAL_MS ?? '3600000', 10); // Default: 1 hour

export class OutboxPruner {
    private prisma: PrismaClient;
    private running = false;
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.prisma = getPrismaClient();
    }

    /**
     * Starts the background pruning loop.
     */
    async start(): Promise<void> {
        this.running = true;
        logger.info(
            { retentionDays: RETENTION_DAYS, intervalMs: PRUNE_INTERVAL_MS },
            'Starting outbox pruner service'
        );

        this.timer = setInterval(async () => {
            if (!this.running) return;
            try {
                await this.prune();
            } catch (error) {
                logger.error({ error }, 'Error during scheduled pruning');
            }
        }, PRUNE_INTERVAL_MS);

        // Run an initial prune on startup (delayed slightly to avoid contention with startup tasks)
        setTimeout(() => {
            if (this.running) {
                this.prune().catch(err => logger.error({ err }, 'Initial pruning failed'));
            }
        }, 5000);
    }

    /**
     * Stops the pruning service.
     */
    async stop(): Promise<void> {
        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        logger.info('Outbox pruner service stopped');
    }

    /**
     * Performs the actual deletion of old records.
     */
    async prune(): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        logger.info({ cutoffDate: cutoffDate.toISOString() }, 'Running maintenance: Pruning old records...');

        try {
            // 1. Prune SENT outbox events
            const prunedEvents = await this.prisma.outboxEvent.deleteMany({
                where: {
                    status: 'SENT',
                    sentAt: { lt: cutoffDate }
                }
            });

            // 2. Prune old local telemetry cache
            const prunedTelemetry = await this.prisma.localTelemetry.deleteMany({
                where: {
                    timestamp: { lt: cutoffDate }
                }
            });

            if (prunedEvents.count > 0 || prunedTelemetry.count > 0) {
                logger.info(
                    {
                        prunedEvents: prunedEvents.count,
                        prunedTelemetry: prunedTelemetry.count
                    },
                    'Pruning complete: Records removed'
                );
            } else {
                logger.debug('Pruning complete: No records to remove');
            }
        } catch (error) {
            logger.error({ error }, 'Failed to prune outbox/telemetry records');
            throw error;
        }
    }
}
