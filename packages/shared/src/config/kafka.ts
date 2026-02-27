/**
 * =============================================================================
 * SRS Master — Kafka Configuration Constants
 * =============================================================================
 *
 * Centralized Kafka configuration following ISA-95 naming conventions.
 *
 * Topic Naming Convention:
 *   <domain>.<isa-level>.<category>.<type>
 *   Example: scada.l2.telemetry.flow
 *
 * This follows ISA-95 Level 2 (SCADA/DCS) → Level 3 (MES/Historian) data flow.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// ISA-95 Aligned Topic Names
// ---------------------------------------------------------------------------

/** Telemetry topics — one per measurement type for fine-grained retention */
export const TOPICS = {
    /** Flow rate measurements (m³/h, GPM, etc.) */
    TELEMETRY_FLOW: 'scada.l2.telemetry.flow',
    /** Pressure measurements (bar, PSI, kPa, etc.) */
    TELEMETRY_PRESSURE: 'scada.l2.telemetry.pressure',
    /** Temperature measurements (°C, °F, K) */
    TELEMETRY_TEMPERATURE: 'scada.l2.telemetry.temperature',
    /** Operational events (start/stop, mode changes, setpoint changes) */
    EVENTS: 'scada.l2.events',
    /** Process alarms (high/low trips, critical alerts) */
    ALARMS: 'scada.l2.alarms',
} as const;

/** All topic names as an array — used for consumer subscriptions */
export const ALL_TOPICS = Object.values(TOPICS);

/** Telemetry-only topics — used for telemetry-specific consumers */
export const TELEMETRY_TOPICS = [
    TOPICS.TELEMETRY_FLOW,
    TOPICS.TELEMETRY_PRESSURE,
    TOPICS.TELEMETRY_TEMPERATURE,
] as const;

// ---------------------------------------------------------------------------
// Retention Policies (in milliseconds)
// ---------------------------------------------------------------------------

export const RETENTION = {
    /** Telemetry: 7 days — high volume, recent data most valuable */
    TELEMETRY_MS: 7 * 24 * 60 * 60 * 1000,   // 604,800,000 ms
    /** Events: 30 days — operational history for shift reports */
    EVENTS_MS: 30 * 24 * 60 * 60 * 1000,      // 2,592,000,000 ms
    /** Alarms: 90 days — regulatory compliance, incident investigation */
    ALARMS_MS: 90 * 24 * 60 * 60 * 1000,      // 7,776,000,000 ms
} as const;

// ---------------------------------------------------------------------------
// Partition Configuration
// ---------------------------------------------------------------------------

/**
 * Minimum 200 partitions per topic.
 *
 * Rationale:
 *   - 100 remote nodes need parallel writes
 *   - Each node may produce multiple tags
 *   - Consumer parallelism is bounded by partition count
 *   - Over-partitioning is safer than under-partitioning
 *   - Kafka handles high partition counts well with KRaft
 */
export const PARTITION_COUNT = 200;

// ---------------------------------------------------------------------------
// Message Key Builder
// ---------------------------------------------------------------------------

/**
 * Builds a deterministic Kafka message key from the asset hierarchy and tag.
 *
 * Format: "{plant}.{area}.{unit}.{tag}"
 * Example: "PLANT01.AREA02.UNIT_05.FLOW_RATE"
 *
 * Purpose:
 *   - Ensures all messages for the same tag go to the same partition
 *   - Enables ordered processing per tag (critical for control systems)
 *   - Supports key-based compaction if needed in the future
 *
 * @param plant - ISA-95 Site identifier
 * @param area  - ISA-95 Area identifier
 * @param unit  - ISA-95 Work Unit identifier
 * @param tag   - Process variable tag name
 * @returns Deterministic partition key string
 */
export function buildMessageKey(
    plant: string,
    area: string,
    unit: string,
    tag: string,
): string {
    return `${plant}.${area}.${unit}.${tag}`;
}

/**
 * Maps an event category + optional telemetry type to the correct Kafka topic.
 *
 * @param category - 'telemetry' | 'event' | 'alarm'
 * @param tag      - Tag name (used to determine telemetry sub-topic)
 * @returns The ISA-95 compliant topic name
 */
export function resolveTopicName(
    category: string,
    tag: string,
): string {
    if (category === 'alarm') return TOPICS.ALARMS;
    if (category === 'event') return TOPICS.EVENTS;

    // Route telemetry to sub-topics based on tag naming convention
    const tagUpper = tag.toUpperCase();
    if (tagUpper.includes('FLOW')) return TOPICS.TELEMETRY_FLOW;
    if (tagUpper.includes('PRESSURE')) return TOPICS.TELEMETRY_PRESSURE;
    if (tagUpper.includes('TEMP')) return TOPICS.TELEMETRY_TEMPERATURE;

    // Default: flow topic for unrecognized telemetry tags
    return TOPICS.TELEMETRY_FLOW;
}

// ---------------------------------------------------------------------------
// Consumer Group
// ---------------------------------------------------------------------------

/** Master station consumer group — all consumers in this group share the load */
export const CONSUMER_GROUP_ID = 'master-aggregator';

// ---------------------------------------------------------------------------
// Producer Configuration Defaults
// ---------------------------------------------------------------------------

export const PRODUCER_DEFAULTS = {
    /** acks=all — wait for all in-sync replicas to acknowledge */
    ACKS: -1 as const,
    /** Enable idempotent producer — prevents duplicate messages on retry */
    IDEMPOTENT: true,
    /** Maximum retries before giving up */
    MAX_RETRIES: 10,
    /** Initial backoff between retries (ms) */
    INITIAL_RETRY_TIME: 300,
    /** Maximum in-flight requests per connection (must be 1 for ordering with idempotent) */
    MAX_IN_FLIGHT_REQUESTS: 1,
} as const;
