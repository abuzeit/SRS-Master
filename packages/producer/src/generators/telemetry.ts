/**
 * =============================================================================
 * SRS Master — Telemetry Data Generator
 * =============================================================================
 *
 * Simulates realistic industrial telemetry from SCADA Level-2 instruments.
 *
 * Generated tags:
 *   FLOW_RATE    — Volumetric flow (m³/h), typical range 0–100
 *   PRESSURE     — Line pressure (bar), typical range 0–25
 *   TEMPERATURE  — Process temperature (°C), typical range 15–350
 *
 * Values use Gaussian-like random walks to simulate real sensor behavior:
 *   - Gradual drift around a setpoint
 *   - Occasional spikes (process disturbances)
 *   - Quality degradation under extreme values
 * =============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScadaEventEnvelope, QualityCode } from '@srs/shared';

/** Telemetry tag definition with realistic ranges */
interface TagDefinition {
    tag: string;
    unit: string;
    setpoint: number;
    minPhysical: number;
    maxPhysical: number;
    noiseAmplitude: number;
}

/** Standard process measurement tags */
const TAGS: TagDefinition[] = [
    {
        tag: 'FLOW_RATE',
        unit: 'm3/h',
        setpoint: 50,
        minPhysical: 0,
        maxPhysical: 120,
        noiseAmplitude: 5,
    },
    {
        tag: 'PRESSURE',
        unit: 'bar',
        setpoint: 12,
        minPhysical: 0,
        maxPhysical: 30,
        noiseAmplitude: 1.5,
    },
    {
        tag: 'TEMPERATURE',
        unit: '°C',
        setpoint: 180,
        minPhysical: -20,
        maxPhysical: 400,
        noiseAmplitude: 8,
    },
];

/** Tracks the current "walking" value for each tag to simulate sensor drift */
const currentValues = new Map<string, number>();

/**
 * Generates a Gaussian-distributed random number using Box-Muller transform.
 * Used to simulate realistic sensor noise.
 */
function gaussianRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Determines data quality based on value proximity to physical limits.
 * Real SCADA systems flag quality when values approach sensor ranges.
 */
function assessQuality(value: number, tag: TagDefinition): QualityCode {
    if (value < tag.minPhysical || value > tag.maxPhysical) return 'OOR';
    const range = tag.maxPhysical - tag.minPhysical;
    const margin = range * 0.05; // 5% margin
    if (value < tag.minPhysical + margin || value > tag.maxPhysical - margin) {
        return 'UNCERTAIN';
    }
    return 'GOOD';
}

/**
 * Generates a batch of telemetry events for a given node.
 *
 * @param nodeId  - Unique node identifier (1–100)
 * @param plant   - ISA-95 Site ID
 * @param area    - ISA-95 Area ID
 * @param unitName - ISA-95 Work Unit ID
 * @returns Array of SCADA event envelopes ready for Kafka publishing
 */
export function generateTelemetry(
    nodeId: number,
    plant: string,
    area: string,
    unitName: string,
): ScadaEventEnvelope[] {
    const timestamp = new Date().toISOString();
    const events: ScadaEventEnvelope[] = [];

    for (const tagDef of TAGS) {
        // Random walk: drift toward setpoint with noise
        const key = `${nodeId}-${tagDef.tag}`;
        const current = currentValues.get(key) ?? tagDef.setpoint;
        const drift = (tagDef.setpoint - current) * 0.1; // Mean reversion
        const noise = gaussianRandom() * tagDef.noiseAmplitude;
        const newValue = Math.round((current + drift + noise) * 100) / 100;

        // Clamp to a slightly wider range to allow OOR detection
        const clampedValue = Math.max(
            tagDef.minPhysical - tagDef.noiseAmplitude,
            Math.min(tagDef.maxPhysical + tagDef.noiseAmplitude, newValue),
        );
        currentValues.set(key, clampedValue);

        const quality = assessQuality(clampedValue, tagDef);

        events.push({
            eventId: uuidv4(),
            timestamp,
            asset: { plant, area, unit: unitName },
            tag: tagDef.tag,
            value: clampedValue,
            unit: tagDef.unit,
            quality,
            category: 'telemetry',
            nodeId,
        });
    }

    return events;
}
