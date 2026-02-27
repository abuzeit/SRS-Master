-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "aggregate_type" VARCHAR(64) NOT NULL,
    "aggregate_id" VARCHAR(256) NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_by" VARCHAR(128),
    "locked_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_telemetry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMPTZ NOT NULL,
    "plant" VARCHAR(64) NOT NULL,
    "area" VARCHAR(64) NOT NULL,
    "unit_name" VARCHAR(64) NOT NULL,
    "tag" VARCHAR(128) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "quality" VARCHAR(16) NOT NULL,
    "node_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_outbox_status_available" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "idx_outbox_status_locked" ON "outbox_events"("status", "locked_at");

-- CreateIndex
CREATE INDEX "idx_outbox_aggregate_order" ON "outbox_events"("aggregate_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_outbox_created" ON "outbox_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_local_telemetry_tag_ts" ON "local_telemetry"("tag", "timestamp");
