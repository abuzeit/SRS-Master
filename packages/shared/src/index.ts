/**
 * =============================================================================
 * SRS Master — Shared Package Barrel Export
 * =============================================================================
 */

// Types
export type {
    AssetIdentifier,
    QualityCode,
    EventCategory,
    ScadaEventEnvelope,
    TelemetryType,
    AlarmSeverity,
    AlarmEventEnvelope,
} from './types/index.js';

// Validation
export {
    ScadaEventEnvelopeSchema,
    AlarmEventEnvelopeSchema,
    AssetIdentifierSchema,
    QualityCodeSchema,
    EventCategorySchema,
    AlarmSeveritySchema,
    validateEnvelope,
    validateAlarmEnvelope,
} from './validation/schema.js';
export type { ValidatedEnvelope, ValidatedAlarmEnvelope } from './validation/schema.js';

// Kafka Configuration
export {
    TOPICS,
    ALL_TOPICS,
    TELEMETRY_TOPICS,
    RETENTION,
    PARTITION_COUNT,
    CONSUMER_GROUP_ID,
    PRODUCER_DEFAULTS,
    buildMessageKey,
    resolveTopicName,
} from './config/kafka.js';
