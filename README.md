# SRS Master — Industrial SCADA Distributed Data Aggregation System

> Production-grade distributed data aggregation system for industrial environments.  
> 100 remote Node.js servers publish telemetry, events, and alarms through Apache Kafka  
> to a central PostgreSQL historian database via **Prisma v6 ORM**.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [ISA-95 Layer Mapping](#isa-95-layer-mapping)
3. [Project Structure](#project-structure)
4. [Component Details](#component-details)
   - [Shared Package](#1-shared-package-packagesshardsrc)
   - [Producer (Remote Nodes)](#2-producer-packagesproducersrc)
   - [**Outbox Pattern (Industrial-Grade)**](#outbox-pattern-industrial-grade)
   - [Consumer (Master Station)](#3-consumer-packagesconsumersrc)
   - [Prisma v6 Schemas](#4-prisma-v6-schemas)
   - [Kafka Infrastructure](#5-kafka-infrastructure-kafka)
   - [PostgreSQL Database](#6-postgresql-database-database)
   - [Docker Deployment](#7-docker-deployment)
5. [Security Architecture](#security-architecture)
6. [Kafka Topic Design](#kafka-topic-design)
7. [Data Flow Pipeline (with Outbox)](#data-flow-pipeline-with-outbox)
8. [Setup & Deployment](#setup--deployment)
9. [Operations Guide](#operations-guide)
10. [Scaling Guide](#scaling-guide)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  ISA-95 Level 2 — Remote SCADA Nodes (×100)                       │
│                                                                     │
│  Each node runs independently with its own PostgreSQL database.    │
│  Nodes generate telemetry readings, operational events, and alarms │
│  which are wrapped in a standard event envelope and published to   │
│  Kafka using the idempotent producer pattern.                       │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       ┌──────────┐      │
│  │Producer 1│  │Producer 2│  │Producer 3│  ...  │Producer N│      │
│  │ Node.js  │  │ Node.js  │  │ Node.js  │       │ Node.js  │      │
│  │ kafkajs  │  │ kafkajs  │  │ kafkajs  │       │ kafkajs  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       └────┬─────┘      │
│       │              │              │                   │            │
│       └──────────────┴──────────────┴───────────────────┘            │
│                              │                                       │
│                    TLS + SASL/SCRAM-SHA-512                          │
├──────────────────────────────┼──────────────────────────────────────┤
│  ISA-95 Level 3 — Kafka Backbone (KRaft Mode, No ZooKeeper)        │
│                                                                     │
│  3 brokers form a fault-tolerant cluster using KRaft consensus.    │
│  Topics follow ISA-95 naming: scada.l2.<category>.<type>           │
│  200 partitions per topic enable parallelism across 100+ nodes.    │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │ Broker 1  │  │ Broker 2  │  │ Broker 3  │                        │
│  │ (KRaft)   │  │ (KRaft)   │  │ (KRaft)   │                        │
│  └──────────┘  └──────────┘  └──────────┘                          │
│                                                                     │
│  Topics:                                                            │
│    scada.l2.telemetry.flow         (7-day retention, 200 parts)    │
│    scada.l2.telemetry.pressure     (7-day retention, 200 parts)    │
│    scada.l2.telemetry.temperature  (7-day retention, 200 parts)    │
│    scada.l2.events                 (30-day retention, 200 parts)   │
│    scada.l2.alarms                 (90-day retention, 200 parts)   │
│                                                                     │
├──────────────────────────────┼──────────────────────────────────────┤
│  ISA-95 Level 3 — Master Aggregation Station                        │
│                                                                     │
│  Consumer group "master-aggregator" processes all topics in batch  │
│  mode. Zod validates every message. Prisma v6 persists to          │
│  PostgreSQL with idempotent inserts (skipDuplicates).              │
│                                                                     │
│  ┌───────────────────────┐    ┌──────────────────────────────┐     │
│  │  Consumer              │───▶│  PostgreSQL 16 Historian      │     │
│  │  Kafka → Zod → Prisma  │    │  3 tables: telemetry,         │     │
│  │  Batch processing      │    │  events, alarms               │     │
│  │  Manual offset commits │    │  Idempotent via event_id PK   │     │
│  └───────────────────────┘    └──────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ISA-95 Layer Mapping

| ISA-95 Level | System Component | Description |
|---|---|---|
| **Level 0** | Physical sensors | Flow meters, pressure transmitters, temperature sensors (not modeled) |
| **Level 1** | PLCs / RTUs | Signal conditioning, basic control (not modeled) |
| **Level 2** | **Producers** | SCADA nodes — read sensor data, generate events, publish to Kafka |
| **Level 3** | **Kafka + Consumer** | MES/Historian — aggregate, validate, persist to central database |
| **Level 4** | Business intelligence | Dashboards, analytics, reporting (downstream consumers, not modeled) |

**Topic Naming Convention:**  
```
<domain>.<isa-level>.<category>.<type>
```
Example: `scada.l2.telemetry.flow` = SCADA domain, Level 2 source, telemetry category, flow measurement type

---

## Project Structure

```
SRS Master/
│
├── package.json                 # NPM workspace root
├── tsconfig.base.json           # Shared TypeScript configuration
├── .env.example                 # Environment variable template (NEVER commit .env)
├── .gitignore                   # Git exclusions for secrets, builds, certs
├── docker-compose.yml           # Full deployment stack
├── README.md                    # YOU ARE HERE
│
├── packages/
│   ├── shared/                  # Shared types, validation, Kafka config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Barrel export
│   │       ├── types/
│   │       │   ├── envelope.ts           # ISA-95 event envelope interfaces
│   │       │   └── index.ts              # Type barrel
│   │       ├── validation/
│   │       │   └── schema.ts             # Zod runtime validation schemas
│   │       └── config/
│   │           └── kafka.ts              # Topic names, partition keys, retention
│   │
│   ├── producer/                # Level-2 SCADA remote node (with outbox)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── docker-entrypoint.sh          # Runs Prisma migrations on startup
│   │   ├── prisma/
│   │   │   └── schema.prisma            # Outbox + local telemetry models
│   │   └── src/
│   │       ├── index.ts                  # Entry point — outbox-based event loop
│   │       ├── kafka/
│   │       │   ├── client.ts             # KafkaJS client factory (TLS + SASL)
│   │       │   └── producer.ts           # Idempotent producer wrapper
│   │       ├── generators/
│   │       │   ├── telemetry.ts          # Gaussian random walk simulator
│   │       │   ├── events.ts             # Operational event generator
│   │       │   └── alarms.ts             # ISA-18.2 alarm generator
│   │       ├── outbox/
│   │       │   ├── index.ts              # Outbox barrel export
│   │       │   ├── service.ts            # Atomic event writer (outbox pattern)
│   │       │   ├── dispatcher.ts         # Outbox → Kafka publisher
│   │       │   └── pruner.ts             # Background cleanup of SENT events
│   │       └── db/
│   │           └── prisma.ts             # Producer PrismaClient singleton
│   │
│   └── consumer/                # Level-3 master aggregation station
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       ├── docker-entrypoint.sh          # Runs Prisma migrations on startup
│       ├── prisma/
│       │   └── schema.prisma            # Prisma v6 schema (3 models)
│       └── src/
│           ├── index.ts                  # Entry point — startup/shutdown
│           ├── kafka/
│           │   ├── client.ts             # KafkaJS client factory (consumer)
│           │   └── consumer.ts           # Batch consumer with manual offsets
│           └── db/
│               ├── prisma.ts             # PrismaClient singleton
│               └── repository.ts         # Idempotent batch inserts
│
├── kafka/
│   ├── scripts/
│   │   ├── create-topics.sh              # ISA-95 topic creation
│   │   ├── setup-acls.sh                 # Least-privilege ACLs
│   │   ├── generate-certs.sh             # TLS certificate PKI
│   │   └── create-scram-users.sh         # SCRAM-SHA-512 users
│   └── certs/                            # Generated TLS certificates (gitignored)
│
└── database/
    └── init.sql                          # PostgreSQL extensions & tuning
```

---

## Component Details

### 1. Shared Package (`packages/shared/src/`)

The shared package is the foundation that both producer and consumer depend on. It ensures type safety and consistency across the entire system.

#### `types/envelope.ts` — Event Envelope Interfaces

**What it does:** Defines the standard message format for ALL data flowing through the system.

**Key interfaces:**
- `ScadaEventEnvelope` — The core message type. Every sensor reading, operational event, and alarm is wrapped in this envelope before being sent to Kafka.
- `AssetIdentifier` — ISA-95 equipment hierarchy (plant → area → unit). Used to build deterministic Kafka partition keys.
- `QualityCode` — OPC-UA inspired quality indicators: `GOOD`, `BAD`, `UNCERTAIN`, `OOR` (Out of Range).
- `EventCategory` — Routes messages to the correct Kafka topic: `telemetry`, `event`, or `alarm`.

**Why this matters:** By enforcing a single, strict envelope format, we guarantee that:
- Producers can't send malformed data
- Consumers can safely deserialize any message
- The database schema directly maps to the envelope fields

#### `validation/schema.ts` — Zod Runtime Validation

**What it does:** Defines Zod schemas that validate raw JSON messages at runtime.

**Why not just trust TypeScript types?**
TypeScript types exist only at compile time. When the consumer reads a Kafka message, it receives a raw byte buffer. We must validate:
- The UUID is actually a valid UUID (not `"hello"`)
- The timestamp is ISO-8601 (not `"yesterday"`)
- Plant/area/unit IDs match naming conventions
- Values are finite numbers (reject NaN/Infinity)
- Quality codes are from the allowed set

**Key functions:**
- `validateEnvelope(raw)` — Returns `{ success: true, data }` or `{ success: false, error }` (never throws)
- `validateAlarmEnvelope(raw)` — Extended validation for alarm messages (includes severity)

#### `config/kafka.ts` — Kafka Configuration Constants

**What it does:** Centralizes all Kafka topic names, partition key logic, and retention policies.

**Topic names follow ISA-95:**
```
scada.l2.telemetry.flow        — Volumetric flow measurements
scada.l2.telemetry.pressure    — Pressure measurements
scada.l2.telemetry.temperature — Temperature measurements
scada.l2.events                — Operational events
scada.l2.alarms                — Process alarms
```

**Key functions:**
- `buildMessageKey(plant, area, unit, tag)` → `"PLANT01.AREA02.UNIT_05.FLOW_RATE"`  
  Ensures all readings from the same sensor go to the same partition (ordered processing per tag).
- `resolveTopicName(category, tag)` → Routes to the correct topic based on event category and tag name.

**Producer defaults:**
- `acks: -1` (all) — Wait for every in-sync replica to acknowledge
- `idempotent: true` — Broker-level deduplication on retry
- `maxInFlightRequests: 1` — Strict ordering within partition

---

### 2. Producer (`packages/producer/src/`)

The producer represents a single SCADA Level-2 remote node. In production, 100 instances run independently.

#### `kafka/client.ts` — Kafka Client Factory

**What it does:** Creates a configured KafkaJS client instance with:
- **TLS encryption** — Reads CA cert, client cert, and client key from file paths specified in environment variables
- **SASL/SCRAM-SHA-512** — Challenge-response authentication (username/password from environment)
- **Connection resilience** — Automatic reconnection with exponential backoff (300ms → 30s)
- **Structured logging** — KafkaJS logs routed through pino for consistent JSON logging

**How it works:**
1. Reads `KAFKA_BROKERS` (comma-separated list)
2. Reads `KAFKA_SASL_USERNAME` and `KAFKA_SASL_PASSWORD` for SASL
3. Reads `KAFKA_SSL_CA_PATH`, `KAFKA_SSL_CERT_PATH`, `KAFKA_SSL_KEY_PATH` for TLS
4. If TLS env vars aren't set, runs without TLS (development mode)
5. Returns a configured `Kafka` instance

#### `kafka/producer.ts` — Producer Wrapper (ScadaProducer class)

**What it does:** Wraps the KafkaJS producer with industrial-grade guarantees.

**Key methods:**
- `connect()` — Establishes connection to the Kafka cluster
- `publish(envelope)` — Publishes a single event with deterministic partitioning
- `publishBatch(envelopes)` — Groups messages by topic and sends as a single batch (10-50x faster than individual sends)
- `disconnect()` — Graceful shutdown, flushes all buffered messages

**How deterministic partitioning works:**
```
Message Key = "PLANT01.AREA02.UNIT_05.FLOW_RATE"
                 ↓
Kafka hashes the key → partition = murmur2(key) % 200
                 ↓
All FLOW_RATE readings from UNIT_05 always go to the same partition
                 ↓
Consumer sees them in chronological order (critical for trend analysis)
```

#### `generators/telemetry.ts` — Telemetry Simulator

**What it does:** Generates realistic industrial measurements using Gaussian random walks.

**Simulated tags:**
| Tag | Unit | Setpoint | Range | Noise |
|-----|------|----------|-------|-------|
| FLOW_RATE | m³/h | 50 | 0–120 | ±5 |
| PRESSURE | bar | 12 | 0–30 | ±1.5 |
| TEMPERATURE | °C | 180 | -20–400 | ±8 |

**Behavior:**
- Values drift randomly around a setpoint with mean reversion
- Quality degrades to `UNCERTAIN` near sensor range limits (within 5%)
- Quality becomes `OOR` (Out of Range) when values exceed physical limits
- This simulates real sensor behavior much more realistically than pure random

#### `generators/events.ts` — Operational Event Generator

**What it does:** Stochastically generates operational events.

Each publishing cycle, each event type has a small probability of triggering:
- `UNIT_START` (0.5% chance) — Equipment startup
- `UNIT_STOP` (0.5% chance) — Equipment shutdown
- `MODE_CHANGE` (2% chance) — AUTO/MANUAL/CASCADE transitions
- `SETPOINT_CHANGE` (5% chance) — Operator adjustments
- `MAINTENANCE` (0.2% chance) — Maintenance window entry/exit

#### `generators/alarms.ts` — Alarm Generator (ISA-18.2)

**What it does:** Generates process alarms with severity levels.

Alarm definitions with stochastic probabilities:
| Tag | Severity | Probability | Threshold |
|-----|----------|-------------|-----------|
| HIGH_FLOW | MEDIUM | 0.8% | 95 m³/h |
| LOW_PRESSURE | HIGH | 0.5% | 2 bar |
| HIGH_TEMP | HIGH | 0.4% | 320°C |
| CRITICAL_TEMP | CRITICAL | 0.1% | 380°C |
| VIBRATION_HIGH | MEDIUM | 0.6% | 7.1 mm/s |
| INSTRUMENT_FAULT | LOW | 0.3% | fault |

#### `index.ts` — Entry Point (Outbox-First)

**Startup sequence:**
1. Read node identity from environment (`NODE_ID`, `PLANT_ID`, `AREA_ID`)
2. Test local PostgreSQL connection (fail fast)
3. Create Kafka client with TLS + SASL, connect producer
4. Initialize OutboxService and OutboxDispatcher
5. Initialize and start **OutboxPruner** (background maintenance)
6. Enter main loop (runs every `PRODUCER_INTERVAL_MS`, default 1 second):
   - Generate telemetry, events, and alarms
   - Write ALL events to **local outbox** (NOT directly to Kafka)
   - The dispatcher independently publishes to Kafka in the background
   - The pruner independently cleans old SENT records in the background
7. Log status every 60 cycles with outbox metrics (pending, failed, oldest age)
8. Alert if pending count > 100 or failed count > 0
9. Handle `SIGTERM`/`SIGINT` for graceful shutdown (pruner → dispatcher → producer → DB)

---

### Outbox Pattern (Industrial-Grade)

The outbox pattern solves the **dual-write problem** — what happens if the producer updates the database but loses connection before sending the event to Kafka?

```
WITHOUT Outbox:                          WITH Outbox:
  1. Write to local DB → succeeds         1. Write to local DB  }
  2. Publish to Kafka  → FAILS            2. Write to outbox    } SAME TX
  Result: DB updated, event LOST          3. Dispatcher publishes later
                                          Result: Event is NEVER lost
```

#### `outbox/service.ts` — Atomic Event Writer

**Non-negotiable rule:** Business state + outbox insert are in the SAME database transaction.

**Key methods:**
- `writeEvent(envelope)` — Single event to outbox (status=PENDING)
- `writeBatch(envelopes)` — Batch insert via `createMany({ skipDuplicates: true })`
- `writeEventWithLocalCache(envelope)` — Atomic `$transaction` writing to BOTH outbox AND local telemetry cache

**Failure guarantees:**
| Failure | Result |
|---------|--------|
| Crash before commit | No DB change, no event (safe) |
| Crash after commit | Event safely stored in outbox |
| Network down | Event waits in outbox (dispatcher retries) |
| Broker unavailable | Event retries with exponential backoff |

#### `outbox/dispatcher.ts` — Outbox Dispatcher

The dispatcher is a separate polling loop whose ONLY job is: **Read → Lock → Publish → Mark**

**Core query (concurrency-safe):**
```sql
SELECT * FROM outbox_events
WHERE status = 'PENDING' AND available_at <= NOW()
ORDER BY created_at
LIMIT 50
FOR UPDATE SKIP LOCKED
```

**Why `SKIP LOCKED`?** Allows multiple dispatchers to run concurrently without double-publishing.

**Status lifecycle:**
```
PENDING → IN_PROGRESS → SENT
              ↓
         (on failure)
              ↓
          PENDING (retryCount++, backoff)
              ↓
         (after MAX_RETRIES = 10)
              ↓
           FAILED (poison message — manual intervention)
```

**Exponential backoff schedule:**
| Retry | Delay |
|-------|-------|
| 1 | +5 seconds |
| 2 | +30 seconds |
| 3 | +2 minutes |
| 4 | +10 minutes |
| 5 | +30 minutes |
| 6+ | +1 hour (capped) |

**Crash recovery:** Every 30 seconds, the dispatcher checks for IN_PROGRESS events with stale locks (locked_at > 120 seconds ago). These are reset to PENDING — **self-healing, no manual intervention.**

**Monitoring metrics:**
- `pendingCount` — If growing → Kafka may be unreachable
- `oldestPendingAgeMs` — If > threshold → INCIDENT
- `failedCount` — If > 0 → Poison messages need investigation
- `inProgressCount` — If high for extended periods → potential stuck dispatchers

#### `prisma/schema.prisma` — Outbox Table

**OutboxEvent model fields:**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID (PK) | Idempotency key |
| `aggregate_type` | VarChar(64) | Event category (telemetry/event/alarm) |
| `aggregate_id` | VarChar(256) | ISA-95 asset path (plant.area.unit.tag) |
| `event_type` | VarChar(128) | Specific event name |
| `payload` | JSONB | Full event envelope (immutable) |
| `headers` | JSONB | correlationId, traceId, topic, key |
| `status` | VarChar(16) | PENDING / IN_PROGRESS / SENT / FAILED |
| `retry_count` | Integer | Failure count |
| `available_at` | Timestamptz | Earliest dispatch time (for backoff) |
| `locked_by` | VarChar(128) | Dispatcher instance ID |
| `locked_at` | Timestamptz | Lock timestamp (for crash recovery) |
| `sent_at` | Timestamptz | Successful publish timestamp |

**Optimized indexes:**
- `(status, available_at)` — Hot path: dispatcher's main query
- `(status, locked_at)` — Crash recovery: find stale locks
- `(aggregate_id, created_at)` — Ordering per aggregate

#### `outbox/pruner.ts` — Background Cleanup Service

**What it does:** Automatically deletes old, successfully published records from the local outbox database to prevent unbounded table growth.

**What it cleans:**
| Table | Condition | Safe? |
|-------|-----------|-------|
| `outbox_events` | `status = 'SENT'` AND `sent_at` older than retention | ✅ Already in Kafka + historian |
| `local_telemetry` | `timestamp` older than retention | ✅ Central historian has the data |

**Never touches:** PENDING, IN_PROGRESS, or FAILED events — only SENT.

**Configuration:**
| Variable | Default | Purpose |
|----------|---------|---------|  
| `STORAGE_RETENTION_DAYS` | 30 | Days to keep SENT events |
| `PRUNE_INTERVAL_MS` | 3600000 | Cleanup interval (default: 1 hour) |

**Lifecycle:**
1. Starts with the producer, runs initial prune after 5s delay
2. Prunes every `PRUNE_INTERVAL_MS` thereafter
3. Stops gracefully on `SIGTERM`/`SIGINT`

---

### 3. Consumer (`packages/consumer/src/`)

The consumer is the Level-3 master aggregation station. It consumes ALL topics and persists data to the PostgreSQL historian.

#### `kafka/client.ts` — Consumer Kafka Client

Identical security configuration to the producer's client factory (TLS + SASL), but uses consumer-specific credentials.

#### `kafka/consumer.ts` — Batch Consumer (ScadaConsumer class)

**What it does:** Consumes Kafka messages in batch mode with manual offset management.

**Processing pipeline for each batch:**
```
Kafka batch arrives (N messages)
         ↓
For each message:
  1. Deserialize JSON
  2. Validate against Zod schema
  3. Skip invalid messages (log warning)
  4. Add valid messages to batch
         ↓
Batch insert into PostgreSQL via Prisma
  - createMany({ skipDuplicates: true })
  - Routes by category: telemetry → Telemetry table, etc.
         ↓
IF database write succeeds:
  → Commit Kafka offsets (resolveOffset + commitOffsetsIfNecessary)
         ↓
IF database write FAILS:
  → DO NOT commit offsets
  → Re-throw error
  → Kafka will redeliver the batch on next poll
  → Idempotent inserts handle the replay safely
```

**Why batch mode (`eachBatch`) instead of `eachMessage`?**
- Batch inserts are 10–50x faster than individual inserts
- Manual offset management ensures exactly-once semantics (at application level)
- At 300 events/second, individual inserts would saturate the connection pool

**Consumer group: `master-aggregator`**
- All consumer instances share this group ID
- Kafka distributes 200 partitions across group members
- Adding more consumer instances = horizontal scaling
- Maximum useful consumer count = number of partitions (200)

#### `db/prisma.ts` — PrismaClient Singleton

**What it does:** Manages a single shared PrismaClient instance.

**Key functions:**
- `getPrismaClient()` — Returns the singleton (creates on first call)
- `disconnectPrisma()` — Graceful shutdown (called during SIGTERM)
- `testConnection()` — Runs `SELECT 1` to verify database connectivity at startup (fail fast)

**Why a singleton?** PrismaClient manages a connection pool internally. Creating multiple instances would exhaust PostgreSQL's `max_connections` under high load.

#### `db/repository.ts` — Historian Repository

**What it does:** Persists validated events to PostgreSQL using Prisma v6.

**The idempotent insert pattern:**
```typescript
const result = await prisma.telemetry.createMany({
  data: records,
  skipDuplicates: true,  // ← THIS IS THE KEY
});
```

This translates to SQL:
```sql
INSERT INTO telemetry (event_id, timestamp, plant, ...)
VALUES ($1, $2, $3, ...), ($4, $5, $6, ...)
ON CONFLICT (event_id) DO NOTHING
```

**Why `skipDuplicates` instead of `upsert`?**
- Historian data is **append-only** — sensor readings should NEVER be overwritten
- `DO NOTHING` is faster than `DO UPDATE` because it skips the write entirely
- In at-least-once delivery, replayed messages are guaranteed to have the same `event_id`
- `skipDuplicates` silently discards them without errors or updates

**Key methods:**
- `insertTelemetry(events)` — Filters for `category === 'telemetry'` and batch inserts
- `insertEvents(events)` — Filters for `category === 'event'`
- `insertAlarms(events)` — Filters for `category === 'alarm'`
- `insertAll(events)` — Routes to all three tables in parallel via `Promise.all`

#### `index.ts` — Consumer Entry Point

**Startup sequence:**
1. Test PostgreSQL connectivity (exit immediately if unreachable)
2. Initialize PrismaClient singleton
3. Create HistorianRepository
4. Create Kafka consumer client
5. Subscribe to all `scada.l2.*` topics
6. Register shutdown handlers (SIGTERM, SIGINT, uncaughtException)
7. Start batch consumption

---

### 4. Prisma v6 Schema (`packages/consumer/prisma/`)

#### `schema.prisma` — Database Schema

**Three models, one per ISA-95 event category:**

**`Telemetry` model:**
| Column | Type | Purpose |
|--------|------|---------|
| `event_id` | UUID (PK) | Global deduplication key |
| `timestamp` | Timestamptz | Original measurement time |
| `plant` | VarChar(64) | ISA-95 Site |
| `area` | VarChar(64) | ISA-95 Area |
| `unit_name` | VarChar(64) | ISA-95 Work Unit |
| `tag` | VarChar(128) | Process variable name |
| `value` | DoublePrecision | Measurement value |
| `unit_of_measure` | VarChar(32) | Engineering unit |
| `quality` | VarChar(16) | OPC-UA quality code |
| `node_id` | Integer | Originating node |
| `created_at` | Timestamptz | Server insert time |

**Indexes (optimized for historian queries):**
- `(plant, timestamp)` — "Show me all data from PLANT01 in the last hour"
- `(tag, timestamp)` — "Show me FLOW_RATE trend for the last 24 hours"
- `(node_id, timestamp)` — "Show me all data from Node 42"

**`Event` model:** Same columns as Telemetry (same data shape, separate table for retention management)

**`Alarm` model:** Same as Event + `severity` column (LOW/MEDIUM/HIGH/CRITICAL) + additional `(severity, timestamp)` index

**Database naming convention:**
- Prisma models use PascalCase (`Telemetry`)
- Database tables use snake_case (`telemetry`) via `@@map`
- Prisma fields use camelCase (`unitName`)
- Database columns use snake_case (`unit_name`) via `@map`

---

### 5. Kafka Infrastructure (`kafka/`)

#### `scripts/create-topics.sh`
Creates 5 ISA-95 aligned topics with:
- **200 partitions** each (supports 100+ concurrent producers)
- **Replication factor 3** (data survives losing 2 brokers)
- **min.insync.replicas=2** (writes fail if <2 brokers available — prevents silent data loss)
- **Tiered retention**: 7 days (telemetry) / 30 days (events) / 90 days (alarms)

#### `scripts/setup-acls.sh`
Configures least-privilege access:
- **Producers:** WRITE + Describe on all `scada.l2.*` topics, IdempotentWrite on cluster
- **Consumers:** READ + Describe on all `scada.l2.*` topics, READ on `master-aggregator` consumer group
- No user can delete topics, alter configs, or create new topics

#### `scripts/generate-certs.sh`
Generates a complete TLS certificate chain:
1. Root CA (4096-bit RSA, 10-year validity)
2. Broker certs with SAN extensions (`kafka-1`, `kafka-2`, `kafka-3`)
3. Client certs for producer and consumer

#### `scripts/create-scram-users.sh`
Creates 3 SCRAM-SHA-512 users: `producer-user`, `consumer-user`, `admin-user`

---

### 6. PostgreSQL Database (`database/`)

#### `init.sql`
Runs once on first PostgreSQL container start:
- Enables `uuid-ossp` extension (UUID generation)
- Enables `pg_trgm` extension (text search)
- Enables `btree_gist` extension (GiST indexes)
- Documents recommended tuning parameters

**Note:** Table creation is handled entirely by **Prisma Migrate** — `init.sql` only sets up extensions and the database itself.

---

### 7. Docker Deployment

#### `docker-compose.yml` — Full Stack

| Service | Image | Purpose | Port |
|---------|-------|---------|------|
| kafka-1 | confluentinc/cp-kafka:7.6.0 | Kafka broker (KRaft) | 9092 |
| kafka-2 | confluentinc/cp-kafka:7.6.0 | Kafka broker (KRaft) | 9094 |
| kafka-3 | confluentinc/cp-kafka:7.6.0 | Kafka broker (KRaft) | 9095 |
| kafka-init | confluentinc/cp-kafka:7.6.0 | One-shot topic creation | — |
| postgres | postgres:16-alpine | Central historian database | 5432 |
| **producer-postgres** | postgres:16-alpine | **Producer outbox database** | 5433 |
| producer | Custom Node.js image | Level-2 SCADA node (outbox) | — |
| consumer | Custom Node.js image | Level-3 aggregator | — |

**Startup order (enforced by health checks + depends_on):**
```
kafka-1, kafka-2, kafka-3  →  kafka-init  ─┐
  producer-postgres     ────────────────────┼→  producer
  postgres              ────────────────────┼→  consumer
```

---

## Security Architecture

```
┌──────────────── Security Layers ─────────────────┐
│                                                    │
│  1. NETWORK ISOLATION                              │
│     └─ Private Docker network (srs-scada-network) │
│     └─ In production: Private VLAN / VPN           │
│                                                    │
│  2. TRANSPORT ENCRYPTION (TLS)                     │
│     └─ All Kafka traffic encrypted with TLS 1.2+  │
│     └─ Self-signed CA for internal use             │
│     └─ Per-service client certificates             │
│                                                    │
│  3. AUTHENTICATION (SASL/SCRAM-SHA-512)            │
│     └─ Challenge-response (never sends password)   │
│     └─ Separate credentials per service role       │
│                                                    │
│  4. AUTHORIZATION (Kafka ACLs)                     │
│     └─ Producers: WRITE only to scada.l2.* topics │
│     └─ Consumers: READ only from scada.l2.*       │
│     └─ No topic deletion, no config changes        │
│                                                    │
│  5. DATA INTEGRITY                                 │
│     └─ Idempotent producer (broker-level dedup)    │
│     └─ event_id PK (application-level dedup)       │
│     └─ PostgreSQL data checksums enabled           │
│                                                    │
│  6. SECRET MANAGEMENT                              │
│     └─ No hardcoded secrets anywhere               │
│     └─ All credentials via environment variables   │
│     └─ TLS certs via volume mounts                 │
│     └─ .env file excluded from Git                 │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Kafka Topic Design

```
scada.l2.telemetry.flow         ← Flow rate measurements
  Partitions: 200
  Retention: 7 days (604,800,000 ms)
  Replication: 3
  Min ISR: 2

scada.l2.telemetry.pressure     ← Pressure measurements
  (same config as flow)

scada.l2.telemetry.temperature  ← Temperature measurements
  (same config as flow)

scada.l2.events                 ← Operational events
  Partitions: 200
  Retention: 30 days (2,592,000,000 ms)
  Replication: 3
  Min ISR: 2

scada.l2.alarms                 ← Process alarms
  Partitions: 200
  Retention: 90 days (7,776,000,000 ms)
  Replication: 3
  Min ISR: 2
```

**Naming Convention:** `<domain>.<isa-level>.<category>.<type>`

---

## Data Flow Pipeline (with Outbox)

```
Sensor Reading (Level 0/1)
         ↓
┌─ Producer (Level 2) ─── GENERATION ─────────────────────┐
│  1. Generate telemetry: FLOW_RATE = 52.3 m³/h            │
│  2. Create event envelope (standard ISA-95 format)        │
│  3. ⚠ DO NOT publish directly to Kafka                   │
│  4. Write to LOCAL PostgreSQL outbox (atomic transaction) │
│     INSERT INTO outbox_events (status='PENDING', ...)    │
└──────────────────────┬──────────────────────────────────┘
                       │ (same node, different loop)
┌─ Outbox Dispatcher ──▼──── PUBLISHING ──────────────────┐
│  1. SELECT * FROM outbox_events                          │
│     WHERE status='PENDING' AND available_at<=NOW()       │
│     FOR UPDATE SKIP LOCKED                               │
│  2. Lock: status → IN_PROGRESS                           │
│  3. Publish to Kafka (wait for broker ACK)               │
│  4a. Success → status = SENT                              │
│  4b. Failure → status = PENDING, retry_count++           │
│      → available_at = NOW() + backoff(retry_count)       │
│  4c. Exceeded MAX_RETRIES → status = FAILED (poison)     │
└──────────────────────┬──────────────────────────────────┘
         ↓ (TLS + SASL)
┌─ Kafka (Level 3) ──────────────────────────────────────┐
│  Topic: scada.l2.telemetry.flow                         │
│  Partition: murmur2(key) % 200                           │
│  Replicated across 3 brokers, retained 7 days            │
└──────────────────────┬─────────────────────────────────┘
         ↓
┌─ Consumer (Level 3) ───────────────────────────────────┐
│  1. Receive batch → Zod validation                       │
│  2. Prisma createMany({ skipDuplicates: true })          │
│  3. Success → commit Kafka offsets                        │
│  4. Failure → don't commit → Kafka redelivers            │
└──────────────────────┬─────────────────────────────────┘
         ↓
┌─ PostgreSQL Historian ─────────────────────────────────┐
│  event_id (PK) → ON CONFLICT DO NOTHING (dedup)         │
└─────────────────────────────────────────────────────────┘
```

---

## Setup & Deployment

### Prerequisites

- **Docker** ≥ 24.0 with Docker Compose v2
- **Node.js** ≥ 20.0 (for local development only)
- **8 GB RAM minimum** (Kafka cluster + PostgreSQL + services)

### Quick Start (Development)

```bash
# 1. Clone and enter the project
cd /Users/neussapp/_Backend/SRS\ Master

# 2. Copy environment template
cp .env.example .env

# 3. Install dependencies (local development)
npm install

# 4. Build shared package
npm run build:shared

# 5. Generate Prisma client
cd packages/consumer && npx prisma generate && cd ../..

# 6. Start all services
docker compose up -d

# 7. Watch logs
docker compose logs -f producer consumer

# 8. Verify data in PostgreSQL
docker compose exec postgres psql -U scada -d scada_historian \
  -c "SELECT count(*) FROM telemetry;"
docker compose exec postgres psql -U scada -d scada_historian \
  -c "SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT 5;"
```

### Production Deployment

```bash
# 1. Generate TLS certificates
cd kafka/scripts && ./generate-certs.sh && cd ../..

# 2. Create SCRAM users (after Kafka starts)
docker compose up -d kafka-1 kafka-2 kafka-3
# Wait for cluster to form...
docker compose exec kafka-1 /scripts/create-scram-users.sh kafka-1:9092

# 3. Setup ACLs
docker compose exec kafka-1 /scripts/setup-acls.sh kafka-1:9092

# 4. Uncomment TLS/SASL config in docker-compose.yml

# 5. Set strong passwords in .env
echo "PRODUCER_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "CONSUMER_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "DB_PASSWORD=$(openssl rand -base64 32)" >> .env

# 6. Start everything
docker compose up -d
```

### Running Prisma Migrations

```bash
# The entrypoint script runs migrations automatically on consumer startup.
# For manual migration management:

cd packages/consumer

# Create a new migration
npx prisma migrate dev --name add_severity_index

# Deploy migrations (production — no prompts)
npx prisma migrate deploy

# View migration status
npx prisma migrate status

# Open Prisma Studio (visual database browser)
npx prisma studio
```

---

## Operations Guide

### Daily Operations

```bash
# Check service health
docker compose ps

# View real-time logs
docker compose logs -f producer consumer

# Check record counts
docker compose exec postgres psql -U scada -d scada_historian -c "
  SELECT 'telemetry' as table_name, count(*) FROM telemetry
  UNION ALL
  SELECT 'events', count(*) FROM events
  UNION ALL
  SELECT 'alarms', count(*) FROM alarms;
"

# Check Kafka consumer lag
docker compose exec kafka-1 kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group master-aggregator \
  --describe
```

### Safe Restart

```bash
# Restart consumer (no data loss — offsets are committed)
docker compose restart consumer

# Restart producer (no data loss — new events generated on restart)
docker compose restart producer

# Restart Kafka (rolling restart recommended)
docker compose restart kafka-1
# Wait 30 seconds for rebalance
docker compose restart kafka-2
# Wait 30 seconds
docker compose restart kafka-3
```

### Database Maintenance

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U scada -d scada_historian

# Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public';

# Vacuum (reclaim space from deleted rows)
VACUUM ANALYZE telemetry;
VACUUM ANALYZE events;
VACUUM ANALYZE alarms;
```

### Outbox Pruning (Automatic)

The producer includes an automatic pruning service that keeps the local outbox database from growing indefinitely.

```bash
# View pruning configuration
docker compose exec producer env | grep -E 'STORAGE_RETENTION|PRUNE_INTERVAL'

# Check pruning logs
docker compose logs producer | grep pruner

# Override retention for testing (keep only 1 day, prune every 10 minutes)
# In .env:
#   STORAGE_RETENTION_DAYS=1
#   PRUNE_INTERVAL_MS=600000

# Check outbox table size
docker compose exec producer-postgres psql -U producer -d scada_outbox -c "
  SELECT status, count(*) FROM outbox_events GROUP BY status;
"
```

---

## Scaling Guide

### Scaling Producers (Horizontal)

Each producer runs independently. To add more nodes:

```yaml
# docker-compose.override.yml
services:
  producer-2:
    extends:
      service: producer
    container_name: srs-producer-2
    environment:
      NODE_ID: 2
      PLANT_ID: PLANT02
      KAFKA_CLIENT_ID: scada-producer-02
```

Or deploy 100 producers with a script:
```bash
for i in $(seq 1 100); do
  docker run -d \
    --name srs-producer-${i} \
    --network srs-scada-network \
    -e NODE_ID=${i} \
    -e PLANT_ID=PLANT$(printf '%02d' ${i}) \
    -e KAFKA_BROKERS=kafka-1:9092,kafka-2:9092,kafka-3:9092 \
    srs-producer:latest
done
```

### Scaling Consumers (Horizontal)

Kafka distributes partitions across consumer group members:

| Consumer Instances | Partitions per Consumer | Max Throughput |
|---|---|---|
| 1 | 200 | ~300 events/sec |
| 5 | 40 | ~1,500 events/sec |
| 10 | 20 | ~3,000 events/sec |
| 20 | 10 | ~6,000 events/sec |
| 200 | 1 | ~60,000 events/sec (theoretical max) |

```bash
# Run 5 consumer instances
docker compose up -d --scale consumer=5
```

### Scaling Kafka

For higher throughput, add more brokers and increase partition count:
```bash
# Add broker 4 to docker-compose.override.yml with KAFKA_NODE_ID: 4
# Then reassign partitions to include the new broker
```

---

## Troubleshooting

### Consumer Not Receiving Messages

```bash
# 1. Check consumer group status
docker compose exec kafka-1 kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group master-aggregator --describe

# 2. Verify topics have data
docker compose exec kafka-1 kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic scada.l2.telemetry.flow \
  --from-beginning --max-messages 5
```

### Database Connection Refused

```bash
# 1. Check PostgreSQL is running
docker compose ps postgres

# 2. Check PostgreSQL logs
docker compose logs postgres

# 3. Verify DATABASE_URL
docker compose exec consumer env | grep DATABASE_URL
```

### Kafka Broker Not Starting

```bash
# 1. Check KRaft quorum
docker compose logs kafka-1 | grep -i "quorum"

# 2. Verify CLUSTER_ID is the same across all brokers
docker compose exec kafka-1 env | grep CLUSTER_ID
docker compose exec kafka-2 env | grep CLUSTER_ID
docker compose exec kafka-3 env | grep CLUSTER_ID

# 3. Check for port conflicts
lsof -i :9092
```

### Prisma Migration Errors

```bash
# Check migration status
cd packages/consumer
npx prisma migrate status

# Reset database (DEV ONLY — destroys all data)
npx prisma migrate reset

# Force push schema (skips migration history)
npx prisma db push --force-reset
```

---

## License

UNLICENSED — Internal industrial use only.

---

## Standards Compliance

| Standard | Applicability |
|---|---|
| **ISA-95** | Equipment hierarchy, topic naming, layer separation |
| **ISA-18.2** | Alarm severity levels, alarm management practices |
| **OPC-UA** | Quality code conventions (GOOD/BAD/UNCERTAIN) |
| **IEC 62443** | Defense-in-depth security model |
