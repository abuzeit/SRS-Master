/**
 * =============================================================================
 * SRS Master — Kafka Client Factory (Producer)
 * =============================================================================
 *
 * Creates a KafkaJS client instance configured for industrial-grade security:
 *
 *   1. TLS — All broker communication is encrypted
 *   2. SASL/SCRAM-SHA-512 — Challenge-response authentication
 *   3. Connection resilience — Automatic reconnection with backoff
 *
 * ISA-95 Context:
 *   This client runs on Level-2 SCADA nodes and establishes secure
 *   connections to the Level-3 Kafka backbone.
 * =============================================================================
 */

import { Kafka, logLevel, type KafkaConfig, type SASLOptions } from 'kafkajs';
import * as fs from 'node:fs';
import pino from 'pino';

const logger = pino({ name: 'kafka-client' });

/**
 * Reads a TLS certificate file from disk.
 * Returns undefined if the path is not configured (allows running without TLS in dev).
 */
function readCertFile(envVar: string): Buffer | undefined {
    const filePath = process.env[envVar];
    if (!filePath) {
        logger.warn(`TLS cert path not set: ${envVar} — running without TLS`);
        return undefined;
    }
    if (!fs.existsSync(filePath)) {
        throw new Error(`TLS certificate file not found: ${filePath} (env: ${envVar})`);
    }
    return fs.readFileSync(filePath);
}

/**
 * Creates a configured KafkaJS client instance.
 *
 * Configuration is entirely environment-driven — no hardcoded secrets.
 *
 * Required environment variables:
 *   KAFKA_BROKERS          — Comma-separated broker addresses
 *   KAFKA_CLIENT_ID        — Unique client identifier
 *   KAFKA_SASL_USERNAME    — SCRAM-SHA-512 username
 *   KAFKA_SASL_PASSWORD    — SCRAM-SHA-512 password
 *
 * Optional environment variables:
 *   KAFKA_SSL_CA_PATH      — Path to CA certificate (PEM)
 *   KAFKA_SSL_CERT_PATH    — Path to client certificate (PEM)
 *   KAFKA_SSL_KEY_PATH     — Path to client private key (PEM)
 */
export function createKafkaClient(): Kafka {
    // Parse broker list from environment
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
        .split(',')
        .map((b) => b.trim());

    const clientId = process.env.KAFKA_CLIENT_ID ?? `scada-producer-${process.pid}`;

    // Build SASL configuration
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
    } else {
        logger.warn('SASL authentication disabled — credentials not provided');
    }

    // Build TLS configuration
    const ca = readCertFile('KAFKA_SSL_CA_PATH');
    const cert = readCertFile('KAFKA_SSL_CERT_PATH');
    const key = readCertFile('KAFKA_SSL_KEY_PATH');

    const ssl = ca
        ? {
            rejectUnauthorized: true,
            ca: [ca],
            cert: cert,
            key: key,
        }
        : undefined;

    if (ssl) {
        logger.info('TLS encryption enabled for all Kafka traffic');
    }

    // Build Kafka client config
    const config: KafkaConfig = {
        clientId,
        brokers,
        ssl: ssl ?? false,
        sasl,

        // Connection resilience for 24/7 operation
        connectionTimeout: 10_000,
        requestTimeout: 30_000,
        retry: {
            initialRetryTime: 300,
            retries: 10,
            maxRetryTime: 30_000,
            factor: 0.2,
            multiplier: 2,
        },

        // Map KafkaJS log levels to pino
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

    logger.info({ brokers, clientId }, 'Creating Kafka client');
    return new Kafka(config);
}
