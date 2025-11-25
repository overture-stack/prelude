/**
 * Elasticsearch Client Module
 *
 * Provides functions for creating and managing Elasticsearch client connections.
 */

import { Client, ClientOptions } from "@elastic/elasticsearch";
import { Config } from "../../types/cli";
import { ErrorFactory } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Interface for Elasticsearch client options
 */
interface ESClientOptions {
  url: string;
  username?: string;
  password?: string;
  requestTimeout?: number;
}

/**
 * Creates an Elasticsearch client from application config.
 *
 * @param config - Application configuration
 * @returns A configured Elasticsearch client instance
 */
export function createClientFromConfig(config: Config): Client {
  // Use a default localhost URL if no URL is provided
  const url = config.elasticsearch.url || "http://localhost:9200";

  Logger.debug`Connecting to Elasticsearch at: ${url}`;

  return createClient({
    url,
    username: config.elasticsearch.user,
    password: config.elasticsearch.password,
  });
}

/**
 * Validates connection to Elasticsearch
 *
 * @param client - Elasticsearch client instance
 * @returns Promise resolving to true if connection is valid
 * @throws ConductorError if connection fails
 */
export async function validateConnection(client: Client): Promise<boolean> {
  try {
    const result = await client.info();
    Logger.debug`Connected to Elasticsearch cluster: ${result.body.cluster_name}`;
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw ErrorFactory.connection(
      "Failed to connect to Elasticsearch",
      { originalError: error },
      [
        "Check that Elasticsearch is running",
        "Verify the URL and credentials",
        "Check network connectivity",
        "Review firewall and security settings",
      ]
    );
  }
}

/**
 * Creates an Elasticsearch client using the provided configuration.
 * Private helper function for createClientFromConfig.
 *
 * @param options - Configuration options for the Elasticsearch client
 * @returns A configured Elasticsearch client instance
 * @throws ConductorError if client creation fails
 */
function createClient(options: ESClientOptions): Client {
  const clientOptions: ClientOptions = {
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
    return new Client(clientOptions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw ErrorFactory.connection(
      "Failed to create Elasticsearch client",
      { originalError: error },
      [
        "Check Elasticsearch configuration",
        "Verify URL format and credentials",
        "Ensure network connectivity",
      ]
    );
  }
}
