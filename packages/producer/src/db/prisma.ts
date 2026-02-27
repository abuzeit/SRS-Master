// =============================================================================
// SRS Master — Producer Local PrismaClient Singleton
// =============================================================================
//
// Manages a single PrismaClient for the producer's LOCAL PostgreSQL database.
// This database hosts the outbox_events table and optionally local telemetry.
//
// Connection URL: PRODUCER_DATABASE_URL (different from the central historian!)
//
// Each remote SCADA node has its OWN database — this is critical for the
// outbox pattern to work, since the outbox write must be in the same
// transaction as the business data write.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ name: 'producer-prisma', level: process.env.LOG_LEVEL ?? 'info' });

let prisma: PrismaClient | null = null;

/**
 * Returns the singleton PrismaClient for the producer's local database.
 * Creates the instance on first call with connection pooling configured
 * for the producer's workload pattern (many writes, few reads).
 */
export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        prisma = new PrismaClient({
            log: [
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' },
            ],
        });

        // Route Prisma logs through pino for consistent structured logging
        (prisma.$on as any)('error', (e: any) => {
            logger.error({ prismaError: e.message }, 'Prisma error');
        });
        (prisma.$on as any)('warn', (e: any) => {
            logger.warn({ prismaWarning: e.message }, 'Prisma warning');
        });

        logger.info('PrismaClient initialized for producer local database');
    }
    return prisma;
}

/**
 * Graceful disconnect — call during SIGTERM / SIGINT shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
        logger.info('PrismaClient disconnected');
    }
}

/**
 * Tests the database connection with a simple query.
 * Throws immediately if the database is unreachable.
 * Call at startup to fail fast rather than failing on the first write.
 */
export async function testConnection(): Promise<void> {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    logger.info('Producer local database connection verified');
}
