"use strict";
/**
 * Elasticsearch Client Module
 *
 * Provides functions for creating and managing Elasticsearch client connections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConnection = exports.createClientFromConfig = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
/**
 * Creates an Elasticsearch client from application config.
 *
 * @param config - Application configuration
 * @returns A configured Elasticsearch client instance
 */
function createClientFromConfig(config) {
    // Use a default localhost URL if no URL is provided
    const url = config.elasticsearch.url || "http://localhost:9200";
    logger_1.Logger.debug `Connecting to Elasticsearch at: ${url}`;
    return createClient({
        url,
        username: config.elasticsearch.user,
        password: config.elasticsearch.password,
    });
}
exports.createClientFromConfig = createClientFromConfig;
/**
 * Validates connection to Elasticsearch
 *
 * @param client - Elasticsearch client instance
 * @returns Promise resolving to true if connection is valid
 * @throws ConductorError if connection fails
 */
async function validateConnection(client) {
    try {
        const result = await client.info();
        logger_1.Logger.debug `Connected to Elasticsearch cluster: ${result.body.cluster_name}`;
        return true;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw errors_1.ErrorFactory.connection("Failed to connect to Elasticsearch", { originalError: error }, [
            "Check that Elasticsearch is running",
            "Verify the URL and credentials",
            "Check network connectivity",
            "Review firewall and security settings",
        ]);
    }
}
exports.validateConnection = validateConnection;
/**
 * Creates an Elasticsearch client using the provided configuration.
 * Private helper function for createClientFromConfig.
 *
 * @param options - Configuration options for the Elasticsearch client
 * @returns A configured Elasticsearch client instance
 * @throws ConductorError if client creation fails
 */
function createClient(options) {
    const clientOptions = {
        node: options.url,
        requestTimeout: options.requestTimeout || 10000, // 10 seconds timeout
    };
    if (options.username && options.password) {
        clientOptions.auth = {
            username: options.username,
            password: options.password,
        };
    }
    try {
        return new elasticsearch_1.Client(clientOptions);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw errors_1.ErrorFactory.connection("Failed to create Elasticsearch client", { originalError: error }, [
            "Check Elasticsearch configuration",
            "Verify URL format and credentials",
            "Ensure network connectivity",
        ]);
    }
}
