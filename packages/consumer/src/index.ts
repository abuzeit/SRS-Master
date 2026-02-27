/**
 * =============================================================================
 * SRS Master — Consumer Entry Point (Master Aggregation Station)
 * =============================================================================
 *
 * This is the main entry point for the Level-3 master aggregation station.
 *
 * Startup Sequence:
 *   1. Test PostgreSQL connectivity (fail fast)
 *   2. Run Prisma migrations (ensure schema is up to date)
 *   3. Initialize Kafka consumer
 *   4. Connect to all ISA-95 topics
 *   5. Start batch consumption loop
 *
 * Shutdown Sequence (SIGTERM/SIGINT):
 *   1. Stop consuming new messages
 *   2. Wait for in-progress batch to complete
 *   3. Commit final offsets to Kafka
 *   4. Disconnect from PostgreSQL
 *   5. Exit cleanly
 *
 * ISA-95 Context:
 *   This service is the Level-3 historian aggregator. It receives ALL
 *   data from Level-2 nodes via Kafka and persists it to the central
 *   PostgreSQL historian database through Prisma v6.
 * =============================================================================
 */

import { createConsumerKafkaClient } from './kafka/client.js';
import { ScadaConsumer } from './kafka/consumer.js';
import { getPrismaClient, disconnectPrisma, testConnection } from './db/prisma.js';
import { HistorianRepository } from './db/repository.js';
import pino from 'pino';

const logger = pino({
    name: 'master-station',
    level: process.env.LOG_LEVEL ?? 'info',
});

async function main(): Promise<void> {
    logger.info('=== SCADA Level-3 Master Aggregation Station Starting ===');

    // -----------------------------------------------------------------------
    // Step 1: Verify database connectivity
    // -----------------------------------------------------------------------
    logger.info('Testing PostgreSQL connection...');
    const dbReady = await testConnection();
    if (!dbReady) {
        logger.fatal('Cannot connect to PostgreSQL — aborting startup');
        process.exit(1);
    }

    // -----------------------------------------------------------------------
    // Step 2: Initialize Prisma client and repository
    // -----------------------------------------------------------------------
    const prisma = getPrismaClient();
    const repository = new HistorianRepository(prisma);
    logger.info('Prisma v6 client initialized — historian repository ready');

    // -----------------------------------------------------------------------
    // Step 3: Initialize Kafka consumer
    // -----------------------------------------------------------------------
    const kafka = createConsumerKafkaClient();
    const consumer = new ScadaConsumer(kafka, repository);
    await consumer.connect();

    // -----------------------------------------------------------------------
    // Step 4: Graceful shutdown handlers
    // -----------------------------------------------------------------------
    const shutdown = async (signal: string): Promise<void> => {
        logger.info({ signal }, 'Shutdown signal received');

        try {
            // Disconnect consumer first (stops message processing)
            await consumer.disconnect();
            // Then disconnect database (flushes connection pool)
            await disconnectPrisma();
            logger.info('All connections closed — exiting gracefully');
        } catch (error) {
            logger.error({ error }, 'Error during shutdown');
        }

        process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    // Catch unhandled errors — log but don't crash in 24/7 operation
    process.on('uncaughtException', (error) => {
        logger.fatal({ error }, 'Uncaught exception — shutting down');
        void shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        logger.error({ reason }, 'Unhandled promise rejection');
    });

    // -----------------------------------------------------------------------
    // Step 5: Start consuming
    // -----------------------------------------------------------------------
    await consumer.start();
    logger.info('Master station is ONLINE — consuming from all SCADA topics');
}

main().catch((error) => {
    logger.fatal({ error }, 'Fatal error during startup — exiting');
    process.exit(1);
});
