/**
 * =============================================================================
 * SRS Master — ISA-95 Event Envelope Types
 * =============================================================================
 *
 * Defines the standard message envelope for all SCADA Level-2 data.
 * Every message flowing through the Kafka backbone MUST conform to this schema.
 *
 * ISA-95 Context:
 *   - Asset hierarchy follows the ISA-95 equipment model:
 *     Enterprise → Site → Area → Unit
 *   - The "plant" field maps to ISA-95 "Site"
 *   - The "area" field maps to ISA-95 "Area"
 *   - The "unit" field maps to ISA-95 "Work Unit"
 *
 * Quality Codes:
 *   GOOD       — Value is reliable and within expected range
 *   BAD        — Value is unreliable (sensor fault, comm failure)
 *   UNCERTAIN  — Value received but reliability is unknown
 *   OOR        — Out of Range — value exceeds physical limits
 * =============================================================================
 */

/**
 * ISA-95 equipment hierarchy for asset identification.
 * Used to deterministically route messages to Kafka partitions.
 */
export interface AssetIdentifier {
    /** ISA-95 Site — e.g., "PLANT01", "REFINERY_NORTH" */
    readonly plant: string;
    /** ISA-95 Area — e.g., "AREA02", "DISTILLATION" */
    readonly area: string;
    /** ISA-95 Work Unit — e.g., "UNIT_05", "COMPRESSOR_A" */
    readonly unit: string;
}

/** OPC-UA inspired quality codes for industrial data points */
export type QualityCode = 'GOOD' | 'BAD' | 'UNCERTAIN' | 'OOR';

/** Category of the SCADA event — determines Kafka topic routing */
export type EventCategory = 'telemetry' | 'event' | 'alarm';

/**
 * Standard event envelope for all SCADA Level-2 messages.
 *
 * This envelope wraps every data point, operational event, and alarm
 * that flows from remote nodes through Kafka to the central historian.
 *
 * Design decisions:
 *   - eventId (UUIDv4) is the global deduplication key
 *   - timestamp is ISO-8601 UTC for timezone-agnostic storage
 *   - asset hierarchy enables deterministic Kafka partitioning
 *   - category drives topic routing (telemetry/events/alarms)
 */
export interface ScadaEventEnvelope {
    /** UUIDv4 — globally unique, used as PostgreSQL PK for idempotency */
    readonly eventId: string;
    /** ISO-8601 UTC timestamp of when the measurement was taken */
    readonly timestamp: string;
    /** ISA-95 equipment hierarchy */
    readonly asset: AssetIdentifier;
    /** Process variable tag name — e.g., "FLOW_RATE", "PRESSURE" */
    readonly tag: string;
    /** Numeric value of the measurement */
    readonly value: number;
    /** Engineering unit — e.g., "m3/h", "bar", "°C" */
    readonly unit: string;
    /** OPC-UA quality code indicating data reliability */
    readonly quality: QualityCode;
    /** Event category for Kafka topic routing */
    readonly category: EventCategory;
    /** Originating node ID (1–100) for traceability */
    readonly nodeId: number;
}

/**
 * Telemetry sub-types for ISA-95 topic naming.
 * Each type maps to a dedicated Kafka topic:
 *   scada.l2.telemetry.flow
 *   scada.l2.telemetry.pressure
 *   scada.l2.telemetry.temperature
 */
export type TelemetryType = 'flow' | 'pressure' | 'temperature';

/**
 * Alarm severity levels — maps to industrial alarm management standards.
 * Retention increases with severity (alarms retained 90 days vs 7 for telemetry).
 */
export type AlarmSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Extended alarm envelope with severity information */
export interface AlarmEventEnvelope extends ScadaEventEnvelope {
    readonly category: 'alarm';
    readonly severity: AlarmSeverity;
}
