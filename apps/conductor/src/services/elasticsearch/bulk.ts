import { Client } from "@elastic/elasticsearch";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Options for bulk operations
 */
export interface BulkOptions {
  maxRetries?: number;
  refresh?: boolean;
}

/**
 * Represents a grouped error for better readability
 */
interface ErrorGroup {
  count: number;
  type: string;
  reason: string;
  field: string;
  value: string;
}

/**
 * Sends a batch of records to Elasticsearch with error grouping
 *
 * @param client - Elasticsearch client
 * @param records - Records to send
 * @param indexName - Target index
 * @param onFailure - Callback to track failed records
 * @param options - Bulk operation options
 */
export async function sendBatchToElasticsearch(
  client: Client,
  records: object[],
  indexName: string,
  onFailure: (count: number) => void,
  options?: BulkOptions
): Promise<void> {
  if (records.length === 0) {
    Logger.debug("No records to send to Elasticsearch");
    return;
  }

  try {
    Logger.debug(`Sending batch of ${records.length} records to index: ${indexName}`);
    await sendBulkWriteRequest(client, records, indexName, onFailure, options);
  } catch (error) {
    throw new ConductorError(
      "Data format doesn't match index mapping",
      ErrorCodes.ES_ERROR,
      error
    );
  }
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
  const maxRetries = options.maxRetries || 1; // Default to just 1 retry for cleaner output
  const refresh = options.refresh !== undefined ? options.refresh : true;

  let attempt = 0;
  let success = false;
  let lastError = null;
  let errorGroups: Record<string, ErrorGroup> = {};

  while (attempt < maxRetries && !success) {
    try {
      Logger.debug(`Sending batch of ${records.length} records (attempt ${attempt + 1}/${maxRetries})`);
      
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
        errorGroups = {};
        
        // Group errors by type and field
        result.items.forEach((item: any) => {
          if (item.index?.error) {
            failureCount++;
            
            const error = item.index.error;
            const reason = error.reason || '';
            
            // Extract field name from error message
            let field = 'unknown';
            if (reason.includes('field [')) {
              const fieldMatch = reason.match(/field \[([^\]]+)\]/);
              if (fieldMatch && fieldMatch[1]) {
                field = fieldMatch[1];
              }
            }
            
            // Extract value from error message
            let value = 'unknown';
            if (reason.includes('value:')) {
              const valueMatch = reason.match(/value: '([^']+)'/);
              if (valueMatch && valueMatch[1]) {
                value = valueMatch[1];
              }
            }
            
            // Create a key based on error type and field
            const key = `${error.type}_${field}`;
            
            if (!errorGroups[key]) {
              errorGroups[key] = {
                count: 0,
                type: error.type,
                reason: reason,
                field: field,
                value: value
              };
            }
            
            errorGroups[key].count++;
          }
        });

        // Call onFailure with the number of failed records
        onFailure(failureCount);
        lastError = errorGroups;

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
      attempt++;
      lastError = error;
      onFailure(records.length);
      
      if (attempt < maxRetries) {
        Logger.debug(`Retrying after error: ${error instanceof Error ? error.message : String(error)}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  if (!success) {
    // Display error summary
    const totalErrors = Object.values(errorGroups).reduce((sum, group) => sum + group.count, 0);
    
    if (totalErrors > 0) {
      Logger.error(`Bulk indexing failed - ${totalErrors} records`);
      
      // Display most common errors as warnings, each on a new line
      Object.values(errorGroups)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3) // Show top 3 most common errors
        .forEach(group => {
          // Create more user-friendly error messages
          let message = "";
          
          if (group.type === 'mapper_parsing_exception') {
            if (group.field.includes('boolean') || group.reason.includes('boolean')) {
              message = `Field '${group.field}' must be boolean (true/false), found numeric value '${group.value}'`;
            } else if (group.field.includes('date') || group.reason.includes('date')) {
              message = `Field '${group.field}' requires valid date format, found '${group.value}'`;
            } else {
              message = `Field '${group.field}' has invalid data type, found '${group.value}'`;
            }
          } else {
            message = group.reason;
          }
          
          // Log each warning on a new line
          Logger.warn(message);
        });
    } else if (lastError instanceof Error) {
      console.log("\n");
      Logger.error(`Bulk indexing failed - ${lastError.message}`);
      console.log("");
    } else {
      console.log("\n");
      Logger.error("Bulk indexing failed - unknown error");
      console.log("");
    }
    
    throw new ConductorError(
      "Data format doesn't match index mapping",
      ErrorCodes.ES_ERROR,
      {
        details: errorGroups
      }
    );
  }
}