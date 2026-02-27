/**
 * =============================================================================
 * SRS Master — SCADA Historian Repository (Prisma v6)
 * =============================================================================
 *
 * Handles idempotent persistence of SCADA events to PostgreSQL via Prisma v6.
 *
 * Key Pattern: createMany({ skipDuplicates: true })
 *
 *   This translates to:
 *     INSERT INTO telemetry (...) VALUES (...), (...), (...)
 *     ON CONFLICT (event_id) DO NOTHING
 *
 *   Why this matters in industrial systems:
 *     - Kafka guarantees "at-least-once" delivery
 *     - Consumer rebalances and restarts will replay messages
 *     - The event_id primary key catches exact duplicates
 *     - skipDuplicates silently discards them (no error, no upsert)
 *     - This is the correct choice for append-only historian data
 *       (telemetry values should NEVER be overwritten)
 *
 * Batch Processing:
 *   Messages are buffered and inserted in batches for throughput.
 *   At 300 events/second across 100 nodes, individual inserts
 *   would saturate the database connection pool. Batch inserts
 *   reduce round trips by 10-50x.
 * =============================================================================
 */

import type { PrismaClient } from '@prisma/client';
import type { ValidatedEnvelope } from '@srs/shared';
import pino from 'pino';

const logger = pino({ name: 'historian-repository' });

export class HistorianRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Persist a batch of validated telemetry events.
     *
     * Uses Prisma's createMany with skipDuplicates for idempotent inserts.
     * Returns the count of newly inserted records (excludes duplicates).
     */
    async insertTelemetry(events: ValidatedEnvelope[]): Promise<number> {
        const telemetryEvents = events.filter((e) => e.category === 'telemetry');
        if (telemetryEvents.length === 0) return 0;

        const result = await this.prisma.telemetry.createMany({
            data: telemetryEvents.map((e) => ({
                eventId: e.eventId,
                timestamp: new Date(e.timestamp),
                plant: e.asset.plant,
                area: e.asset.area,
                unitName: e.asset.unit,
                tag: e.tag,
                value: e.value,
                unitOfMeasure: e.unit,
                quality: e.quality,
                nodeId: e.nodeId,
            })),
            skipDuplicates: true, // ON CONFLICT (event_id) DO NOTHING
        });

        if (result.count > 0) {
            logger.debug(
                { inserted: result.count, total: telemetryEvents.length },
                'Telemetry batch inserted',
            );
        }

        return result.count;
    }

    /**
     * Persist a batch of validated operational events.
     */
    async insertEvents(events: ValidatedEnvelope[]): Promise<number> {
        const operationalEvents = events.filter((e) => e.category === 'event');
        if (operationalEvents.length === 0) return 0;

        const result = await this.prisma.event.createMany({
            data: operationalEvents.map((e) => ({
                eventId: e.eventId,
                timestamp: new Date(e.timestamp),
                plant: e.asset.plant,
                area: e.asset.area,
                unitName: e.asset.unit,
                tag: e.tag,
                value: e.value,
                unitOfMeasure: e.unit,
                quality: e.quality,
                nodeId: e.nodeId,
            })),
            skipDuplicates: true,
        });

        if (result.count > 0) {
            logger.debug(
                { inserted: result.count, total: operationalEvents.length },
                'Event batch inserted',
            );
        }

        return result.count;
    }

    /**
     * Persist a batch of validated alarm events.
     */
    async insertAlarms(events: ValidatedEnvelope[]): Promise<number> {
        const alarmEvents = events.filter((e) => e.category === 'alarm');
        if (alarmEvents.length === 0) return 0;

        const result = await this.prisma.alarm.createMany({
            data: alarmEvents.map((e) => ({
                eventId: e.eventId,
                timestamp: new Date(e.timestamp),
                plant: e.asset.plant,
                area: e.asset.area,
                unitName: e.asset.unit,
                tag: e.tag,
                value: e.value,
                unitOfMeasure: e.unit,
                quality: e.quality,
                nodeId: e.nodeId,
                severity: 'severity' in e ? String(e.severity) : 'MEDIUM',
            })),
            skipDuplicates: true,
        });

        if (result.count > 0) {
            logger.debug(
                { inserted: result.count, total: alarmEvents.length },
                'Alarm batch inserted',
            );
        }

        return result.count;
    }

    /**
     * Persist ALL event types from a mixed batch.
     * Routes each event to the correct table based on category.
     *
     * @returns Total number of newly inserted records across all tables
     */
    async insertAll(events: ValidatedEnvelope[]): Promise<number> {
        const [telemetryCount, eventCount, alarmCount] = await Promise.all([
            this.insertTelemetry(events),
            this.insertEvents(events),
            this.insertAlarms(events),
        ]);

        const total = telemetryCount + eventCount + alarmCount;

        if (total > 0) {
            logger.info(
                { telemetry: telemetryCount, events: eventCount, alarms: alarmCount, total },
                'Batch persisted to historian',
            );
        }

        return total;
    }
}
