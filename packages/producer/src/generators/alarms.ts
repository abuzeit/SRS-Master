/**
 * =============================================================================
 * SRS Master — Alarm Event Generator
 * =============================================================================
 *
 * Simulates SCADA alarm conditions following ISA-18.2 alarm management.
 *
 * Alarm types:
 *   HIGH_FLOW     — Flow rate exceeds high limit
 *   LOW_PRESSURE  — Pressure below safe minimum
 *   HIGH_TEMP     — Temperature exceeds operating limit
 *   CRITICAL_TEMP — Temperature exceeds emergency shutdown threshold
 *   VIBRATION     — Rotating equipment vibration alarm
 *
 * Severity mapping (ISA-18.2):
 *   LOW      — Advisory, operator awareness only
 *   MEDIUM   — Requires operator response within shift
 *   HIGH     — Requires immediate operator response
 *   CRITICAL — Safety system activation, potential ESD trigger
 *
 * Alarms are retained for 90 days in Kafka (vs 7 for telemetry) because
 * they are critical for:
 *   - Regulatory compliance audits
 *   - Incident investigation and root cause analysis
 *   - Alarm rationalization studies (ISA-18.2)
 * =============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScadaEventEnvelope, AlarmSeverity } from '@srs/shared';

/** Alarm definition with severity and occurrence probability */
interface AlarmDefinition {
    tag: string;
    severity: AlarmSeverity;
    probability: number;
    unit: string;
    thresholdValue: number;
}

const ALARM_DEFINITIONS: AlarmDefinition[] = [
    { tag: 'HIGH_FLOW', severity: 'MEDIUM', probability: 0.008, unit: 'm3/h', thresholdValue: 95 },
    { tag: 'LOW_PRESSURE', severity: 'HIGH', probability: 0.005, unit: 'bar', thresholdValue: 2 },
    { tag: 'HIGH_TEMP', severity: 'HIGH', probability: 0.004, unit: '°C', thresholdValue: 320 },
    { tag: 'CRITICAL_TEMP', severity: 'CRITICAL', probability: 0.001, unit: '°C', thresholdValue: 380 },
    { tag: 'VIBRATION_HIGH', severity: 'MEDIUM', probability: 0.006, unit: 'mm/s', thresholdValue: 7.1 },
    { tag: 'INSTRUMENT_FAULT', severity: 'LOW', probability: 0.003, unit: 'fault', thresholdValue: 1 },
];

/**
 * Generates alarm events based on stochastic probability.
 *
 * Alarm frequencies are much lower than telemetry to simulate real plants:
 *   - CRITICAL alarms: ~1 per 1000 cycles
 *   - HIGH alarms: ~4–5 per 1000 cycles
 *   - MEDIUM alarms: ~6–8 per 1000 cycles
 *   - LOW alarms: ~3 per 1000 cycles
 *
 * @param nodeId   - Unique node identifier (1–100)
 * @param plant    - ISA-95 Site ID
 * @param area     - ISA-95 Area ID
 * @param unitName - ISA-95 Work Unit ID
 * @returns Array of alarm event envelopes (usually 0–1 per call)
 */
export function generateAlarms(
    nodeId: number,
    plant: string,
    area: string,
    unitName: string,
): ScadaEventEnvelope[] {
    const timestamp = new Date().toISOString();
    const alarms: ScadaEventEnvelope[] = [];

    for (const alarmDef of ALARM_DEFINITIONS) {
        if (Math.random() < alarmDef.probability) {
            alarms.push({
                eventId: uuidv4(),
                timestamp,
                asset: { plant, area, unit: unitName },
                tag: alarmDef.tag,
                value: alarmDef.thresholdValue + (Math.random() * 10),
                unit: alarmDef.unit,
                quality: 'GOOD',
                category: 'alarm',
                nodeId,
            });
        }
    }

    return alarms;
}
