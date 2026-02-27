/**
 * =============================================================================
 * SRS Master — Operational Event Generator
 * =============================================================================
 *
 * Simulates Level-2 operational events that occur in industrial processes:
 *
 *   UNIT_START     — Equipment startup sequence initiated
 *   UNIT_STOP      — Equipment shutdown (normal or emergency)
 *   MODE_CHANGE    — Operating mode transition (AUTO → MANUAL, etc.)
 *   SETPOINT_CHANGE — Operator or APC modified a control setpoint
 *   MAINTENANCE    — Equipment entered/exited maintenance window
 *
 * Events are generated stochastically with realistic frequencies:
 *   - Mode changes: ~every 30 minutes
 *   - Setpoint changes: ~every 10 minutes
 *   - Start/stop: ~every 2 hours
 *   - Maintenance: ~every 8 hours
 * =============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScadaEventEnvelope } from '@srs/shared';

/** Operational event types with associated occurrence probabilities per cycle */
const EVENT_TYPES = [
    { tag: 'UNIT_START', probability: 0.005, unit: 'state' },
    { tag: 'UNIT_STOP', probability: 0.005, unit: 'state' },
    { tag: 'MODE_CHANGE', probability: 0.02, unit: 'mode' },
    { tag: 'SETPOINT_CHANGE', probability: 0.05, unit: 'setpoint' },
    { tag: 'MAINTENANCE', probability: 0.002, unit: 'state' },
] as const;

/** Mode values for MODE_CHANGE events */
const MODES = ['AUTO', 'MANUAL', 'CASCADE', 'REMOTE', 'LOCAL'];

/**
 * Generates operational events based on stochastic probability.
 *
 * Not every call produces events — this simulates the intermittent nature
 * of operational events in real industrial processes. On average:
 *   - 1 in 20 calls generates a setpoint change
 *   - 1 in 50 calls generates a mode change
 *   - 1 in 200 calls generates a start/stop event
 *
 * @param nodeId   - Unique node identifier (1–100)
 * @param plant    - ISA-95 Site ID
 * @param area     - ISA-95 Area ID
 * @param unitName - ISA-95 Work Unit ID
 * @returns Array of event envelopes (may be empty if no events triggered)
 */
export function generateEvents(
    nodeId: number,
    plant: string,
    area: string,
    unitName: string,
): ScadaEventEnvelope[] {
    const timestamp = new Date().toISOString();
    const events: ScadaEventEnvelope[] = [];

    for (const eventType of EVENT_TYPES) {
        if (Math.random() < eventType.probability) {
            let value: number;

            switch (eventType.tag) {
                case 'MODE_CHANGE':
                    value = Math.floor(Math.random() * MODES.length);
                    break;
                case 'SETPOINT_CHANGE':
                    value = Math.round((20 + Math.random() * 80) * 100) / 100;
                    break;
                case 'UNIT_START':
                case 'UNIT_STOP':
                    value = eventType.tag === 'UNIT_START' ? 1 : 0;
                    break;
                case 'MAINTENANCE':
                    value = Math.random() > 0.5 ? 1 : 0; // 1 = enter, 0 = exit
                    break;
                default:
                    value = 0;
            }

            events.push({
                eventId: uuidv4(),
                timestamp,
                asset: { plant, area, unit: unitName },
                tag: eventType.tag,
                value,
                unit: eventType.unit,
                quality: 'GOOD',
                category: 'event',
                nodeId,
            });
        }
    }

    return events;
}
