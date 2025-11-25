// src/services/postgresql/client.ts
/**
 * PostgreSQL Client Module
 *
 * Provides functions for creating and managing PostgreSQL client connections.
 */

import { Pool, Client } from "pg";
import { Config } from "../../types/cli";
import { ErrorFactory } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Interface for PostgreSQL client options
 */
interface PostgresClientOptions {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Creates a PostgreSQL client from application config.
 *
 * @param config - Application configuration
 * @returns A configured PostgreSQL Pool instance
 */
export function createPostgresClient(config: Config): Pool {
  // Build connection options from config
  const options: PostgresClientOptions = {};

  // Use connection string if provided, otherwise build from individual parts
  if (config.postgresql?.connectionString) {
    options.connectionString = config.postgresql.connectionString;
    Logger.debug`Using PostgreSQL connection string`;
  } else {
    options.host = config.postgresql?.host || process.env.POSTGRES_HOST || "localhost";
    options.port = config.postgresql?.port || parseInt(process.env.POSTGRES_PORT || "5432");
    options.database = config.postgresql?.database || process.env.POSTGRES_DB || "postgres";
    options.user = config.postgresql?.user || process.env.POSTGRES_USER || "postgres";
    options.password = config.postgresql?.password || process.env.POSTGRES_PASSWORD || "postgres";
    options.ssl = config.postgresql?.ssl || process.env.POSTGRES_SSL === "true" || false;

    Logger.debug`Connecting to PostgreSQL at: ${options.host}:${options.port}/${options.database}`;
  }

  // Set pool options
  options.max = config.postgresql?.maxConnections || 20;
  options.idleTimeoutMillis = config.postgresql?.idleTimeoutMillis || 30000;
  options.connectionTimeoutMillis =
    config.postgresql?.connectionTimeoutMillis || 10000;

  try {
    return new Pool(options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw ErrorFactory.connection(
      "Failed to create PostgreSQL client",
      { originalError: error, options: { ...options, password: "***" } },
      [
        "Check PostgreSQL configuration",
        "Verify connection details and credentials",
        "Ensure network connectivity",
      ]
    );
  }
}

/**
 * Validates connection to PostgreSQL
 *
 * @param client - PostgreSQL Pool instance
 * @param config - Application configuration (optional, for better error messages)
 * @returns Promise resolving to true if connection is valid
 * @throws ConductorError if connection fails
 */
export async function validateConnection(client: Pool, config?: Config): Promise<boolean> {
  try {
    Logger.debug`Testing PostgreSQL connection`;

    const result = await client.query(
      "SELECT version(), current_database(), current_user"
    );
    const { version, current_database, current_user } = result.rows[0];

    Logger.debug`Connected to PostgreSQL successfully`;
    Logger.debug`Database: ${current_database}, User: ${current_user}`;
    Logger.debug`Version: ${version}`;

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Build connection info for error messages
    const connectionInfo = config?.postgresql ?
      `${config.postgresql.host}:${config.postgresql.port}/${config.postgresql.database}` :
      "host:port/database";

    const connectionFlags = config?.postgresql ?
      `--db-host ${config.postgresql.host}:${config.postgresql.port} --db-name ${config.postgresql.database} --db-user ${config.postgresql.user}` :
      "--db-host localhost:5435 --db-name overtureDb --db-user admin";

    // Categorize connection errors
    if (errorMessage.includes("ECONNREFUSED")) {
      throw ErrorFactory.connection(
        `Connection refused to PostgreSQL at ${connectionInfo}`,
        { originalError: error },
        [
          "Check that PostgreSQL is running",
          `Currently trying to connect to: ${connectionInfo}`,
          `Change connection with: ${connectionFlags}`,
          "Start PostgreSQL service if not running",
        ]
      );
    }

    if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("getaddrinfo")
    ) {
      throw ErrorFactory.connection(
        `PostgreSQL host not found: ${connectionInfo}`,
        { originalError: error },
        [
          "Check the hostname spelling",
          `Currently trying to connect to: ${connectionInfo}`,
          `Change connection with: ${connectionFlags}`,
          "Try using an IP address instead of hostname",
        ]
      );
    }

    if (
      errorMessage.includes("authentication failed") ||
      errorMessage.includes("password")
    ) {
      throw ErrorFactory.auth(
        `PostgreSQL authentication failed for ${connectionInfo}`,
        { originalError: error },
        [
          "Check username and password",
          `Currently trying to connect to: ${connectionInfo}`,
          `Change credentials with: ${connectionFlags} --db-pass your_password`,
          "Verify user has access to the database",
        ]
      );
    }

    if (
      errorMessage.includes("database") &&
      errorMessage.includes("does not exist")
    ) {
      throw ErrorFactory.validation(
        `PostgreSQL database does not exist: ${connectionInfo}`,
        { originalError: error },
        [
          "Check the database name spelling",
          `Currently trying to connect to: ${connectionInfo}`,
          `Change database with: ${connectionFlags}`,
          "Create the database if it doesn't exist",
        ]
      );
    }

    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      throw ErrorFactory.connection(
        `Connection timeout to PostgreSQL at ${connectionInfo}`,
        { originalError: error },
        [
          "Check network connectivity",
          `Currently trying to connect to: ${connectionInfo}`,
          `Change connection with: ${connectionFlags}`,
          "Verify PostgreSQL is responding",
        ]
      );
    }

    // Generic connection error
    throw ErrorFactory.connection(
      `Failed to connect to PostgreSQL at ${connectionInfo}`,
      { originalError: error },
      [
        "Check PostgreSQL configuration and status",
        `Currently trying to connect to: ${connectionInfo}`,
        `Change connection with: ${connectionFlags}`,
        "Verify PostgreSQL is running and accessible",
      ]
    );
  }
}