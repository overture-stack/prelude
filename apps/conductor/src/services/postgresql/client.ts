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
    options.host = config.postgresql?.host || "localhost";
    options.port = config.postgresql?.port || 5435; // Updated default
    options.database = config.postgresql?.database || "postgres";
    options.user = config.postgresql?.user || "admin"; // Updated default
    options.password = config.postgresql?.password || "admin123"; // Updated default
    options.ssl = config.postgresql?.ssl || false;

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
 * @returns Promise resolving to true if connection is valid
 * @throws ConductorError if connection fails
 */
export async function validateConnection(client: Pool): Promise<boolean> {
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

    // Categorize connection errors
    if (errorMessage.includes("ECONNREFUSED")) {
      throw ErrorFactory.connection(
        "Connection refused to PostgreSQL",
        { originalError: error },
        [
          "Check that PostgreSQL is running",
          "Verify the host and port are correct",
          "Check firewall settings",
        ]
      );
    }

    if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("getaddrinfo")
    ) {
      throw ErrorFactory.connection(
        "PostgreSQL host not found",
        { originalError: error },
        [
          "Check the hostname spelling",
          "Verify DNS resolution",
          "Try using an IP address instead",
        ]
      );
    }

    if (
      errorMessage.includes("authentication failed") ||
      errorMessage.includes("password")
    ) {
      throw ErrorFactory.auth(
        "PostgreSQL authentication failed",
        { originalError: error },
        [
          "Check username and password",
          "Verify user has access to the database",
          "Check pg_hba.conf configuration",
        ]
      );
    }

    if (
      errorMessage.includes("database") &&
      errorMessage.includes("does not exist")
    ) {
      throw ErrorFactory.validation(
        "PostgreSQL database does not exist",
        { originalError: error },
        [
          "Check the database name spelling",
          "Create the database if it doesn't exist",
          "Verify you have access to the database",
        ]
      );
    }

    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      throw ErrorFactory.connection(
        "Connection timeout to PostgreSQL",
        { originalError: error },
        [
          "Check network connectivity",
          "Verify PostgreSQL is responding",
          "Consider increasing timeout values",
        ]
      );
    }

    // Generic connection error
    throw ErrorFactory.connection(
      "Failed to connect to PostgreSQL",
      { originalError: error },
      [
        "Check PostgreSQL configuration and status",
        "Verify connection details",
        "Review PostgreSQL logs for errors",
      ]
    );
  }
}
