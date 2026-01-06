"use strict";
// src/services/postgresql/client.ts
/**
 * PostgreSQL Client Module
 *
 * Provides functions for creating and managing PostgreSQL client connections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConnection = exports.createPostgresClient = void 0;
const pg_1 = require("pg");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
/**
 * Creates a PostgreSQL client from application config.
 *
 * @param config - Application configuration
 * @returns A configured PostgreSQL Pool instance
 */
function createPostgresClient(config) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    // Build connection options from config
    const options = {};
    // Use connection string if provided, otherwise build from individual parts
    if ((_a = config.postgresql) === null || _a === void 0 ? void 0 : _a.connectionString) {
        options.connectionString = config.postgresql.connectionString;
        logger_1.Logger.debug `Using PostgreSQL connection string`;
    }
    else {
        options.host = ((_b = config.postgresql) === null || _b === void 0 ? void 0 : _b.host) || process.env.POSTGRES_HOST || "localhost";
        options.port = ((_c = config.postgresql) === null || _c === void 0 ? void 0 : _c.port) || parseInt(process.env.POSTGRES_PORT || "5432");
        options.database = ((_d = config.postgresql) === null || _d === void 0 ? void 0 : _d.database) || process.env.POSTGRES_DB || "postgres";
        options.user = ((_e = config.postgresql) === null || _e === void 0 ? void 0 : _e.user) || process.env.POSTGRES_USER || "postgres";
        options.password = ((_f = config.postgresql) === null || _f === void 0 ? void 0 : _f.password) || process.env.POSTGRES_PASSWORD || "postgres";
        options.ssl = ((_g = config.postgresql) === null || _g === void 0 ? void 0 : _g.ssl) || process.env.POSTGRES_SSL === "true" || false;
        logger_1.Logger.debug `Connecting to PostgreSQL at: ${options.host}:${options.port}/${options.database}`;
    }
    // Set pool options
    options.max = ((_h = config.postgresql) === null || _h === void 0 ? void 0 : _h.maxConnections) || 20;
    options.idleTimeoutMillis = ((_j = config.postgresql) === null || _j === void 0 ? void 0 : _j.idleTimeoutMillis) || 30000;
    options.connectionTimeoutMillis =
        ((_k = config.postgresql) === null || _k === void 0 ? void 0 : _k.connectionTimeoutMillis) || 10000;
    try {
        return new pg_1.Pool(options);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw errors_1.ErrorFactory.connection("Failed to create PostgreSQL client", { originalError: error, options: { ...options, password: "***" } }, [
            "Check PostgreSQL configuration",
            "Verify connection details and credentials",
            "Ensure network connectivity",
        ]);
    }
}
exports.createPostgresClient = createPostgresClient;
/**
 * Validates connection to PostgreSQL
 *
 * @param client - PostgreSQL Pool instance
 * @param config - Application configuration (optional, for better error messages)
 * @returns Promise resolving to true if connection is valid
 * @throws ConductorError if connection fails
 */
async function validateConnection(client, config) {
    try {
        logger_1.Logger.debug `Testing PostgreSQL connection`;
        const result = await client.query("SELECT version(), current_database(), current_user");
        const { version, current_database, current_user } = result.rows[0];
        logger_1.Logger.debug `Connected to PostgreSQL successfully`;
        logger_1.Logger.debug `Database: ${current_database}, User: ${current_user}`;
        logger_1.Logger.debug `Version: ${version}`;
        return true;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Build connection info for error messages
        const connectionInfo = (config === null || config === void 0 ? void 0 : config.postgresql) ?
            `${config.postgresql.host}:${config.postgresql.port}/${config.postgresql.database}` :
            "host:port/database";
        const connectionFlags = (config === null || config === void 0 ? void 0 : config.postgresql) ?
            `--db-host ${config.postgresql.host}:${config.postgresql.port} --db-name ${config.postgresql.database} --db-user ${config.postgresql.user}` :
            "--db-host localhost:5435 --db-name overtureDb --db-user admin";
        // Categorize connection errors
        if (errorMessage.includes("ECONNREFUSED")) {
            throw errors_1.ErrorFactory.connection(`Connection refused to PostgreSQL at ${connectionInfo}`, { originalError: error }, [
                "Check that PostgreSQL is running",
                `Currently trying to connect to: ${connectionInfo}`,
                `Change connection with: ${connectionFlags}`,
                "Start PostgreSQL service if not running",
            ]);
        }
        if (errorMessage.includes("ENOTFOUND") ||
            errorMessage.includes("getaddrinfo")) {
            throw errors_1.ErrorFactory.connection(`PostgreSQL host not found: ${connectionInfo}`, { originalError: error }, [
                "Check the hostname spelling",
                `Currently trying to connect to: ${connectionInfo}`,
                `Change connection with: ${connectionFlags}`,
                "Try using an IP address instead of hostname",
            ]);
        }
        if (errorMessage.includes("authentication failed") ||
            errorMessage.includes("password")) {
            throw errors_1.ErrorFactory.auth(`PostgreSQL authentication failed for ${connectionInfo}`, { originalError: error }, [
                "Check username and password",
                `Currently trying to connect to: ${connectionInfo}`,
                `Change credentials with: ${connectionFlags} --db-pass your_password`,
                "Verify user has access to the database",
            ]);
        }
        if (errorMessage.includes("database") &&
            errorMessage.includes("does not exist")) {
            throw errors_1.ErrorFactory.validation(`PostgreSQL database does not exist: ${connectionInfo}`, { originalError: error }, [
                "Check the database name spelling",
                `Currently trying to connect to: ${connectionInfo}`,
                `Change database with: ${connectionFlags}`,
                "Create the database if it doesn't exist",
            ]);
        }
        if (errorMessage.includes("timeout") ||
            errorMessage.includes("ETIMEDOUT")) {
            throw errors_1.ErrorFactory.connection(`Connection timeout to PostgreSQL at ${connectionInfo}`, { originalError: error }, [
                "Check network connectivity",
                `Currently trying to connect to: ${connectionInfo}`,
                `Change connection with: ${connectionFlags}`,
                "Verify PostgreSQL is responding",
            ]);
        }
        // Generic connection error
        throw errors_1.ErrorFactory.connection(`Failed to connect to PostgreSQL at ${connectionInfo}`, { originalError: error }, [
            "Check PostgreSQL configuration and status",
            `Currently trying to connect to: ${connectionInfo}`,
            `Change connection with: ${connectionFlags}`,
            "Verify PostgreSQL is running and accessible",
        ]);
    }
}
exports.validateConnection = validateConnection;
