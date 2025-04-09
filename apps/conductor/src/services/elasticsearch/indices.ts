/**
 * Elasticsearch Indices Module
 *
 * Provides functions for managing Elasticsearch indices.
 */

import { Client } from "@elastic/elasticsearch";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Checks if an index exists in Elasticsearch
 *
 * @param client - Elasticsearch client
 * @param indexName - Name of the index to check
 * @returns Promise resolving to true if index exists, false otherwise
 * @throws ConductorError if the check fails
 */
export async function indexExists(
  client: Client,
  indexName: string
): Promise<boolean> {
  try {
    const response = await client.indices.exists({ index: indexName });
    return response.body;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `Failed to check if index ${indexName} exists: ${errorMessage}`,
      ErrorCodes.ES_ERROR,
      error
    );
  }
}

/**
 * Creates an index in Elasticsearch
 *
 * @param client - Elasticsearch client
 * @param indexName - Name of the index to create
 * @param settings - Optional index settings and mappings
 * @throws ConductorError if index creation fails
 */
export async function createIndex(
  client: Client,
  indexName: string,
  settings?: Record<string, any>
): Promise<void> {
  try {
    await client.indices.create({
      index: indexName,
      body: settings,
    });
    Logger.info(`Created index: ${indexName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `Failed to create index ${indexName}: ${errorMessage}`,
      ErrorCodes.ES_ERROR,
      error
    );
  }
}

/**
 * Deletes an index from Elasticsearch
 *
 * @param client - Elasticsearch client
 * @param indexName - Name of the index to delete
 * @throws ConductorError if index deletion fails
 */
export async function deleteIndex(
  client: Client,
  indexName: string
): Promise<void> {
  try {
    await client.indices.delete({ index: indexName });
    Logger.info(`Deleted index: ${indexName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `Failed to delete index ${indexName}: ${errorMessage}`,
      ErrorCodes.ES_ERROR,
      error
    );
  }
}

/**
 * Updates settings for an existing index
 *
 * @param client - Elasticsearch client
 * @param indexName - Name of the index to update
 * @param settings - Settings to apply to the index
 * @throws ConductorError if settings update fails
 */
export async function updateIndexSettings(
  client: Client,
  indexName: string,
  settings: Record<string, any>
): Promise<void> {
  try {
    await client.indices.putSettings({
      index: indexName,
      body: settings,
    });
    Logger.info(`Updated settings for index: ${indexName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `Failed to update settings for index ${indexName}: ${errorMessage}`,
      ErrorCodes.ES_ERROR,
      error
    );
  }
}
