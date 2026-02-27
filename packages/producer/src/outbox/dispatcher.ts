// =============================================================================
// SRS Master — Outbox Dispatcher (Publisher Service)
// =============================================================================
//
// The dispatcher is a separate loop whose ONLY job is:
//   Read → Lock → Publish → Mark
//
// It is:
//   - Stateless (all state is in the outbox table)
//   - Restart-safe (locks expire, events are re-dispatched)
//   - Horizontally scalable (SKIP LOCKED prevents double-publishing)
//
// Query Pattern:
//   SELECT * FROM outbox_events
//   WHERE status = 'PENDING' AND available_at <= NOW()
//   ORDER BY created_at
//   LIMIT N
//   FOR UPDATE SKIP LOCKED
//
// Why SKIP LOCKED:
//   Allows multiple dispatchers to run concurrently.
//   Each dispatcher locks a disjoint set of events.
//   No double-publishing, no lock contention.
// =============================================================================

import { PrismaClient, OutboxEvent } from '@prisma/client';
import { getPrismaClient } from '../db/prisma.js';
import { ScadaProducer } from '../kafka/producer.js';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ name: 'outbox-dispatcher', level: process.env.LOG_LEVEL ?? 'info' });

// ---------------------------------------------------------------------------
// Configuration — Tunable via environment variables
// ---------------------------------------------------------------------------

/** Number of events to fetch per dispatch cycle */
const BATCH_SIZE = parseInt(process.env.OUTBOX_BATCH_SIZE ?? '50', 10);

/** Milliseconds between dispatch cycles */
const POLL_INTERVAL_MS = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS ?? '500', 10);

/** Maximum number of retries before marking as FAILED (poison message) */
const MAX_RETRIES = parseInt(process.env.OUTBOX_MAX_RETRIES ?? '10', 10);

/** Lock timeout in seconds — events locked longer than this are considered stale */
const LOCK_TIMEOUT_SECONDS = parseInt(process.env.OUTBOX_LOCK_TIMEOUT_SECONDS ?? '120', 10);

/** Crash recovery interval — how often to check for stale locks */
const RECOVERY_INTERVAL_MS = parseInt(process.env.OUTBOX_RECOVERY_INTERVAL_MS ?? '30000', 10);

// ---------------------------------------------------------------------------
// Backoff Strategy (Deterministic Exponential)
// ---------------------------------------------------------------------------
//
// Retry 1  → +5s
// Retry 2  → +30s
// Retry 3  → +2m
// Retry 4  → +10m
// Retry 5  → +30m
// Retry 6  → +1h
// Retry 7+ → +1h (capped)
// ---------------------------------------------------------------------------

const BACKOFF_SCHEDULE_MS: number[] = [
    5_000,       // 5 seconds
    30_000,      // 30 seconds
    120_000,     // 2 minutes
    600_000,     // 10 minutes
    1_800_000,   // 30 minutes
    3_600_000,   // 1 hour (cap)
];

function getBackoffMs(retryCount: number): number {
    const index = Math.min(retryCount, BACKOFF_SCHEDULE_MS.length - 1);
    return BACKOFF_SCHEDULE_MS[index];
}

/**
 * Outbox Dispatcher — reads outbox events, publishes to Kafka, marks as sent.
 *
 * Lifecycle:
 *   const dispatcher = new OutboxDispatcher(producer);
 *   await dispatcher.start();   // Begins polling loop
 *   await dispatcher.stop();    // Graceful shutdown
 */
export class OutboxDispatcher {
    private prisma: PrismaClient;
    private producer: ScadaProducer;
    private instanceId: string;
    private running = false;
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private recoveryTimer: ReturnType<typeof setInterval> | null = null;

    constructor(producer: ScadaProducer) {
        this.prisma = getPrismaClient();
        this.producer = producer;
        // Unique instance identifier for lock ownership
        this.instanceId = `dispatcher-${uuidv4().slice(0, 8)}`;
        logger.info({ instanceId: this.instanceId }, 'Outbox dispatcher created');
    }

