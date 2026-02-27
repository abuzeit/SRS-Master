-- CreateTable
CREATE TABLE "telemetry" (
    "event_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "plant" VARCHAR(64) NOT NULL,
    "area" VARCHAR(64) NOT NULL,
    "unit_name" VARCHAR(64) NOT NULL,
    "tag" VARCHAR(128) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit_of_measure" VARCHAR(32) NOT NULL,
    "quality" VARCHAR(16) NOT NULL,
    "node_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "events" (
    "event_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "plant" VARCHAR(64) NOT NULL,
    "area" VARCHAR(64) NOT NULL,
    "unit_name" VARCHAR(64) NOT NULL,
    "tag" VARCHAR(128) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit_of_measure" VARCHAR(32) NOT NULL,
    "quality" VARCHAR(16) NOT NULL,
    "node_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "alarms" (
    "event_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "plant" VARCHAR(64) NOT NULL,
    "area" VARCHAR(64) NOT NULL,
    "unit_name" VARCHAR(64) NOT NULL,
    "tag" VARCHAR(128) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit_of_measure" VARCHAR(32) NOT NULL,
    "quality" VARCHAR(16) NOT NULL,
    "node_id" INTEGER NOT NULL,
    "severity" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alarms_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "idx_telemetry_plant_ts" ON "telemetry"("plant", "timestamp");

-- CreateIndex
CREATE INDEX "idx_telemetry_tag_ts" ON "telemetry"("tag", "timestamp");

-- CreateIndex
CREATE INDEX "idx_telemetry_node_ts" ON "telemetry"("node_id", "timestamp");

-- CreateIndex
CREATE INDEX "idx_events_plant_ts" ON "events"("plant", "timestamp");

-- CreateIndex
CREATE INDEX "idx_events_tag_ts" ON "events"("tag", "timestamp");

-- CreateIndex
CREATE INDEX "idx_events_node_ts" ON "events"("node_id", "timestamp");

-- CreateIndex
CREATE INDEX "idx_alarms_plant_ts" ON "alarms"("plant", "timestamp");

-- CreateIndex
CREATE INDEX "idx_alarms_tag_ts" ON "alarms"("tag", "timestamp");

-- CreateIndex
CREATE INDEX "idx_alarms_severity_ts" ON "alarms"("severity", "timestamp");

-- CreateIndex
CREATE INDEX "idx_alarms_node_ts" ON "alarms"("node_id", "timestamp");
