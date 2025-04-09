import { Client, ClientOptions } from "@elastic/elasticsearch";
import { Logger } from "./logger";
import { ConductorError, ErrorCodes } from "./errors";

/**
 * Creates an Elasticsearch client using the provided configuration.
 *
 * @param url - Elasticsearch server URL
 * @param username - Optional username for authentication
 * @param password - Optional password for authentication
 * @returns A configured Elasticsearch client instance.
 */
export function createElasticsearchClient(options: {
  url: string;
  username?: string;
  password?: string;
}): Client {
  const clientConfig: ClientOptions = {
    node: options.url,
    requestTimeout: 10000, // 10 seconds timeout
  };

  if (options.username && options.password) {
    clientConfig.auth = {
      username: options.username,
      password: options.password,
    };
  }

  try {
    const client = new Client(clientConfig);
    return client;
  } catch (error) {
    Logger.error(`Failed to create Elasticsearch client: ${error}`);
    throw new ConductorError(
      `Failed to create Elasticsearch client: ${error}`,
      ErrorCodes.CONNECTION_ERROR,
      error
    );
  }
}

/**
 * Validates connection to Elasticsearch
 *
 * @param client - Elasticsearch client instance
 * @returns Promise resolving to connection status
 */
export async function validateElasticsearchConnection(
  client: Client
): Promise<boolean> {
  try {
    const result = await client.info();
    Logger.debug(
      `Elasticsearch cluster info: ${JSON.stringify(result.body, null, 2)}`
    );
    return true;
  } catch (error) {
    Logger.error(`Detailed Elasticsearch connection validation error:`, error);

    // More comprehensive error logging
    if (error instanceof Error) {
      Logger.error(`Error name: ${error.name}`);
      Logger.error(`Error message: ${error.message}`);

      // Additional error details
      if ("response" in error) {
        const detailedError = error as any;
        Logger.error(`Response status: ${detailedError.response?.status}`);
        Logger.error(
          `Response data: ${JSON.stringify(detailedError.response?.data)}`
        );
      }
    }

    return false;
  }
}
