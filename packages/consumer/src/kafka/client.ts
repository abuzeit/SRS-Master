/**
 * =============================================================================
 * SRS Master — Kafka Client Factory (Consumer)
 * =============================================================================
 *
 * Creates a KafkaJS client for the master aggregation station.
 * Security configuration is identical to the producer client:
 *   - TLS encryption for all traffic
 *   - SASL/SCRAM-SHA-512 authentication
 *   - Environment-driven configuration
 *
 * ISA-95 Context:
 *   This client runs on the Level-3 master station and consumes
 *   data from the Level-2/Level-3 Kafka backbone.
 * =============================================================================
 */

import { Kafka, logLevel, type KafkaConfig, type SASLOptions } from 'kafkajs';
import * as fs from 'node:fs';
import pino from 'pino';

const logger = pino({ name: 'kafka-consumer-client' });

function readCertFile(envVar: string): Buffer | undefined {
    const filePath = process.env[envVar];
    if (!filePath) return undefined;
    if (!fs.existsSync(filePath)) {
        throw new Error(`TLS certificate file not found: ${filePath} (env: ${envVar})`);
    }
    return fs.readFileSync(filePath);
}

/**
 * Creates a configured KafkaJS client instance for the consumer.
 *
 * Required environment variables:
 *   KAFKA_BROKERS          — Comma-separated broker addresses
 *   KAFKA_CLIENT_ID        — Unique client identifier
 *   KAFKA_SASL_USERNAME    — SCRAM-SHA-512 username
 *   KAFKA_SASL_PASSWORD    — SCRAM-SHA-512 password
 */
export function createConsumerKafkaClient(): Kafka {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
        .split(',')
        .map((b) => b.trim());

    const clientId = process.env.KAFKA_CLIENT_ID ?? 'master-aggregator';

    // SASL configuration
    const saslUsername = process.env.KAFKA_SASL_USERNAME;
    const saslPassword = process.env.KAFKA_SASL_PASSWORD;

    let sasl: SASLOptions | undefined;
    if (saslUsername && saslPassword) {
        sasl = {
            mechanism: 'scram-sha-512',
            username: saslUsername,
            password: saslPassword,
        };
        logger.info('SASL/SCRAM-SHA-512 authentication enabled');
    }

    // TLS configuration
    const ca = readCertFile('KAFKA_SSL_CA_PATH');
    const cert = readCertFile('KAFKA_SSL_CERT_PATH');
    const key = readCertFile('KAFKA_SSL_KEY_PATH');

    const ssl = ca
        ? { rejectUnauthorized: true, ca: [ca], cert, key }
        : undefined;

    const config: KafkaConfig = {
        clientId,
        brokers,
        ssl: ssl ?? false,
        sasl,
        connectionTimeout: 10_000,
        requestTimeout: 30_000,
        retry: {
            initialRetryTime: 300,
            retries: 10,
            maxRetryTime: 30_000,
            factor: 0.2,
            multiplier: 2,
        },
        logLevel: logLevel.INFO,
        logCreator: () => ({ namespace, level, log }) => {
            const pinoLevel =
                level === logLevel.ERROR || level === logLevel.NOTHING
                    ? 'error'
                    : level === logLevel.WARN
                        ? 'warn'
                        : level === logLevel.INFO
                            ? 'info'
                            : 'debug';
            logger[pinoLevel]({ namespace, ...log }, log.message);
        },
    };

    logger.info({ brokers, clientId }, 'Creating consumer Kafka client');
    return new Kafka(config);
}
