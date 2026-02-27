/**
 * =============================================================================
 * SRS Master — Kafka Consumer (Master Aggregator)
 * =============================================================================
 *
 * Consumes SCADA events from all ISA-95 Level-2 topics and persists them
 * to the PostgreSQL historian database via Prisma v6.
 *
 * Processing Pipeline:
 *   1. Receive batch of Kafka messages
 *   2. Deserialize JSON payloads
 *   3. Validate each message against Zod schema
 *   4. Route to correct table (telemetry / events / alarms)
 *   5. Batch insert via Prisma createMany({ skipDuplicates: true })
 *   6. Commit Kafka offsets AFTER successful persistence
 *
 * Offset Management:
 *   - autoCommit is DISABLED (eachBatch mode)
 *   - Offsets are committed only after successful database writes
 *   - This prevents data loss during crashes/restarts
 *   - On restart, uncommitted messages are replayed
 *   - Idempotent inserts (skipDuplicates) handle the replay safely
 *
 * Consumer Group: master-aggregator
 *   - All consumer instances share this group ID
 *   - Kafka distributes partitions across group members
 *   - Adding more consumers = horizontal scaling
 *   - Max useful consumers = number of partitions (200)
 * =============================================================================
 */

import type { Kafka, Consumer, EachBatchPayload } from 'kafkajs';
import { ALL_TOPICS, CONSUMER_GROUP_ID, validateEnvelope } from '@srs/shared';
import type { ValidatedEnvelope } from '@srs/shared';
import { HistorianRepository } from '../db/repository.js';
import pino from 'pino';

const logger = pino({ name: 'scada-consumer' });

export class ScadaConsumer {
    private consumer: Consumer;
    private connected = false;

    constructor(
        kafka: Kafka,
        private readonly repository: HistorianRepository,
    ) {
        const groupId = process.env.KAFKA_CONSUMER_GROUP_ID ?? CONSUMER_GROUP_ID;
        const sessionTimeout = parseInt(
            process.env.CONSUMER_SESSION_TIMEOUT_MS ?? '30000',
            10,
        );
        const heartbeatInterval = parseInt(
            process.env.CONSUMER_HEARTBEAT_INTERVAL_MS ?? '3000',
            10,
        );

        this.consumer = kafka.consumer({
            groupId,
            // ---------------------------------------------------------------
            // Consumer Configuration for 24/7 Industrial Operation
            // ---------------------------------------------------------------
            sessionTimeout,           // Time before broker considers consumer dead
            heartbeatInterval,        // Heartbeat frequency to keep session alive
            maxWaitTimeInMs: 5000,    // Max time to wait for new messages
            allowAutoTopicCreation: false,
            retry: {
                retries: 10,
                initialRetryTime: 300,
            },
        });

        logger.info({ groupId, sessionTimeout, heartbeatInterval }, 'Consumer created');
    }

    /**
     * Connect to Kafka and subscribe to all SCADA Level-2 topics.
     */
    async connect(): Promise<void> {
        if (this.connected) return;

        await this.consumer.connect();
        this.connected = true;

        // Subscribe to ALL ISA-95 Level-2 topics
        for (const topic of ALL_TOPICS) {
            await this.consumer.subscribe({ topic, fromBeginning: false });
            logger.info({ topic }, 'Subscribed to topic');
        }

        logger.info(
            { topics: ALL_TOPICS },
            'Consumer connected and subscribed to all SCADA topics',
        );
    }

    /**
     * Start consuming messages in batch mode.
     *
     * Why batch mode (eachBatch) instead of eachMessage?
     *   - Batch processing enables bulk database inserts (10-50x faster)
     *   - Manual offset management ensures data consistency
     *   - In industrial systems, throughput matters more than per-message latency
     */
    async start(): Promise<void> {
        await this.consumer.run({
            // Manual offset management — commit only after DB write
            autoCommit: false,

            eachBatch: async (payload: EachBatchPayload) => {
                const { batch, resolveOffset, heartbeat, commitOffsetsIfNecessary } = payload;
                const { topic, partition, messages } = batch;

                logger.debug(
                    { topic, partition, count: messages.length },
                    'Processing batch',
                );

                // Step 1: Deserialize and validate all messages in the batch
                const validEvents: ValidatedEnvelope[] = [];
                let lastOffset: string | undefined;

                for (const message of messages) {
                    try {
                        if (!message.value) {
                            logger.warn({ topic, partition, offset: message.offset }, 'Empty message — skipping');
                            continue;
                        }

                        const raw = JSON.parse(message.value.toString());
                        const result = validateEnvelope(raw);

                        if (result.success) {
                            validEvents.push(result.data);
                        } else {
                            // Log validation failures but don't crash — bad messages
                            // should not block the pipeline. In production, these would
                            // be routed to a dead-letter topic for investigation.
                            logger.warn(
                                {
                                    topic,
                                    partition,
                                    offset: message.offset,
                                    errors: result.error.issues,
                                },
                                'Message validation failed — skipping',
                            );
                        }

                        lastOffset = message.offset;
                    } catch (error) {
                        logger.error(
                            { error, topic, partition, offset: message.offset },
                            'Failed to parse message — skipping',
                        );
                        lastOffset = message.offset;
                    }
                }

                // Step 2: Batch insert valid events into PostgreSQL
                if (validEvents.length > 0) {
                    try {
                        const inserted = await this.repository.insertAll(validEvents);
                        logger.info(
                            { topic, partition, valid: validEvents.length, inserted },
                            'Batch persisted',
                        );
                    } catch (error) {
                        // Database failure — DO NOT commit offsets
                        // The messages will be replayed on the next poll
                        logger.error(
                            { error, topic, partition, count: validEvents.length },
                            'Database write failed — offsets NOT committed, will retry',
                        );
                        throw error; // Re-throw to trigger Kafka retry
                    }
                }

                // Step 3: Commit offsets AFTER successful persistence
                if (lastOffset !== undefined) {
                    resolveOffset(lastOffset);
                    await commitOffsetsIfNecessary();
                }

                // Keep the session alive during long processing
                await heartbeat();
            },
        });

        logger.info('Consumer running — processing messages');
    }

    /**
     * Gracefully disconnect from Kafka.
     * Allows in-progress batches to complete before disconnecting.
     */
    async disconnect(): Promise<void> {
        if (!this.connected) return;
        await this.consumer.disconnect();
        this.connected = false;
        logger.info('Consumer disconnected from Kafka cluster');
    }
}
