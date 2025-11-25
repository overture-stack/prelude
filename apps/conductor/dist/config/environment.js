"use strict";
// src/config/Environment.ts
/**
 * Centralized environment variable management
 * Replaces scattered process.env reads throughout the codebase
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
class Environment {
    /**
     * Get all service endpoints with fallback defaults
     */
    static get services() {
        if (!this._services) {
            this._services = {
                elasticsearch: {
                    url: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
                    user: process.env.ELASTICSEARCH_USER || "elastic",
                    password: process.env.ELASTICSEARCH_PASSWORD || "myelasticpassword",
                },
                postgresql: {
                    host: process.env.POSTGRES_HOST || "localhost",
                    port: parseInt(process.env.POSTGRES_PORT || "5432"),
                    database: process.env.POSTGRES_DATABASE || "conductor",
                    username: process.env.POSTGRES_USERNAME || "postgres",
                    password: process.env.POSTGRES_PASSWORD || "password",
                    table: process.env.POSTGRES_TABLE || "data",
                },
                lectern: {
                    url: process.env.LECTERN_URL || "http://localhost:3031",
                    authToken: process.env.LECTERN_AUTH_TOKEN || "",
                },
                lyric: {
                    url: process.env.LYRIC_URL || "http://localhost:3030",
                    categoryId: process.env.CATEGORY_ID || "1",
                    organization: process.env.ORGANIZATION || "OICR",
                },
                song: {
                    url: process.env.SONG_URL || "http://localhost:8080",
                    authToken: process.env.AUTH_TOKEN || "123",
                },
                score: {
                    url: process.env.SCORE_URL || "http://localhost:8087",
                    authToken: process.env.AUTH_TOKEN || "123",
                },
                maestro: {
                    url: process.env.INDEX_URL || "http://localhost:11235",
                },
            };
        }
        return this._services;
    }
    /**
     * Get default configuration values
     */
    static get defaults() {
        if (!this._defaults) {
            this._defaults = {
                elasticsearch: {
                    index: process.env.ELASTICSEARCH_INDEX || "conductor-data",
                    batchSize: parseInt(process.env.BATCH_SIZE || "1000"),
                    delimiter: process.env.CSV_DELIMITER || ",",
                },
                lyric: {
                    maxRetries: parseInt(process.env.MAX_RETRIES || "10"),
                    retryDelay: parseInt(process.env.RETRY_DELAY || "20000"),
                },
                timeouts: {
                    default: parseInt(process.env.DEFAULT_TIMEOUT || "10000"),
                    upload: parseInt(process.env.UPLOAD_TIMEOUT || "30000"),
                    healthCheck: parseInt(process.env.HEALTH_CHECK_TIMEOUT || "5000"),
                },
            };
        }
        return this._defaults;
    }
    /**
     * Check if we're in debug mode
     */
    static get isDebug() {
        return process.env.DEBUG === "true" || process.argv.includes("--debug");
    }
    /**
     * Get log level
     */
    static get logLevel() {
        return process.env.LOG_LEVEL || "info";
    }
    /**
     * Validate that required environment variables are set
     */
    static validateRequired(requiredVars) {
        const missing = requiredVars.filter((varName) => !process.env[varName]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
        }
    }
    /**
     * Get a specific service configuration with overrides
     */
    static getServiceConfig(serviceName, overrides = {}) {
        const baseConfig = this.services[serviceName];
        return {
            ...baseConfig,
            timeout: this.defaults.timeouts.default,
            retries: 1,
            ...overrides,
        };
    }
    /**
     * Reset cached values (useful for testing)
     */
    static reset() {
        this._services = null;
        this._defaults = null;
    }
}
exports.Environment = Environment;
Environment._services = null;
Environment._defaults = null;
