# SRS Master — Technical Write-Up

## Industrial SCADA Data Aggregation System with Transactional Outbox Pattern

**Version:** 1.0.0  
**Date:** February 2026  
**Stack:** TypeScript · KafkaJS · Prisma v6 · PostgreSQL 16 · Docker (KRaft)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [ISA-95 Alignment](#3-isa-95-alignment)
4. [Component Deep Dive](#4-component-deep-dive)
   - 4.1 [Shared Package (`@srs/shared`)](#41-shared-package-srsshared)
   - 4.2 [Producer Package](#42-producer-package)
   - 4.3 [Transactional Outbox Pattern](#43-transactional-outbox-pattern)
   - 4.4 [Consumer Package](#44-consumer-package)
5. [Kafka Infrastructure](#5-kafka-infrastructure)
6. [Database Architecture](#6-database-architecture)
7. [Data Flow Pipeline](#7-data-flow-pipeline)
8. [Failure Mode Analysis](#8-failure-mode-analysis)
9. [Security Architecture](#9-security-architecture)
10. [Containerization & Deployment](#10-containerization--deployment)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Performance Characteristics](#12-performance-characteristics)
13. [Future Considerations](#13-future-considerations)

---

## 1. Executive Summary

SRS Master is an industrial-grade SCADA data aggregation pipeline designed for 24/7 unattended operation across geographically distributed process control nodes. The system collects telemetry, operational events, and alarms from up to 100 remote SCADA Level-2 nodes and aggregates them into a central PostgreSQL historian via an Apache Kafka backbone.

The defining architectural feature is the **Transactional Outbox Pattern**, which guarantees **at-least-once delivery** of every event from edge nodes to the central historian. This eliminates the dual-write problem that plagues naive Kafka producer implementations: the scenario where business data is committed but the corresponding Kafka publish fails, resulting in permanent data loss.

### Key Properties

| Property | Guarantee |
|---|---|
| Delivery semantics | At-least-once (edge → historian) |
| Deduplication | UUIDv4 primary keys with `ON CONFLICT DO NOTHING` |
| Ordering | Per-tag ordering via deterministic partition keys |
| Crash recovery | Self-healing (stale locks reset every 30s) |
| Horizontal scaling | SKIP LOCKED enables N concurrent dispatchers |
| Data integrity | Zod runtime validation on every consumed message |
| Security | TLS 1.2+ transport, SASL/SCRAM-SHA-512 authentication |

---

## 2. System Architecture

### High-Level Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCADA Level-2 (Edge Nodes)                         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐       ┌──────────────────┐     │
│  │   Producer Node 1 │  │   Producer Node 2 │  ...  │  Producer Node N │     │
│  │  ┌──────────────┐ │  │  ┌──────────────┐ │       │  ┌──────────────┐ │   │
│  │  │  Generators   │ │  │  │  Generators   │ │       │  │  Generators   │ │   │
│  │  │ (Telemetry,   │ │  │  │ (Telemetry,   │ │       │  │ (Telemetry,   │ │   │
│  │  │  Events,      │ │  │  │  Events,      │ │       │  │  Events,      │ │   │
│  │  │  Alarms)      │ │  │  │  Alarms)      │ │       │  │  Alarms)      │ │   │
│  │  └──────┬───────┘ │  │  └──────┬───────┘ │       │  └──────┬───────┘ │   │
│  │         │ write    │  │         │ write    │       │         │ write    │   │
│  │   ┌─────▼──────┐  │  │   ┌─────▼──────┐  │       │   ┌─────▼──────┐  │   │
│  │   │  Local PG   │  │  │   │  Local PG   │  │       │   │  Local PG   │  │   │
│  │   │  (Outbox)   │  │  │   │  (Outbox)   │  │       │   │  (Outbox)   │  │   │
│  │   └─────┬──────┘  │  │   └─────┬──────┘  │       │   └─────┬──────┘  │   │
│  │         │ dispatch │  │         │ dispatch │       │         │ dispatch │   │
│  │   ┌─────▼──────┐  │  │   ┌─────▼──────┐  │       │   ┌─────▼──────┐  │   │
│  │   │ Dispatcher  │  │  │   │ Dispatcher  │  │       │   │ Dispatcher  │  │   │
│  │   └─────┬──────┘  │  │   └─────┬──────┘  │       │   └─────┬──────┘  │   │
│  └─────────┼─────────┘  └─────────┼─────────┘       └─────────┼─────────┘   │
└────────────┼──────────────────────┼─────────────────────────────┼────────────┘
             │                      │                              │
      ═══════╪══════════════════════╪══════════════════════════════╪════════
             │            TLS + SASL/SCRAM-SHA-512                 │
      ═══════╪══════════════════════╪══════════════════════════════╪════════
             │                      │                              │
┌────────────▼──────────────────────▼──────────────────────────────▼────────────┐
│                        Kafka Cluster (KRaft Mode)                             │
│                                                                               │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────────────────────┐    │
│  │  kafka-1     │  │  kafka-2          │  │  kafka-3                      │   │
│  │  (broker +   │  │  (broker +        │  │  (broker +                    │   │
│  │  controller) │  │  controller)      │  │  controller)                  │   │
│  └─────────────┘  └──────────────────┘  └───────────────────────────────┘    │
│                                                                               │
│  Topics (200 partitions each, replication-factor=3):                          │
│    scada.l2.telemetry.flow        (retention: 7 days)                        │
│    scada.l2.telemetry.pressure    (retention: 7 days)                        │
│    scada.l2.telemetry.temperature (retention: 7 days)                        │
│    scada.l2.events                (retention: 30 days)                       │
│    scada.l2.alarms                (retention: 90 days)                       │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │
                                     │ consume (batch mode, manual offsets)
                                     │
┌────────────────────────────────────▼─────────────────────────────────────────┐
│                        SCADA Level-3 (Master Station)                        │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        Consumer (Master Aggregator)                     │  │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │ Kafka     │→│ Zod        │→│ Category      │→│ Prisma          │  │  │
│  │  │ Batch     │  │ Validation │  │ Router        │  │ createMany      │  │  │
│  │  │ Consumer  │  │            │  │ (T / E / A)   │  │ (skipDuplicates)│  │  │
│  │  └──────────┘  └────────────┘  └──────────────┘  └────────┬────────┘  │  │
│  └────────────────────────────────────────────────────────────┼──────────┘  │
│                                                                │             │
│  ┌─────────────────────────────────────────────────────────────▼───────────┐  │
│  │                   PostgreSQL Historian (Central DB)                      │  │
│  │  ┌────────────────┐  ┌───────────────┐  ┌────────────────────────────┐  │  │
│  │  │ telemetry      │  │ events         │  │ alarms                     │  │  │
│  │  │ (event_id PK)  │  │ (event_id PK)  │  │ (event_id PK, severity)   │  │  │
│  │  │ idx: plant+ts  │  │ idx: plant+ts  │  │ idx: plant+ts             │  │  │
│  │  │ idx: tag+ts    │  │ idx: tag+ts    │  │ idx: severity+ts          │  │  │
│  │  │ idx: node+ts   │  │ idx: node+ts   │  │ idx: tag+ts, node+ts      │  │  │
│  │  └────────────────┘  └───────────────┘  └────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Monorepo Layout

```
SRS Master/
├── packages/
│   ├── shared/                 # @srs/shared — types, validation, Kafka config
│   │   └── src/
│   │       ├── types/          # ISA-95 event envelope TypeScript interfaces
│   │       ├── config/         # Kafka topic names, retention, partition strategy
│   │       └── validation/     # Zod runtime validation schemas
│   ├── producer/               # Edge node (Level-2)
│   │   ├── prisma/             # Outbox + LocalTelemetry schema
│   │   └── src/
│   │       ├── kafka/          # KafkaJS client factory + idempotent producer
│   │       ├── generators/     # Telemetry, event, alarm data generators
│   │       ├── outbox/         # OutboxService + OutboxDispatcher + OutboxPruner
│   │       └── db/             # PrismaClient singleton
│   └── consumer/               # Master station (Level-3)
│       ├── prisma/             # Historian DB schema (Telemetry, Event, Alarm)
│       └── src/
│           ├── kafka/          # Batch consumer with manual offset commits
│           └── db/             # HistorianRepository (idempotent inserts)
├── scripts/kafka/              # Topic creation, ACL setup, TLS certs, SCRAM users
├── database/                   # PostgreSQL init scripts
├── docker-compose.yml          # Full orchestration (7 services)
└── .env.example                # Configuration template
```

---

## 3. ISA-95 Alignment

The system strictly follows the ISA-95 (IEC 62264) equipment hierarchy model and the ISA-18.2 alarm management standard.

### Equipment Hierarchy Mapping

| ISA-95 Level | System Concept | Example |
|---|---|---|
| Enterprise | Organization (implicit) | Refinery Corp |
| Site | `plant` field | `PLANT01`, `REFINERY_NORTH` |
| Area | `area` field | `AREA02`, `DISTILLATION` |
| Work Unit | `unit` field | `UNIT_05`, `COMPRESSOR_A` |
| Control Module | `tag` field | `FLOW_RATE`, `PRESSURE` |

### Topic Naming Convention

Topics follow the pattern `<domain>.<isa-level>.<category>.<type>`:

| Topic | ISA-95 Category | Retention | Volume Estimate |
|---|---|---|---|
| `scada.l2.telemetry.flow` | Continuous measurement | 7 days | ~100 msg/s |
| `scada.l2.telemetry.pressure` | Continuous measurement | 7 days | ~100 msg/s |
| `scada.l2.telemetry.temperature` | Continuous measurement | 7 days | ~100 msg/s |
| `scada.l2.events` | Discrete operational | 30 days | ~5 msg/s |
| `scada.l2.alarms` | Process alarm (ISA-18.2) | 90 days | ~2 msg/s |

### Alarm Severity (ISA-18.2)

| Severity | Meaning | Required Response |
|---|---|---|
| `LOW` | Advisory | Awareness only, no action required |
| `MEDIUM` | Abnormal condition | Operator response within shift |
| `HIGH` | Immediate hazard | Operator response within minutes |
| `CRITICAL` | Safety boundary | Emergency shutdown sequence trigger |

---

## 4. Component Deep Dive

### 4.1 Shared Package (`@srs/shared`)

The shared package defines the contracts between producer and consumer. It is the single source of truth for message schemas, topic routing, and validation rules.

#### Event Envelope (`types/envelope.ts`)

Every message flowing through the system is wrapped in a `ScadaEventEnvelope`:

```typescript
interface ScadaEventEnvelope {
    readonly eventId: string;       // UUIDv4 — global deduplication key
    readonly timestamp: string;     // ISO-8601 UTC — sensor measurement time
    readonly asset: AssetIdentifier; // ISA-95 hierarchy: plant.area.unit
    readonly tag: string;           // Process variable: FLOW_RATE, PRESSURE, etc.
    readonly value: number;         // IEEE 754 double precision
    readonly unit: string;          // Engineering unit: m3/h, bar, °C
    readonly quality: QualityCode;  // OPC-UA inspired: GOOD | BAD | UNCERTAIN | OOR
    readonly category: EventCategory; // Kafka routing: telemetry | event | alarm
    readonly nodeId: number;        // Originating node (1–1000)
}
```

**Design rationale:**
- `eventId` is UUIDv4 and serves as the PostgreSQL primary key. Combined with `skipDuplicates`, this provides end-to-end idempotency.
- `timestamp` captures sensor measurement time, not receipt time. This is critical for time-series integrity.
- `quality` follows OPC-UA quality codes. `OOR` (Out-of-Range) is triggered when values exceed physical sensor limits.
- All fields are `readonly` to prevent accidental mutation in downstream processing.

#### Partition Key Builder (`config/kafka.ts`)

```typescript
function buildMessageKey(plant, area, unit, tag): string {
    return `${plant}.${area}.${unit}.${tag}`;
    // Example: "PLANT01.AREA02.UNIT_05.FLOW_RATE"
}
```

This deterministic key ensures all measurements for the same tag from the same asset arrive at the same Kafka partition. This provides:

1. **Ordered processing** per tag — critical for control systems where event order matters
2. **Key-based compaction** readiness if future requirements demand it
3. **Consistent routing** regardless of which broker handles the request

#### Runtime Validation (`validation/schema.ts`)

Zod schemas validate every field with tight constraints:

| Field | Validation Rules |
|---|---|
| `eventId` | Must be UUIDv4 |
| `timestamp` | Must be ISO-8601 UTC |
| `plant`, `area`, `unit` | 1–64 chars, uppercase alphanumeric + underscores |
| `tag` | 1–128 chars, uppercase alphanumeric + underscores |
| `value` | Must be finite (`NaN`/`Infinity` rejected) |
| `quality` | Enum: `GOOD`, `BAD`, `UNCERTAIN`, `OOR` |
| `nodeId` | Integer, 1–1000 |

**Why runtime validation in a typed language?**
- Kafka is a "dumb pipe" — it does not validate message content
- Producers may have bugs, be compromised, or run different schema versions
- In SCADA systems, bad data in the historian can corrupt analytics and control decisions
- The cost of validation (~µs/message) is negligible vs the cost of corrupt data

#### Producer Defaults

```typescript
const PRODUCER_DEFAULTS = {
    ACKS: -1,                    // Wait for ALL in-sync replicas
    IDEMPOTENT: true,            // Prevent duplicate messages on retry
    MAX_RETRIES: 10,             // Maximum retries before giving up
    INITIAL_RETRY_TIME: 300,     // 300ms initial backoff
    MAX_IN_FLIGHT_REQUESTS: 1,   // Required for ordering with idempotent
};
```

Setting `acks=-1` ensures that a message is only considered "delivered" when all in-sync replicas have written it. Combined with `idempotent: true`, this provides exactly-once semantics within the Kafka producer → broker boundary.

---

### 4.2 Producer Package

Each producer simulates a SCADA Level-2 remote node with three classes of data generators.

#### Telemetry Generator (`generators/telemetry.ts`)

Generates realistic continuous process measurements using **Gaussian random walks** (Box-Muller transform):

| Tag | Setpoint | Physical Range | Noise Amplitude | Unit |
|---|---|---|---|---|
| `FLOW_RATE` | 50 | 0–120 | ±5 | m³/h |
| `PRESSURE` | 12 | 0–30 | ±1.5 | bar |
| `TEMPERATURE` | 180 | -20–400 | ±8 | °C |

Each generator cycle:
1. Calculates mean-reversion drift toward setpoint: `drift = (setpoint - current) * 0.1`
2. Adds Gaussian noise: `noise = gaussianRandom() * amplitude`
3. Clamps to slightly wider range to allow OOR detection
4. Assesses quality based on proximity to physical limits (5% margin → UNCERTAIN, beyond limits → OOR)

This produces realistic sensor behavior: gradual drift around setpoints with occasional disturbances.

#### Event Generator (`generators/events.ts`)

Generates discrete operational events with stochastic occurrence:

| Event Type | Probability/Cycle | Approx. Frequency |
|---|---|---|
| `SETPOINT_CHANGE` | 0.05 | Every ~20s |
| `MODE_CHANGE` | 0.02 | Every ~50s |
| `UNIT_START` | 0.005 | Every ~200s |
| `UNIT_STOP` | 0.005 | Every ~200s |
| `MAINTENANCE` | 0.002 | Every ~500s |

#### Alarm Generator (`generators/alarms.ts`)

Follows ISA-18.2 alarm management with severity-appropriate occurrence rates:

| Alarm | Severity | Probability | Threshold |
|---|---|---|---|
| `HIGH_FLOW` | MEDIUM | 0.008 | 95 m³/h |
| `LOW_PRESSURE` | HIGH | 0.005 | 2 bar |
| `HIGH_TEMP` | HIGH | 0.004 | 320 °C |
| `CRITICAL_TEMP` | CRITICAL | 0.001 | 380 °C |
| `VIBRATION_HIGH` | MEDIUM | 0.006 | 7.1 mm/s |
| `INSTRUMENT_FAULT` | LOW | 0.003 | 1 (fault) |

CRITICAL alarms are deliberately rare (~1 per 1000 cycles) to reflect real plant conditions.

#### Kafka Client (`kafka/client.ts`)

The Kafka client factory creates instances with:

- **TLS**: Reads CA, client cert, and key from file paths specified via env vars
- **SASL/SCRAM-SHA-512**: Challenge-response authentication
- **Connection resilience**: 10 retries with exponential backoff (300ms → 30s)
- **Log integration**: KafkaJS log levels mapped to `pino` for unified logging

#### Kafka Producer (`kafka/producer.ts`)

Wraps KafkaJS with two publish methods:

1. **`publish(envelope)`** — The standard path. Resolves topic from category/tag, builds partition key, serializes, and sends with `acks=-1`.
2. **`publishRaw(topic, key, payload, headers)`** — Used by the outbox dispatcher. Publishes pre-serialized payloads with custom headers. Does not perform envelope processing since the outbox service already did this during the write phase.

Both methods block until broker acknowledgment. **Fire-and-forget is explicitly forbidden** — in an industrial system, a dropped message could mean a missed alarm.

#### Main Loop (`index.ts`)

The producer's main loop runs on a configurable interval (default: 1000ms):

```
Every 1 second:
  1. Generate telemetry (3 tags × 1 sample = 3 events)
  2. Generate events (0–N per cycle, stochastic)
  3. Generate alarms (0–N per cycle, stochastic)
  4. Write ALL events to outbox (atomic batch insert)
  5. Every N cycles: log outbox metrics, check thresholds
```

The main loop **never touches Kafka directly**. All events flow through the outbox.

**Background services started alongside the main loop:**
- **OutboxDispatcher** — Publishes PENDING outbox events to Kafka (see §4.3.2)
- **OutboxPruner** — Deletes old SENT events and local telemetry (see §4.3.3)

---

### 4.3 Transactional Outbox Pattern

This is the architectural core of the system. The outbox pattern solves the **dual-write problem** — the impossible challenge of atomically updating a database and publishing to a message broker in a single operation.

#### The Problem (Without Outbox)

```
1. Generate SCADA event
2. Write to local database         → SUCCEEDS
3. Publish to Kafka                → FAILS (network partition)
Result: Database updated, but event lost FOREVER
```

In an industrial context, this lost event might be:
- A HIGH_TEMP alarm that should trigger an operator response
- A CRITICAL_TEMP alarm that should trigger emergency shutdown
- Regulatory-required telemetry data for compliance audits

#### The Solution (With Outbox)

```
1. Generate SCADA event
2. Write event AND outbox row       → SAME TRANSACTION (atomic)
3. Dispatcher reads outbox          → SKIP LOCKED (concurrent-safe)
4. Dispatcher publishes to Kafka    → Waits for broker ACK
5. On ACK: Mark SENT               → Event lifecycle complete
6. On failure: Retry with backoff   → Exponential (5s → 1h cap)
7. After MAX_RETRIES: Mark FAILED   → Poison message, needs manual review
```

**Failure guarantees:**

| Failure Scenario | Outcome | Data Lost? |
|---|---|---|
| Crash before DB commit | No DB change, no event | No |
| Crash after DB commit, before dispatch | Event safely in outbox, dispatcher picks up | No |
| Kafka unavailable | Event waits in outbox, retries with backoff | No |
| Dispatcher crash mid-publish | Stale lock detected, event returned to PENDING | No |
| Permanent Kafka failure | Event marked FAILED after MAX_RETRIES (manual intervention) | No* |

*\*Poison messages remain in the database for manual recovery.*

#### 4.3.1 OutboxService (`outbox/service.ts`)

The `OutboxService` is the **only allowed entry point** for creating outgoing events. It enforces the rule:

> Business state changes and outbox inserts MUST be in the SAME transaction.

Three write methods are provided:

**`writeEvent(envelope)`** — Single event write:
```
INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type,
                           payload, headers, status, retry_count, available_at)
VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'PENDING', 0, NOW())
```

**`writeBatch(envelopes[])`** — Batch write using `createMany`:
```
INSERT INTO outbox_events (...) VALUES (...), (...), (...), ...
ON CONFLICT DO NOTHING (skipDuplicates)
```

**`writeEventWithLocalCache(envelope)`** — Atomic dual write:
```
BEGIN;
  INSERT INTO outbox_events (...) VALUES (...);    -- For Kafka delivery
  INSERT INTO local_telemetry (...) VALUES (...);  -- For local access
COMMIT;
```

Each outbox record stores:

| Field | Purpose |
|---|---|
| `payload` (JSONB) | Exact Kafka message body — immutable after creation |
| `headers` (JSONB) | `correlationId`, `traceId`, `schemaVersion`, `topic`, `partitionKey`, `sourceTimestamp` |
| `aggregateId` | `{plant}.{area}.{unit}.{tag}` — used for per-aggregate ordering |
| `status` | Lifecycle: `PENDING` → `IN_PROGRESS` → `SENT` / `FAILED` |
| `availableAt` | Earliest dispatch eligibility (set to future for backoff) |

#### 4.3.2 OutboxDispatcher (`outbox/dispatcher.ts`)

The dispatcher is a **stateless, restart-safe loop** that runs independently from the main event generation loop.

**Configuration (environment-tunable):**

| Parameter | Default | Purpose |
|---|---|---|
| `OUTBOX_BATCH_SIZE` | 50 | Events per dispatch cycle |
| `OUTBOX_POLL_INTERVAL_MS` | 500 | Milliseconds between cycles |
| `OUTBOX_MAX_RETRIES` | 10 | Retries before FAILED status |
| `OUTBOX_LOCK_TIMEOUT_SECONDS` | 120 | Stale lock threshold |
| `OUTBOX_RECOVERY_INTERVAL_MS` | 30000 | Crash recovery check interval |

**Dispatch cycle (hot path — every 500ms):**

```sql
-- Step 1: Select and lock pending events
SELECT * FROM outbox_events
WHERE status = 'PENDING' AND available_at <= NOW()
ORDER BY created_at
LIMIT 50
FOR UPDATE SKIP LOCKED;

-- Step 2: Mark as in-progress (with lock ownership)
UPDATE outbox_events
SET status = 'IN_PROGRESS', locked_by = 'dispatcher-a1b2c3d4', locked_at = NOW()
WHERE id IN ($1, $2, ...);

-- Step 3: For each event, publish to Kafka and mark result
-- On success:
UPDATE outbox_events SET status = 'SENT', sent_at = NOW(), locked_by = NULL WHERE id = $1;
-- On failure:
UPDATE outbox_events SET status = 'PENDING', retry_count = retry_count + 1,
                         available_at = NOW() + backoff, locked_by = NULL WHERE id = $1;
```

**Why `FOR UPDATE SKIP LOCKED`?**

This PostgreSQL feature is critical for horizontal scalability:
- Multiple dispatcher instances can run concurrently
- Each dispatcher locks a **disjoint set** of events
- No double-publishing, no lock contention, no coordinator required
- If a dispatcher crashes, its locks expire and events are re-dispatched

**Exponential Backoff Schedule:**

| Retry | Delay | Cumulative Wait |
|---|---|---|
| 1 | 5 seconds | 5s |
| 2 | 30 seconds | 35s |
| 3 | 2 minutes | 2m 35s |
| 4 | 10 minutes | 12m 35s |
| 5 | 30 minutes | 42m 35s |
| 6+ | 1 hour (cap) | ~1h 42m 35s |

This schedule avoids hammering a recovering Kafka cluster while ensuring timely retry for transient failures.

**Crash Recovery (every 30 seconds):**

```sql
-- Find events locked by crashed dispatchers
UPDATE outbox_events
SET status = 'PENDING', locked_by = NULL, locked_at = NULL
WHERE status = 'IN_PROGRESS'
  AND locked_at < NOW() - INTERVAL '120 seconds';
```

If a dispatcher crashes after locking events but before publishing them, those events would be stuck in `IN_PROGRESS` forever. The recovery loop detects locks older than 120 seconds and resets them to `PENDING`, making the system **self-healing**.

**Poison Message Handling:**

After `MAX_RETRIES` (default: 10) failed publish attempts, an event is marked `FAILED`:

```
PENDING → IN_PROGRESS → [publish fails] → PENDING (retry 1)
                                         → PENDING (retry 2)
                                         → ...
                                         → PENDING (retry 10)
                                         → FAILED (poison message)
```

Failed events:
- Are excluded from the dispatch query (status ≠ `PENDING`)
- Do not block the processing of newer events
- Generate `logger.error` alerts for operator investigation
- Remain in the database for manual recovery or forensics

**Outbox Event Status Lifecycle:**

```
                  ┌──────────────────────────────────────────┐
                  │                                          │
                  ▼                                          │
 ┌─────────┐  dispatch  ┌──────────────┐  Kafka ACK  ┌──────┴──┐
 │ PENDING │──────────→│ IN_PROGRESS  │────────────→│  SENT   │
 └────┬────┘            └──────┬───────┘              └────┬────┘
      │                        │                           │
      │    retry < MAX         │  publish fails   pruner   │ (after N days)
      │◄───────────────────────┘                           │
      │  (retry_count++,                                   ▼
      │   available_at += backoff)                    ┌──────────┐
      │                                               │ DELETED  │
      │    retry >= MAX                               │ (pruned) │
      │                                               └──────────┘
      ▼
 ┌────────┐
 │ FAILED │  (poison message — manual intervention)
 └────────┘
```

#### 4.3.3 OutboxPruner (`outbox/pruner.ts`)

The pruner is a **background maintenance service** that prevents the local outbox database from growing indefinitely. It runs as a periodic task alongside the dispatcher.

**Problem:** Without pruning, the `outbox_events` table grows forever. On a node producing ~11,000 events/hour, the table would accumulate ~264,000 rows/day. After 30 days, that's ~8 million rows of SENT events that have already been successfully published to Kafka and are no longer needed.

**What it deletes:**

| Table | Condition | Rationale |
|---|---|---|
| `outbox_events` | `status = 'SENT'` AND `sent_at < cutoff` | Successfully published — safe to remove |
| `local_telemetry` | `timestamp < cutoff` | Old cached readings — central historian has them |

**Data safety:** Only `SENT` events are pruned. Events with status `PENDING`, `IN_PROGRESS`, or `FAILED` are **never touched**, ensuring no data loss.

**Configuration (environment-tunable):**

| Parameter | Default | Purpose |
|---|---|---|
| `STORAGE_RETENTION_DAYS` | 30 | Days to keep SENT events and local telemetry |
| `PRUNE_INTERVAL_MS` | 3600000 (1h) | How often the pruning task runs |

**Lifecycle:**

1. **Startup:** Starts with the producer. Runs an initial prune after a 5-second delay (avoids contention with startup migrations).
2. **Steady state:** Runs every `PRUNE_INTERVAL_MS` milliseconds. Each cycle calculates a cutoff date (`NOW() - RETENTION_DAYS`) and deletes eligible rows.
3. **Shutdown:** Gracefully stopped during `SIGTERM`/`SIGINT` handling, before the dispatcher and Kafka producer.

**Pruning query (per cycle):**

```sql
-- 1. Remove successfully dispatched outbox events
DELETE FROM outbox_events
WHERE status = 'SENT' AND sent_at < NOW() - INTERVAL '30 days';

-- 2. Remove old local telemetry cache
DELETE FROM local_telemetry
WHERE timestamp < NOW() - INTERVAL '30 days';
```

**Logging:** Each pruning cycle logs the count of deleted records at `info` level. Zero-deletion cycles log at `debug` level to avoid log noise.

---

### 4.4 Consumer Package

#### Batch Consumer (`kafka/consumer.ts`)

The consumer uses **batch mode** (`eachBatch`) instead of per-message processing:

| Design Choice | Rationale |
|---|---|
| `autoCommit: false` | Offsets committed only after DB write succeeds |
| `eachBatch` mode | Enables bulk database inserts (10-50x faster) |
| `fromBeginning: false` | New consumers start at latest offset |
| `sessionTimeout: 30s` | Time before broker considers consumer dead |
| `heartbeatInterval: 3s` | 10x faster than session timeout |

**Processing pipeline per batch:**

```
1. Receive batch of Kafka messages
2. Deserialize JSON payloads
3. Validate each message against Zod schema
4. Collect valid events (skip invalid → log warning, not fatal)
5. Route to HistorianRepository.insertAll()
6. On success: resolveOffset() → commitOffsetsIfNecessary()
7. On failure: throw error → messages replayed on next poll
8. heartbeat() → keep session alive
```

**Invalid message handling:**

Invalid messages are logged and skipped, not re-queued. In production, these would be routed to a dead-letter topic (DLQ). The rationale: a malformed message will always be malformed, and re-processing it would create an infinite loop.

#### Historian Repository (`db/repository.ts`)

The repository implements **idempotent batch inserts** using Prisma's `createMany({ skipDuplicates: true })`, which translates to:

```sql
INSERT INTO telemetry (event_id, timestamp, plant, area, ...)
VALUES ($1, $2, $3, $4, ...), ($5, $6, $7, $8, ...), ...
ON CONFLICT (event_id) DO NOTHING;
```

Why `DO NOTHING` instead of `DO UPDATE`?

- Telemetry values are **immutable facts** — a temperature reading at time T should never be overwritten
- `DO NOTHING` is cheaper than `DO UPDATE` (no row lock, no WAL write for duplicates)
- Combined with Kafka's at-least-once delivery, this prevents duplicate persistence

The `insertAll()` method routes events to three tables in parallel:

```typescript
const [telemetryCount, eventCount, alarmCount] = await Promise.all([
    this.insertTelemetry(events),
    this.insertEvents(events),
    this.insertAlarms(events),
]);
```

---

## 5. Kafka Infrastructure

### Cluster Configuration

| Parameter | Value | Rationale |
|---|---|---|
| Mode | KRaft (no ZooKeeper) | Simplified operations, faster leader election |
| Brokers | 3 | Minimum for `replication-factor=3` with fault tolerance |
| Controller quorum | All 3 brokers | Raft consensus for metadata management |
| `min.insync.replicas` | 2 | Tolerates 1 broker failure with `acks=all` |

### Topic Configuration

| Topic | Partitions | Replication | Retention | Segment |
|---|---|---|---|---|
| `scada.l2.telemetry.*` | 200 | 3 | 7 days | 1 hour |
| `scada.l2.events` | 200 | 3 | 30 days | 6 hours |
| `scada.l2.alarms` | 200 | 3 | 90 days | 12 hours |

**200 partitions** — rationale:
- 100 nodes producing in parallel
- Consumer parallelism bounded by partition count
- Over-partitioning safer than under-partitioning with KRaft
- Each tag gets a deterministic partition via consistent hashing on the message key

### Partition Key Strategy

```
Key = "{plant}.{area}.{unit}.{tag}"
Partition = murmur2(key) % 200
```

This guarantees that all `FLOW_RATE` readings from `PLANT01.AREA02.UNIT_05` always land on the same partition, preserving per-tag ordering.

---

## 6. Database Architecture

### Producer Local Database (Per-Node PostgreSQL)

**Purpose:** Transactional outbox storage for the node-local outbox pattern.

**Database:** `scada_outbox` | **User:** `producer` | **Port:** 5433

| Table | Purpose | Row Lifecycle |
|---|---|---|
| `outbox_events` | Pending Kafka publications | PENDING → IN_PROGRESS → SENT / FAILED → (pruned after N days) |
| `local_telemetry` | Local telemetry cache | Insert-only → (pruned after N days) |

**Outbox indexes (optimized for dispatcher queries):**

| Index | Columns | Purpose |
|---|---|---|
| `idx_outbox_status_available` | `(status, available_at)` | Hot path: fetch PENDING events ready for dispatch |
| `idx_outbox_status_locked` | `(status, locked_at)` | Crash recovery: find stale IN_PROGRESS events |
| `idx_outbox_aggregate_order` | `(aggregate_id, created_at)` | Per-aggregate ordering guarantee |
| `idx_outbox_created` | `(created_at)` | Monitoring: age of oldest pending event |

### Central Historian Database (Shared PostgreSQL)

**Purpose:** Long-term storage for all SCADA data from all nodes.

**Database:** `scada_historian` | **User:** `scada` | **Port:** 5432

| Table | Volume | PK | Critical Indexes |
|---|---|---|---|
| `telemetry` | ~300 rows/s (across 100 nodes) | `event_id` (UUID) | `(plant, timestamp)`, `(tag, timestamp)`, `(node_id, timestamp)` |
| `events` | ~5 rows/s | `event_id` (UUID) | `(plant, timestamp)`, `(tag, timestamp)`, `(node_id, timestamp)` |
| `alarms` | ~2 rows/s | `event_id` (UUID) | `(plant, timestamp)`, `(severity, timestamp)`, `(tag, timestamp)`, `(node_id, timestamp)` |

**Column types:**

| Column | PostgreSQL Type | Rationale |
|---|---|---|
| `event_id` | `UUID` | Natural deduplication key, globally unique |
| `timestamp` | `TIMESTAMPTZ` | Timezone-aware, preserves measurement time |
| `value` | `DOUBLE PRECISION` | Full IEEE 754 range for scientific data |
| `plant`, `area`, `tag` | `VARCHAR(64–128)` | Bounded strings matching Zod validation |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | Server-side audit timestamp |

---

## 7. Data Flow Pipeline

### End-to-End Sequence (Happy Path)

```
Time  Component            Action
──────────────────────────────────────────────────────────────────────────
t₀    Generator            Generate FLOW_RATE=52.34 m³/h (UUIDv4: abc-123)
t₁    OutboxService        BEGIN TX
                             INSERT INTO outbox_events (id='abc-123', status='PENDING', payload={...})
                           COMMIT
t₂    OutboxDispatcher     SELECT ... WHERE status='PENDING' FOR UPDATE SKIP LOCKED
                           Lock row abc-123 (status → IN_PROGRESS)
t₃    ScadaProducer        kafka.send({topic: 'scada.l2.telemetry.flow', key: 'PLANT01.AREA02.UNIT_05.FLOW_RATE', value: {...}})
                           Wait for acks=all from kafka-1, kafka-2, kafka-3
t₄    KafkaCluster         Write to partition 42, replicate to ISR
                           Return ACK to producer
t₅    OutboxDispatcher     UPDATE outbox_events SET status='SENT', sent_at=NOW() WHERE id='abc-123'
t₆    ScadaConsumer        consume() → receive batch including abc-123
t₇    Zod Validation       ScadaEventEnvelopeSchema.safeParse(message) → success
t₈    HistorianRepository  INSERT INTO telemetry (...) VALUES (...) ON CONFLICT (event_id) DO NOTHING
t₉    Consumer             resolveOffset() → commitOffsetsIfNecessary()
```

### Failure Recovery Sequence

```
Time  Component            Action
──────────────────────────────────────────────────────────────────────────
t₀    OutboxDispatcher     Lock event abc-456, status → IN_PROGRESS
t₁    ScadaProducer        kafka.send() → THROWS (Kafka broker unreachable)
t₂    OutboxDispatcher     Catch error:
                             retry_count = 0 + 1 = 1
                             backoff = BACKOFF_SCHEDULE[1] = 30_000ms
                             available_at = NOW() + 30s
                             status → PENDING, locked_by → NULL
t₃    [30 seconds pass]
t₄    OutboxDispatcher     SELECT ... WHERE status='PENDING' AND available_at <= NOW()
                           abc-456 is now eligible for dispatch again
t₅    ScadaProducer        kafka.send() → SUCCESS (Kafka recovered)
t₆    OutboxDispatcher     status → SENT
```

### Crash Recovery Sequence

```
Time  Component            Action
──────────────────────────────────────────────────────────────────────────
t₀    Dispatcher-A         Lock events [e1, e2, e3] → IN_PROGRESS
t₁    Dispatcher-A         CRASH (process killed, OOM, power failure)
                           Events e1, e2, e3 are stuck in IN_PROGRESS
t₂    [30 seconds later]
t₃    Recovery Loop        SELECT ... WHERE status='IN_PROGRESS' AND locked_at < NOW() - 120s
                           → No results yet (only 30s elapsed)
t₄    [120 seconds later, total elapsed: 150s]
t₅    Recovery Loop        SELECT ... → Finds e1, e2, e3 (locked 150s ago, threshold 120s)
                           UPDATE SET status='PENDING', locked_by=NULL, locked_at=NULL
t₆    Dispatcher-B         SELECT ... FOR UPDATE SKIP LOCKED
                           → Picks up e1, e2, e3 (or any active dispatcher)
                           → Publishes to Kafka → marks SENT
```

---

## 8. Failure Mode Analysis

### Failure Matrix

| Failure | Outbox Write Impact | Kafka Publish Impact | Consumer Impact | Data at Risk? |
|---|---|---|---|---|
| **Producer crash** | Uncommitted TX rolled back | N/A | N/A | No — atomic write |
| **Producer-PG down** | Writes fail, events buffered in memory (next cycle) | N/A | N/A | No — retry on next cycle |
| **Network partition (producer → Kafka)** | Outbox accumulates PENDING events | Dispatcher retries with backoff | Consumer unaffected | No — outbox persists |
| **Kafka broker failure (1 of 3)** | No impact | Continues with remaining ISR | `min.insync.replicas=2` maintained | No |
| **Kafka cluster total failure** | No impact | Backoff up to 1h cap, poison after 10 retries | Consumer disconnected | No* |
| **Dispatcher crash** | No impact | Stale locks recovered after 120s | N/A | No — self-healing |
| **Consumer crash** | No impact | No impact | Uncommitted offsets → message replay | No — idempotent inserts |
| **Central historian PG down** | No impact | No impact | Consumer throws, offsets not committed | No — replay |
| **Duplicate messages (at-least-once)** | N/A | N/A | `ON CONFLICT DO NOTHING` | No — deduplicated |

*\*Events reaching MAX_RETRIES are marked FAILED, not lost. They remain in the outbox for manual recovery.*

### Disaster Recovery

| Scenario | Recovery Procedure |
|---|---|
| Total producer node loss | Outbox events were either SENT (safe) or lost with the node's local PG. Mitigate with PG replication or persistent volumes. |
| Kafka cluster total loss | Outbox continues accumulating PENDING events. When Kafka returns, dispatcher resumes from the oldest pending event. |
| Consumer data loss | Reset consumer group offsets to earliest. Replay all retained messages (7–90 days). Idempotent inserts handle duplicates. |
| Historian corrupted | Restore from PG backup. Consumer offset reset replays unbackupped messages. |

---

## 9. Security Architecture

### Transport Security

| Layer | Protocol | Configuration |
|---|---|---|
| Producer → Kafka | TLS 1.2+ | Mutual TLS (CA + client cert + key) |
| Kafka inter-broker | TLS 1.2+ | Broker-to-broker encryption |
| Producer → Local PG | Localhost (same container network) | No TLS needed |
| Consumer → Historian PG | Docker internal network | TLS optional (configurable) |

### Authentication & Authorization

| Component | Mechanism | Details |
|---|---|---|
| Kafka clients | SASL/SCRAM-SHA-512 | Challenge-response, password never sent in plaintext |
| Kafka ACLs | Per-topic least privilege | Producer: WRITE only. Consumer: READ + GROUP only. |
| PostgreSQL (historian) | Password auth | Credentials via env vars, no hardcoded secrets |
| PostgreSQL (outbox) | Password auth | Credentials via env vars, isolated per node |

### Container Security

- All containers run as **non-root users** (`scada` user in producer/consumer)
- No shell access in production images (Alpine-based)
- Secrets managed via environment variables and `.env` files (not committed to VCS)
- Docker internal network (`scada-network`) isolates all inter-service communication

---

## 10. Containerization & Deployment

### Docker Compose Services (7 total)

| Service | Image | Port | Purpose |
|---|---|---|---|
| `kafka-1` | `apache/kafka:4.0.0` | 9092 | Broker + KRaft controller |
| `kafka-2` | `apache/kafka:4.0.0` | 9093 | Broker + KRaft controller |
| `kafka-3` | `apache/kafka:4.0.0` | 9094 | Broker + KRaft controller |
| `kafka-init` | `apache/kafka:4.0.0` | — | Topic creation, ACLs (one-shot) |
| `producer` | Custom (multi-stage) | — | Edge node simulation + outbox |
| `producer-postgres` | `postgres:16-alpine` | 5433 | Outbox storage (per-node) |
| `consumer` | Custom (multi-stage) | — | Master aggregator + historian |
| `postgres` | `postgres:16-alpine` | 5432 | Central historian database |

### Dependency Graph

```
kafka-1 ─┐
kafka-2 ──┼── kafka-init ── producer ── producer-postgres
kafka-3 ─┘              └── consumer ── postgres
```

### Producer Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Dependencies (cached layer)
FROM node:20-alpine AS deps
# Install prod dependencies + Prisma client

# Stage 2: Build (TypeScript compilation)
FROM node:20-alpine AS build
# Compile shared + producer packages
# Generate Prisma client

# Stage 3: Runtime (minimal image)
FROM node:20-alpine AS runtime
# OpenSSL for Prisma query engine
# Non-root user (scada)
# Copy built artifacts, Prisma schema/migrations
# Entrypoint: migrations → app start
```

### Startup Sequence

```
docker-entrypoint.sh:
  1. cd /app/packages/producer
  2. npx prisma migrate deploy     ← Apply outbox schema to local PG
  3. node dist/index.js            ← Start producer application
```

The `prisma migrate deploy` command runs in production mode (no interactive prompts, applies pending migrations only). This ensures the `outbox_events` and `local_telemetry` tables exist before the application starts.

---

## 11. Monitoring & Observability

### Outbox Metrics

The dispatcher exposes structured metrics via `getMetrics()`:

```typescript
interface OutboxMetrics {
    pendingCount: number;      // Events awaiting dispatch
    inProgressCount: number;   // Events currently being published
    failedCount: number;       // Poison messages (require manual intervention)
    sentCount: number;         // Successfully delivered events
    oldestPendingAgeMs: number; // Age of oldest pending event
    instanceId: string;        // Dispatcher instance identifier
}
```

### Alert Thresholds

| Metric | Warning | Critical | Interpretation |
|---|---|---|---|
| `pendingCount` | > 100 | > 1000 | Dispatcher falling behind (Kafka may be slow/down) |
| `oldestPendingAgeMs` | > 30s | > 5m | Events stuck — possible Kafka partition issue |
| `failedCount` | > 0 | > 10 | Poison messages — investigate payload/schema |
| `inProgressCount` | > batch_size for > 2m | — | Possible stuck dispatcher |

### Logging Architecture

All components use **pino** (structured JSON logging):

```json
{
  "level": 30,
  "time": 1709078400000,
  "name": "outbox-dispatcher",
  "msg": "Outbox event published successfully",
  "eventId": "abc-123",
  "topic": "scada.l2.telemetry.flow",
  "aggregateId": "PLANT01.AREA02.UNIT_05.FLOW_RATE"
}
```

Named loggers per component: `kafka-client`, `scada-producer`, `outbox-service`, `outbox-dispatcher`, `scada-consumer`, `historian-repository`.

---

## 12. Performance Characteristics

### Expected Throughput (per node)

| Data Type | Rate | Events/Hour | Events/Day |
|---|---|---|---|
| Telemetry | 3 tags × 1 Hz | 10,800 | 259,200 |
| Events | ~0.082/s (stochastic) | ~295 | ~7,085 |
| Alarms | ~0.027/s (stochastic) | ~97 | ~2,333 |
| **Total per node** | **~3.1/s** | **~11,192** | **~268,618** |

### At 100 Nodes

| Metric | Value |
|---|---|
| Total throughput | ~310 events/s |
| Kafka messages/s | ~310 |
| Historian inserts/s | ~310 (batched into ~6 bulk inserts/s) |
| Outbox write latency | < 5ms (local PG, write-ahead log only) |
| Outbox dispatch latency | < 50ms (Kafka acks=all, 3 replicas) |
| End-to-end latency (sensor → historian) | < 2 seconds typical |

### Bottleneck Analysis

| Component | Bottleneck | Mitigation |
|---|---|---|
| Producer local PG | WAL write throughput | SSD recommended, batch inserts |
| Kafka broker | Disk I/O for replication | SSD, tune `log.flush.interval.messages` |
| Consumer PG (historian) | Bulk insert throughput | `createMany` batch inserts, connection pooling |
| Outbox dispatcher | Kafka round-trip per event | Increase `BATCH_SIZE`, future: async batching |

---

## 13. Future Considerations

### Short-Term

1. **Multi-node Docker Compose**: Deploy N producer instances (`producer-1`, `producer-2`, ...) each with their own `producer-postgres` instance and unique `NODE_ID`.
2. **Dead Letter Queue (DLQ)**: Route invalid consumer messages to a `scada.l2.dlq` topic instead of logging and skipping.
3. **Prometheus/Grafana integration**: Export outbox metrics as Prometheus counters/gauges for dashboard visualization and PagerDuty alerting.

### Medium-Term

4. ~~**Outbox cleanup job**~~: ✅ **Implemented** — The `OutboxPruner` (§4.3.3) automatically deletes SENT events and old local telemetry older than `STORAGE_RETENTION_DAYS` (default: 30 days). Runs every `PRUNE_INTERVAL_MS` (default: 1 hour).
5. **Batch Kafka publishing**: Modify the dispatcher to send multiple messages in a single `producer.send()` call, reducing Kafka round-trips by up to 50x.
6. **TimescaleDB migration**: Convert historian tables to TimescaleDB hypertables for native time-series compression and continuous aggregates.

### Long-Term

7. **Schema Registry**: Introduce Confluent Schema Registry or Buf Schema Registry for message schema evolution and backward compatibility enforcement.
8. **Exactly-once semantics**: Leverage Kafka transactions (`initTransactions`, `beginTransaction`, `commitTransaction`) for end-to-end exactly-once processing, eliminating the need for consumer-side deduplication.
9. **Edge computing**: Extend the producer with local analytics (moving averages, anomaly detection) before Kafka publication, reducing central processing load.
10. **Multi-site federation**: Multiple historian instances with cross-site Kafka replication (MirrorMaker 2) for geographically distributed SCADA systems.

---

*This document describes the SRS Master system as implemented. All design decisions prioritize data integrity and operational reliability over raw performance, consistent with industrial SCADA requirements where a missed alarm can have physical safety implications.*
