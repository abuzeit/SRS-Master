// =============================================================================
// SRS Master — Outbox Service (Atomic Event Writer)
// =============================================================================
//
// This service is the ONLY allowed way to create outgoing events.
//
// Non-Negotiable Rule:
//   Business state changes and outbox inserts MUST be in the SAME transaction.
//   No event is ever sent directly to the Kafka broker from business logic.
//
// Flow:
//   1. Business logic calls outboxService.writeEvent(envelope)
//   2. Inside a single Prisma transaction:
//      a. (Optional) Write local telemetry cache
//      b. Insert into outbox_events with status=PENDING
//   3. A separate dispatcher process handles publishing to Kafka
//
// Failure Guarantees:
//   - Crash before commit → No DB change, no event (safe)
//   - Crash after commit → Event safely stored in outbox (dispatcher picks it up)
//   - Network down → Event waits in outbox (dispatcher retries)
//   - Broker unavailable → Event retries with backoff
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { ScadaEventEnvelope, EventCategory } from '@srs/shared';
import { buildMessageKey, resolveTopicName } from '@srs/shared';
import { getPrismaClient } from '../db/prisma.js';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ name: 'outbox-service', level: process.env.LOG_LEVEL ?? 'info' });

/**
 * Outbox event headers — metadata attached to every outgoing message.
 * These headers travel with the event through Kafka and into the consumer.
 */
interface OutboxHeaders {
    correlationId: string;
    causationId: string;
    traceId: string;
    schemaVersion: string;
    nodeId: number;
    topic: string;
    partitionKey: string;
    contentType: string;
    sourceTimestamp: string;
}

/**
 * Outbox Service — Atomic event writer for the transactional outbox pattern.
 *
 * Usage:
 *   const outbox = new OutboxService();
 *   await outbox.writeEvent(envelope);         // Single event
 *   await outbox.writeBatch(envelopes);         // Batch of events
 *   await outbox.writeEventWithLocalCache(envelope);  // Event + local telemetry
 */
export class OutboxService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    /**
     * Writes a single SCADA event to the outbox.
     *
     * This is the simplest path — just insert the event into the outbox
     * with status=PENDING. The dispatcher will pick it up.
     */
    async writeEvent(envelope: ScadaEventEnvelope): Promise<string> {
        const eventId = envelope.eventId;
        const aggregateId = buildMessageKey(
            envelope.asset.plant,
            envelope.asset.area,
            envelope.asset.unit,
            envelope.tag,
        );
        const topic = resolveTopicName(envelope.category, envelope.tag);
        const headers = this.buildHeaders(envelope, aggregateId, topic);

        await this.prisma.outboxEvent.create({
            data: {
                id: eventId,
                aggregateType: envelope.category,
                aggregateId,
                eventType: envelope.tag,
                payload: envelope as any,
                headers: headers as any,
                status: 'PENDING',
                retryCount: 0,
                availableAt: new Date(),
            },
        });

        return eventId;
    }

    /**
     * Writes a batch of SCADA events to the outbox in a single transaction.
     *
     * This is the high-performance path for the 1-second publishing cycle.
     * All events in the batch are written atomically — either all succeed
     * or none do.
     *
     * Performance note: Prisma's createMany is used for bulk inserts.
     * For 3-10 events per cycle, this is efficient enough.
     */
    async writeBatch(envelopes: ScadaEventEnvelope[]): Promise<number> {
        if (envelopes.length === 0) return 0;

        const records = envelopes.map((envelope) => {
            const aggregateId = buildMessageKey(
                envelope.asset.plant,
                envelope.asset.area,
                envelope.asset.unit,
                envelope.tag,
            );
            const topic = resolveTopicName(envelope.category, envelope.tag);
            const headers = this.buildHeaders(envelope, aggregateId, topic);

            return {
                id: envelope.eventId,
                aggregateType: envelope.category,
                aggregateId,
                eventType: envelope.tag,
                payload: envelope as any,
                headers: headers as any,
                status: 'PENDING',
                retryCount: 0,
                availableAt: new Date(),
            };
        });

        const result = await this.prisma.outboxEvent.createMany({
            data: records,
            skipDuplicates: true,
        });

        logger.debug(
            { count: result.count, total: envelopes.length },
            'Batch written to outbox',
        );

        return result.count;
    }

    /**
     * Writes a telemetry event to BOTH the outbox AND the local telemetry cache
     * in a single atomic transaction.
     *
     * This is the recommended path for telemetry data because:
     *   1. The outbox ensures the event reaches Kafka (eventually)
     *   2. The local cache enables serving recent data even if Kafka is down
     *
     * Both writes succeed or both fail — no inconsistency possible.
     */
    async writeEventWithLocalCache(envelope: ScadaEventEnvelope): Promise<string> {
        const eventId = envelope.eventId;
        const aggregateId = buildMessageKey(
            envelope.asset.plant,
            envelope.asset.area,
            envelope.asset.unit,
            envelope.tag,
        );
        const topic = resolveTopicName(envelope.category, envelope.tag);
        const headers = this.buildHeaders(envelope, aggregateId, topic);

        await this.prisma.$transaction([
            // Write to outbox (for Kafka delivery)
            this.prisma.outboxEvent.create({
                data: {
                    id: eventId,
                    aggregateType: envelope.category,
                    aggregateId,
                    eventType: envelope.tag,
                    payload: envelope as any,
                    headers: headers as any,
                    status: 'PENDING',
                    retryCount: 0,
                    availableAt: new Date(),
                },
            }),
            // Write to local telemetry cache (for immediate access)
            ...(envelope.category === 'telemetry'
                ? [
                    this.prisma.localTelemetry.create({
                        data: {
                            timestamp: new Date(envelope.timestamp),
                            plant: envelope.asset.plant,
                            area: envelope.asset.area,
                            unitName: envelope.asset.unit,
                            tag: envelope.tag,
                            value: envelope.value,
                            unit: envelope.unit,
                            quality: envelope.quality,
                            nodeId: envelope.nodeId,
                        },
                    }),
                ]
                : []),
        ]);

        return eventId;
    }

    /**
     * Builds standardized message headers for outbox events.
     * These headers are published alongside the payload to Kafka.
     */
    private buildHeaders(
        envelope: ScadaEventEnvelope,
        aggregateId: string,
        topic: string,
    ): OutboxHeaders {
        const traceId = uuidv4();
        return {
            correlationId: envelope.eventId,
            causationId: envelope.eventId,
            traceId,
            schemaVersion: '1.0.0',
            nodeId: envelope.nodeId,
            topic,
            partitionKey: aggregateId,
            contentType: 'application/json',
            sourceTimestamp: envelope.timestamp,
        };
    }
}
