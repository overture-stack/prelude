import { Client } from "@elastic/elasticsearch";
import { Config } from "../../types";
import { Logger } from "../../utils/logger";
import { ConductorError, ErrorCodes } from "../../utils/errors";

/**
 * Creates an Elasticsearch client using the provided configuration.
 *
 * @param config - Configuration settings for Elasticsearch.
 * @returns A configured Elasticsearch client instance.
 */
export function createClient(config: Config): Client {
  const clientConfig: any = {
    node: config.elasticsearch.url,
  };

  if (config.elasticsearch.user && config.elasticsearch.password) {
    clientConfig.auth = {
      username: config.elasticsearch.user,
      password: config.elasticsearch.password,
    };
  }

  return new Client(clientConfig);
}

/**
 * Sends a bulk write request to Elasticsearch.
 *
 * @param client - The Elasticsearch client instance.
 * @param records - An array of records to be indexed.
 * @param indexName - The name of the Elasticsearch index.
 * @param onFailure - Callback function to handle failed records.
 */
export async function sendBulkWriteRequest(
  client: Client,
  records: object[],
  indexName: string,
  onFailure: (count: number) => void,
  maxRetries: number = 3
): Promise<void> {
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
        refresh: true,
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
      } else {
        success = true;
      }
    } catch (error) {
      Logger.error(
        `Error sending to Elasticsearch (Attempt ${attempt + 1}): ${error}`
      );
      onFailure(records.length);
      attempt++;
      if (attempt < maxRetries) {
        Logger.info(`Retrying... (${attempt}/${maxRetries})`);
      }
    }
  }

  if (!success) {
    Logger.error(`Failed to send bulk request after ${maxRetries} attempts.`);
    throw new Error("Failed to send bulk request after retries.");
  }
}

/**
 * Sends a batch of records to Elasticsearch using `sendBulkWriteRequest`.
 *
 * @param client - The Elasticsearch client instance.
 * @param records - An array of records to be indexed.
 * @param indexName - The name of the Elasticsearch index.
 * @param onFailure - Callback function to handle failed records.
 */
export async function sendBatchToElasticsearch(
  client: Client,
  records: object[],
  indexName: string,
  onFailure: (count: number) => void
): Promise<void> {
  try {
    Logger.debug(
      `Sending batch of ${records.length} records to index: ${indexName}`
    );
    await sendBulkWriteRequest(client, records, indexName, onFailure);
  } catch (error) {
    Logger.error(
      `Failed to send batch to Elasticsearch: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw new ConductorError(
      "Failed to send batch to Elasticsearch",
      ErrorCodes.CONNECTION_ERROR,
      error
    );
  }
}