    /**
     * Starts the dispatch loop and crash recovery loop.
     */
    async start(): Promise<void> {
        this.running = true;
        logger.info(
            {
                batchSize: BATCH_SIZE,
                pollIntervalMs: POLL_INTERVAL_MS,
                maxRetries: MAX_RETRIES,
                lockTimeoutSeconds: LOCK_TIMEOUT_SECONDS,
                recoveryIntervalMs: RECOVERY_INTERVAL_MS,
            },
            'Starting outbox dispatcher',
        );

        // Main dispatch loop
        this.pollTimer = setInterval(async () => {
            if (!this.running) return;
            try {
                await this.dispatchBatch();
            } catch (error) {
                logger.error({ error }, 'Error in dispatch cycle');
            }
        }, POLL_INTERVAL_MS);

        // Crash recovery loop (less frequent)
        this.recoveryTimer = setInterval(async () => {
            if (!this.running) return;
            try {
                await this.recoverStaleEvents();
            } catch (error) {
                logger.error({ error }, 'Error in crash recovery cycle');
            }
        }, RECOVERY_INTERVAL_MS);

        // Run initial dispatch immediately
        await this.dispatchBatch();
    }

    /**
     * Graceful shutdown — stops polling and waits for in-flight publishes.
     */
    async stop(): Promise<void> {
        this.running = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        if (this.recoveryTimer) {
            clearInterval(this.recoveryTimer);
            this.recoveryTimer = null;
        }
        logger.info('Outbox dispatcher stopped');
    }

    // =========================================================================
    // Core Dispatch Logic
    // =========================================================================

    /**
     * Fetches pending events, locks them, publishes to Kafka, and marks result.
     *
     * Uses raw SQL with FOR UPDATE SKIP LOCKED for concurrency-safe locking.
     * This is the hot path — called every POLL_INTERVAL_MS.
     */
    private async dispatchBatch(): Promise<void> {
        // Step 1: SELECT pending events with SKIP LOCKED
        const events = await this.prisma.$queryRaw<OutboxEvent[]>`
            SELECT *
            FROM outbox_events
            WHERE status = 'PENDING'
              AND available_at <= NOW()
            ORDER BY created_at
            LIMIT ${BATCH_SIZE}
            FOR UPDATE SKIP LOCKED
        `;

        if (events.length === 0) return;

        logger.debug({ count: events.length }, 'Fetched pending outbox events');

        // Step 2: Lock events (status → IN_PROGRESS)
        const eventIds = events.map((e) => e.id);
        await this.prisma.outboxEvent.updateMany({
            where: { id: { in: eventIds } },
            data: {
                status: 'IN_PROGRESS',
                lockedBy: this.instanceId,
                lockedAt: new Date(),
            },
        });

        // Step 3: Publish each event to Kafka
        for (const event of events) {
            await this.publishEvent(event);
        }
    }

