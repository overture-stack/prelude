/**
 * Elasticsearch Bulk Operations Module
 *
 * Provides functions for bulk indexing operations in Elasticsearch.
 */

import { Client } from "@elastic/elasticsearch";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Interface for bulk operation options
 */
interface BulkOptions {
  /** Maximum number of retries for failed bulk operations */
  maxRetries?: number;

  /** Whether to refresh the index after the operation */
  refresh?: boolean;
}

/**
 * Sends a bulk write request to Elasticsearch.
 *
 * @param client - The Elasticsearch client instance
 * @param records - An array of records to be indexed
 * @param indexName - The name of the Elasticsearch index
 * @param onFailure - Callback function to handle failed records
 * @param options - Optional configuration for bulk operations
 * @throws Error after all retries are exhausted
 */
export async function sendBulkWriteRequest(
  client: Client,
  records: object[],
  indexName: string,
  onFailure: (count: number) => void,
  options: BulkOptions = {}
): Promise<void> {
  const maxRetries = options.maxRetries || 3;
  const refresh = options.refresh !== undefined ? options.refresh : true;

  let attempt = 0;
  let success = false;

  while (attempt < maxRetries && !success) {
    try {
      const body = records.flatMap((doc) => [
        { index: { _index: indexName } },
        doc,
      ]);

      const { body: result } = await client.bulk({
        body,
        refresh,
      });

      if (result.errors) {
        let failureCount = 0;
        result.items.forEach((item: any, index: number) => {
          if (item.index?.error) {
            failureCount++;
            Logger.error(
              `Bulk indexing error for record ${index}: status=${
                item.index.status
              }, error=${JSON.stringify(item.index.error)}, document=${
                item.index._id
              }`
            );
          }
        });

        onFailure(failureCount);

        // If some records succeeded, consider it a partial success
        if (failureCount < records.length) {
          success = true;
        } else {
          attempt++;
        }
      } else {
        success = true;
      }
    } catch (error) {
      Logger.error(
        `Error sending to Elasticsearch (Attempt ${attempt + 1}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      onFailure(records.length);
      attempt++;

      if (attempt < maxRetries) {
        Logger.info(`Retrying... (${attempt}/${maxRetries})`);
        // Add backoff delay between retries
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  if (!success) {
    Logger.error(`Failed to send bulk request after ${maxRetries} attempts.`);
    throw new ConductorError(
      "Failed to send bulk request after retries",
      ErrorCodes.ES_ERROR
    );
  }
}
