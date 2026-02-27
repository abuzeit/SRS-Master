/**
 * =============================================================================
 * SRS Master — Prisma Client Singleton
 * =============================================================================
 *
 * Provides a single, reusable PrismaClient instance with:
 *
 *   - Connection pooling (Prisma's built-in pool)
 *   - Graceful shutdown support
 *   - Query logging in development mode
 *   - Error handling for connection failures
 *
 * Why a singleton?
 *   PrismaClient manages a connection pool internally. Creating multiple
 *   instances would exhaust PostgreSQL connections under load.
 *   In industrial systems processing 300+ inserts/second, connection
 *   management is critical for stability.
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ name: 'prisma-client' });

let prisma: PrismaClient | null = null;

/**
 * Returns the singleton PrismaClient instance.
 * Creates it on first call with appropriate configuration.
 */
export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        prisma = new PrismaClient({
            // Log slow queries in development for performance tuning
            log:
                process.env.LOG_LEVEL === 'debug'
                    ? [
                        { emit: 'event', level: 'query' },
                        { emit: 'event', level: 'error' },
                        { emit: 'event', level: 'warn' },
                    ]
                    : [
                        { emit: 'event', level: 'error' },
                        { emit: 'event', level: 'warn' },
                    ],

            // datasources is intentionally omitted — uses DATABASE_URL from env
        });

        // Log Prisma events using pino for consistency
        prisma.$on('error' as never, (e: unknown) => {
            logger.error({ event: e }, 'Prisma error');
        });
        prisma.$on('warn' as never, (e: unknown) => {
            logger.warn({ event: e }, 'Prisma warning');
        });

        logger.info('PrismaClient instance created');
    }

    return prisma;
}

/**
 * Gracefully disconnects the PrismaClient.
 * Must be called during shutdown to properly close database connections.
 */
export async function disconnectPrisma(): Promise<void> {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
        logger.info('PrismaClient disconnected');
    }
}

/**
 * Tests the database connection.
 * Used during startup to fail fast if PostgreSQL is unreachable.
 */
export async function testConnection(): Promise<boolean> {
    try {
        const client = getPrismaClient();
        await client.$queryRaw`SELECT 1`;
        logger.info('Database connection verified');
        return true;
    } catch (error) {
        logger.error({ error }, 'Database connection test failed');
        return false;
    }
}
