-- =============================================================================
-- SRS Master — PostgreSQL Database Initialization
-- =============================================================================
--
-- This script runs ONCE when the PostgreSQL container starts for the first time.
-- It creates the scada_historian database and the scada user.
--
-- TABLE CREATION IS HANDLED BY PRISMA MIGRATE.
-- This script only sets up the database and extensions that Prisma cannot create.
--
-- Why not use Prisma for everything?
--   Prisma connects to an EXISTING database — it cannot create the database itself.
--   This init script runs as the PostgreSQL superuser to create the database,
--   then Prisma manages all tables, indexes, and migrations within it.
-- =============================================================================

-- Create the SCADA historian database
-- (Docker's POSTGRES_DB env var handles this, but we keep it explicit)
-- SELECT 'CREATE DATABASE scada_historian' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'scada_historian');

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID generation functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram index for text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";   -- GiST index support

-- =============================================================================
-- PostgreSQL Tuning for Industrial Historian Workload
-- =============================================================================
-- These settings optimize for the historian's access pattern:
--   - Heavy WRITE load (300+ inserts/second from 100 nodes)
--   - Time-series READ queries (range scans on timestamp)
--   - Infrequent UPDATEs (append-only historian)
--
-- These can also be set via postgresql.conf or Docker environment variables.
-- Uncomment and adjust based on available hardware.
-- =============================================================================

-- ALTER SYSTEM SET shared_buffers = '2GB';
-- ALTER SYSTEM SET effective_cache_size = '6GB';
-- ALTER SYSTEM SET work_mem = '64MB';
-- ALTER SYSTEM SET maintenance_work_mem = '512MB';
-- ALTER SYSTEM SET wal_buffers = '64MB';
-- ALTER SYSTEM SET max_connections = 200;
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET random_page_cost = 1.1;
