/**
 * =============================================================================
 * SRS Master — Kafka Producer Wrapper
 * =============================================================================
 *
 * Wraps KafkaJS producer with industrial-grade guarantees:
 *
 *   - acks=all      → Wait for ALL in-sync replicas to acknowledge
 *   - idempotent    → Prevents duplicate messages on retry
 *   - ordered       → maxInFlightRequests=1 for per-partition ordering
 *   - deterministic → Message key built from asset hierarchy + tag
 *
 * ISA-95 Context:
 *   This producer runs on Level-2 nodes and publishes process data
 *   to the Level-3 Kafka backbone. Topic routing follows ISA-95 naming.
 * =============================================================================
 */

import type { Producer, Kafka, Message } from 'kafkajs';
import type { ScadaEventEnvelope } from '@srs/shared';
import {
    buildMessageKey,
    resolveTopicName,
    PRODUCER_DEFAULTS,
} from '@srs/shared';
import pino from 'pino';

const logger = pino({ name: 'scada-producer' });

export class ScadaProducer {
    private producer: Producer;
    private connected = false;

    constructor(kafka: Kafka) {
        this.producer = kafka.producer({
            // ---------------------------------------------------------------
            // Industrial Producer Guarantees
            // ---------------------------------------------------------------
            // acks=-1 (all): Every message must be replicated to ALL in-sync
            // replicas before the broker acknowledges. This prevents data loss
            // if a broker fails immediately after receiving the message.
            //
            // idempotent=true: The broker assigns a sequence number to each
            // message. If a retry causes a duplicate, the broker silently
            // discards it. This gives us exactly-once semantics at the
            // producer level.
            //
            // maxInFlightRequests=1: Ensures strict ordering per partition.
            // Combined with deterministic keys, this guarantees that all
            // messages for a given tag arrive in chronological order.
            // ---------------------------------------------------------------
            allowAutoTopicCreation: false,
            idempotent: PRODUCER_DEFAULTS.IDEMPOTENT,
            maxInFlightRequests: PRODUCER_DEFAULTS.MAX_IN_FLIGHT_REQUESTS,
            retry: {
                retries: PRODUCER_DEFAULTS.MAX_RETRIES,
                initialRetryTime: PRODUCER_DEFAULTS.INITIAL_RETRY_TIME,
            },
        });
    }

    /**
     * Connect to the Kafka cluster.
     * Must be called before publishing any messages.
     */
    async connect(): Promise<void> {
        if (this.connected) return;
        await this.producer.connect();
        this.connected = true;
        logger.info('Producer connected to Kafka cluster');
    }

    /**
     * Publish a single SCADA event to the appropriate Kafka topic.
     *
     * The topic is resolved from the event category + tag name:
     *   - category=telemetry + tag=FLOW_RATE → scada.l2.telemetry.flow
     *   - category=alarm                     → scada.l2.alarms
     *   - category=event                    → scada.l2.events
     *
     * The message key ensures deterministic partition assignment:
     *   PLANT01.AREA02.UNIT_05.FLOW_RATE → always same partition
     */
    async publish(envelope: ScadaEventEnvelope): Promise<void> {
        const topic = resolveTopicName(envelope.category, envelope.tag);
        const key = buildMessageKey(
            envelope.asset.plant,
            envelope.asset.area,
            envelope.asset.unit,
            envelope.tag,
        );

        const message: Message = {
            key,
            value: JSON.stringify(envelope),
            headers: {
                'event-id': envelope.eventId,
                'node-id': String(envelope.nodeId),
                'event-category': envelope.category,
                'content-type': 'application/json',
            },
        };

        await this.producer.send({
            topic,
            acks: PRODUCER_DEFAULTS.ACKS,
            messages: [message],
        });

        logger.debug(
            { eventId: envelope.eventId, topic, key },
            'Message published',
        );
    }

    /**
     * Publish a batch of SCADA events.
     * Groups messages by topic for efficient batch sending.
     */
    async publishBatch(envelopes: ScadaEventEnvelope[]): Promise<void> {
        // Group by topic for batch efficiency
        const topicMessages = new Map<string, Message[]>();

        for (const envelope of envelopes) {
            const topic = resolveTopicName(envelope.category, envelope.tag);
            const key = buildMessageKey(
                envelope.asset.plant,
                envelope.asset.area,
                envelope.asset.unit,
                envelope.tag,
            );

            const message: Message = {
                key,
                value: JSON.stringify(envelope),
                headers: {
                    'event-id': envelope.eventId,
                    'node-id': String(envelope.nodeId),
                    'event-category': envelope.category,
                    'content-type': 'application/json',
                },
            };

            const existing = topicMessages.get(topic) ?? [];
            existing.push(message);
            topicMessages.set(topic, existing);
        }

        // Send as a single batch operation across topics
        await this.producer.sendBatch({
            acks: PRODUCER_DEFAULTS.ACKS,
            topicMessages: Array.from(topicMessages.entries()).map(
                ([topic, messages]) => ({ topic, messages }),
            ),
        });

        logger.info(
            { count: envelopes.length, topics: Array.from(topicMessages.keys()) },
            'Batch published',
        );
    }

    /**
     * Gracefully disconnect from Kafka.
     * Ensures all buffered messages are flushed before disconnecting.
     */
    async disconnect(): Promise<void> {
        if (!this.connected) return;
        await this.producer.disconnect();
        this.connected = false;
        logger.info('Producer disconnected from Kafka cluster');
    }

    /**
     * Publish a raw pre-built payload to a specific topic.
     *
     * Used by the Outbox Dispatcher which has already serialized the
     * event and resolved the topic/partition key. The dispatcher needs
     * direct control over the topic and key rather than deriving them
     * from an envelope.
     *
     * @param topic        - Kafka topic name
     * @param partitionKey - Deterministic partition key (ISA-95 asset.tag)
     * @param payload      - Pre-serialized event data (will be JSON.stringified)
     * @param headers      - Optional message headers from the outbox
     */
    async publishRaw(
        topic: string,
        partitionKey: string,
        payload: Record<string, any>,
        headers?: Record<string, string>,
    ): Promise<void> {
        const message: Message = {
            key: partitionKey,
            value: JSON.stringify(payload),
            headers: headers
                ? Object.fromEntries(
                    Object.entries(headers).map(([k, v]) => [k, String(v)]),
                )
                : undefined,
        };

        await this.producer.send({
            topic,
            acks: PRODUCER_DEFAULTS.ACKS,
            messages: [message],
        });

        logger.debug(
            { topic, partitionKey, headers },
            'Raw message published via outbox dispatcher',
        );
    }
}