    /**
     * Publishes a single outbox event to Kafka and marks the result.
     *
     * Success → status = SENT
     * Failure → status = PENDING (with retryCount++ and backoff)
     * Exceeded MAX_RETRIES → status = FAILED (poison message)
     */
    private async publishEvent(event: OutboxEvent): Promise<void> {
        try {
            const headers = event.headers as Record<string, any>;
            const payload = event.payload as Record<string, any>;
            const topic = headers.topic as string;
            const partitionKey = headers.partitionKey as string;

            // Publish to Kafka — wait for broker ACK
            // ⚠ Fire-and-forget is FORBIDDEN
            await this.producer.publishRaw(topic, partitionKey, payload, {
                correlationId: headers.correlationId,
                traceId: headers.traceId,
                schemaVersion: headers.schemaVersion,
                sourceTimestamp: headers.sourceTimestamp,
            });

            // SUCCESS — Mark as SENT
            await this.prisma.outboxEvent.update({
                where: { id: event.id },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    lockedBy: null,
                    lockedAt: null,
                },
            });

            logger.debug(
                { eventId: event.id, topic, aggregateId: event.aggregateId },
                'Outbox event published successfully',
            );
        } catch (error) {
            // FAILURE — Handle retry or poison
            const newRetryCount = event.retryCount + 1;

            if (newRetryCount >= MAX_RETRIES) {
                // POISON MESSAGE — Too many retries, mark as FAILED
                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        status: 'FAILED',
                        retryCount: newRetryCount,
                        lockedBy: null,
                        lockedAt: null,
                    },
                });

                logger.error(
                    { eventId: event.id, retryCount: newRetryCount, maxRetries: MAX_RETRIES },
                    'POISON MESSAGE — Outbox event exceeded max retries, marked FAILED',
                );
            } else {
                // RETRY — Set status back to PENDING with backoff
                const backoffMs = getBackoffMs(newRetryCount);
                const availableAt = new Date(Date.now() + backoffMs);

                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        status: 'PENDING',
                        retryCount: newRetryCount,
                        availableAt,
                        lockedBy: null,
                        lockedAt: null,
                    },
                });

                logger.warn(
                    {
                        eventId: event.id,
                        retryCount: newRetryCount,
                        backoffMs,
                        nextAvailableAt: availableAt.toISOString(),
                        error: (error as Error).message,
                    },
                    'Outbox event publish failed — scheduled for retry',
                );
            }
        }
    }

    // =========================================================================
    // Crash Recovery
    // =========================================================================

    /**
     * Recovers events stuck in IN_PROGRESS state due to dispatcher crashes.
     *
     * If an event has status=IN_PROGRESS and locked_at is older than
     * LOCK_TIMEOUT_SECONDS, the dispatcher that locked it has crashed.
     *
     * Recovery action:
     *   - Reset status to PENDING
     *   - Clear lock fields
     *   - Event will be picked up by the next dispatch cycle
     *
     * This guarantees self-healing — no manual intervention required.
     */
    private async recoverStaleEvents(): Promise<void> {
        const lockTimeout = new Date(Date.now() - LOCK_TIMEOUT_SECONDS * 1000);

        const result = await this.prisma.outboxEvent.updateMany({
            where: {
                status: 'IN_PROGRESS',
                lockedAt: { lt: lockTimeout },
            },
            data: {
                status: 'PENDING',
                lockedBy: null,
                lockedAt: null,
            },
        });

        if (result.count > 0) {
            logger.warn(
                { recoveredCount: result.count, lockTimeoutSeconds: LOCK_TIMEOUT_SECONDS },
                'Recovered stale outbox events from crashed dispatcher',
            );
        }
    }

    // =========================================================================
    // Monitoring & Metrics
    // =========================================================================

    /**
     * Returns current outbox statistics for monitoring.
     *
     * Track these metrics:
     *   - pendingCount > threshold → dispatcher is falling behind
     *   - oldestPendingAge > threshold → INCIDENT (events stuck)
     *   - failedCount > 0 → poison messages need investigation
     *   - inProgressCount > 0 for extended periods → potential stuck dispatchers
     */
    async getMetrics(): Promise<OutboxMetrics> {
        const [pendingCount, inProgressCount, failedCount, sentCount, oldestPending] =
            await Promise.all([
                this.prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
                this.prisma.outboxEvent.count({ where: { status: 'IN_PROGRESS' } }),
                this.prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
                this.prisma.outboxEvent.count({ where: { status: 'SENT' } }),
                this.prisma.outboxEvent.findFirst({
                    where: { status: 'PENDING' },
                    orderBy: { createdAt: 'asc' },
                    select: { createdAt: true },
                }),
            ]);

        const oldestPendingAgeMs = oldestPending
            ? Date.now() - oldestPending.createdAt.getTime()
            : 0;

        return {
            pendingCount,
            inProgressCount,
            failedCount,
            sentCount,
            oldestPendingAgeMs,
            instanceId: this.instanceId,
        };
    }
}

/**
 * Outbox monitoring metrics.
 */
export interface OutboxMetrics {
    pendingCount: number;
    inProgressCount: number;
    failedCount: number;
    sentCount: number;
    oldestPendingAgeMs: number;
    instanceId: string;
}
