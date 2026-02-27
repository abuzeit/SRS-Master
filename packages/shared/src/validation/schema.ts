/**
 * =============================================================================
 * SRS Master — Zod Runtime Validation Schemas
 * =============================================================================
 *
 * Runtime validation for messages consumed from Kafka.
 * The consumer MUST validate every message before persisting to PostgreSQL.
 *
 * Why runtime validation?
 *   - Kafka is a dumb pipe — it doesn't validate message content
 *   - Producers may have bugs, be compromised, or run old versions
 *   - Bad data in the historian corrupts analytics and control decisions
 *   - In SCADA systems, data integrity can affect physical safety
 * =============================================================================
 */

import { z } from 'zod';

/** Validates ISA-95 asset hierarchy */
export const AssetIdentifierSchema = z.object({
    plant: z
        .string()
        .min(1, 'Plant ID is required')
        .max(64, 'Plant ID too long')
        .regex(/^[A-Z0-9_]+$/, 'Plant ID must be uppercase alphanumeric with underscores'),
    area: z
        .string()
        .min(1, 'Area ID is required')
        .max(64, 'Area ID too long')
        .regex(/^[A-Z0-9_]+$/, 'Area ID must be uppercase alphanumeric with underscores'),
    unit: z
        .string()
        .min(1, 'Unit ID is required')
        .max(64, 'Unit ID too long')
        .regex(/^[A-Z0-9_]+$/, 'Unit ID must be uppercase alphanumeric with underscores'),
});

/** Quality code validation — matches OPC-UA quality subset */
export const QualityCodeSchema = z.enum(['GOOD', 'BAD', 'UNCERTAIN', 'OOR']);

/** Event category — determines Kafka topic routing */
export const EventCategorySchema = z.enum(['telemetry', 'event', 'alarm']);

/** Alarm severity levels */
export const AlarmSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

/**
 * Full SCADA event envelope validation schema.
 *
 * Every field is validated for:
 *   - Correct type
 *   - Reasonable value ranges
 *   - Format compliance (UUID, ISO-8601, naming conventions)
 */
export const ScadaEventEnvelopeSchema = z.object({
    eventId: z
        .string()
        .uuid('eventId must be a valid UUIDv4'),
    timestamp: z
        .string()
        .datetime({ message: 'timestamp must be ISO-8601 UTC format' }),
    asset: AssetIdentifierSchema,
    tag: z
        .string()
        .min(1, 'Tag name is required')
        .max(128, 'Tag name too long')
        .regex(/^[A-Z0-9_]+$/, 'Tag must be uppercase alphanumeric with underscores'),
    value: z
        .number()
        .finite('Value must be finite — NaN/Infinity rejected for data integrity'),
    unit: z
        .string()
        .min(1, 'Engineering unit is required')
        .max(32, 'Engineering unit too long'),
    quality: QualityCodeSchema,
    category: EventCategorySchema,
    nodeId: z
        .number()
        .int()
        .min(1, 'Node ID must be >= 1')
        .max(1000, 'Node ID must be <= 1000'),
});

/** Extended schema for alarm events — includes severity */
export const AlarmEventEnvelopeSchema = ScadaEventEnvelopeSchema.extend({
    category: z.literal('alarm'),
    severity: AlarmSeveritySchema,
});

/** Type-safe inferred types from Zod schemas */
export type ValidatedEnvelope = z.infer<typeof ScadaEventEnvelopeSchema>;
export type ValidatedAlarmEnvelope = z.infer<typeof AlarmEventEnvelopeSchema>;

/**
 * Validates a raw message against the event envelope schema.
 * Returns a discriminated union: { success: true, data } | { success: false, error }
 */
export function validateEnvelope(raw: unknown): z.SafeParseReturnType<unknown, ValidatedEnvelope> {
    return ScadaEventEnvelopeSchema.safeParse(raw);
}

/**
 * Validates a raw message as an alarm event.
 */
export function validateAlarmEnvelope(raw: unknown): z.SafeParseReturnType<unknown, ValidatedAlarmEnvelope> {
    return AlarmEventEnvelopeSchema.safeParse(raw);
}
