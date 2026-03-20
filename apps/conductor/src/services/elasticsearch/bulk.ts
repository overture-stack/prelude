/**
 * Elasticsearch Bulk Operations Module
 *
 * Provides functions for bulk indexing operations in Elasticsearch.
 * Updated with concise error handling and optional verbose logging.
 */

import { Client } from "@elastic/elasticsearch";
import { ErrorFactory } from "../../utils/errors";
import { Logger } from "../../utils/logger";
import * as fs from "fs";
import * as path from "path";

/**
 * Interface for bulk operation options
 */
interface BulkOptions {
  /** Maximum number of retries for failed bulk operations */
  maxRetries?: number;

  /** Whether to refresh the index after the operation */
  refresh?: boolean;

  /** Whether to write detailed errors to a log file */
  writeErrorLog?: boolean;

  /** Directory for error log files */
  errorLogDir?: string;
}

/**
 * Interface for documents with optional IDs for upsert behavior
 */
interface DocumentWithId {
  _id?: string | number;
  [key: string]: unknown;
}

/** Shape of a single item in the Elasticsearch bulk response */
interface BulkResponseItem {
  index?: {
    _id?: string;
    status?: number;
    result?: string;
    error?: { type: string; reason: string };
  };
}

/**
 * Interface for tracking error patterns
 */
interface ErrorPattern {
  type: string;
  field: string;
  reason: string;
  count: number;
  sampleValues: string[];
  sampleDocuments: string[];
}

/**
 * Sends a bulk write request to Elasticsearch.
 * Supports upsert behavior by including document IDs when available.
 *
 * @param client - The Elasticsearch client instance
 * @param records - An array of records to be indexed (can include _id field for upserts)
 * @param indexName - The name of the Elasticsearch index
 * @param onFailure - Callback function to handle failed records
 * @param options - Optional configuration for bulk operations
 * @throws Error after all retries are exhausted
 */
export async function sendBulkWriteRequest(
  client: Client,
  records: DocumentWithId[],
  indexName: string,
  onFailure: (count: number) => void,
  options: BulkOptions = {},
  onIndexed?: (created: number, updated: number) => void
): Promise<void> {
  const maxRetries = options.maxRetries || 3;
  const refresh = options.refresh !== undefined ? options.refresh : true;

  let hasDisplayedErrorSummary = false;
  let attempt = 0;
  let success = false;
  let lastErrorAnalysis: { patterns: ErrorPattern[]; totalErrors: number } | null = null;

  // Build bulk body once — records don't change between retry attempts
  const body: Record<string, unknown>[] = new Array(records.length * 2);
  let bi = 0;
  for (const doc of records) {
    const { _id, ...docBody } = doc;
    body[bi++] = _id
      ? { index: { _index: indexName, _id: String(_id) } }
      : { index: { _index: indexName } };
    body[bi++] = docBody;
  }

  while (attempt < maxRetries && !success) {
    try {

      const { body: result } = await client.bulk({
        body,
        refresh,
      });

      if (onIndexed) {
        let created = 0;
        let updated = 0;
        result.items.forEach((item: BulkResponseItem) => {
          if (item.index?.result === "created") created++;
          else if (item.index?.result === "updated") updated++;
        });
        onIndexed(created, updated);
      }

      if (result.errors) {
        const errorAnalysis = analyzeErrors(result.items);
        lastErrorAnalysis = errorAnalysis;

        // Write detailed errors to log file if requested
        let logFileName = "";
        if (options.writeErrorLog !== false) {
          logFileName = await writeErrorLogFile(
            errorAnalysis,
            result.items,
            indexName,
            options.errorLogDir
          );
        }

        // Show concise error summary in terminal (only once)
        if (!hasDisplayedErrorSummary) {
          displayConciseErrorSummary(errorAnalysis, logFileName);
          hasDisplayedErrorSummary = true;
        }

        // If some records succeeded, consider it a partial success
        if (errorAnalysis.totalErrors < records.length) {
          onFailure(errorAnalysis.totalErrors);
          success = true;
        } else {
          attempt++;
          // Only count failures once — on the final attempt
          if (attempt >= maxRetries) {
            onFailure(errorAnalysis.totalErrors);
          }
        }
      } else {
        success = true;
      }
    } catch (error) {
      // Only show retry messages in debug mode
      Logger.debugString(
        `Error sending to Elasticsearch (Attempt ${attempt + 1}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      attempt++;
      // Only count failures once — on the final attempt
      if (attempt >= maxRetries) {
        onFailure(records.length);
      }

      if (attempt < maxRetries) {
        Logger.debugString(`Retrying... (${attempt}/${maxRetries})`);
        // Add backoff delay between retries
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  if (!success) {
    throw ErrorFactory.elasticsearch(
      "Data type validation failed - all records rejected",
      {
        maxRetries,
        recordCount: records.length,
        indexName,
        errorSummary: lastErrorAnalysis,
      },
      [
        "Fix the data types in your CSV file",
        "Check the sample values shown above",
        "Ensure data matches the Elasticsearch field types",
      ]
    );
  }
}

/**
 * Analyzes bulk operation errors and groups them by pattern
 */
function analyzeErrors(items: BulkResponseItem[]): {
  patterns: ErrorPattern[];
  totalErrors: number;
} {
  const errorPatterns = new Map<string, ErrorPattern>();
  let totalErrors = 0;

  items.forEach((item: BulkResponseItem) => {
    if (item.index?.error) {
      totalErrors++;

      const error = item.index.error;
      const patternKey = `${error.type}:${extractFieldName(error.reason)}`;

      if (!errorPatterns.has(patternKey)) {
        errorPatterns.set(patternKey, {
          type: error.type,
          field: extractFieldName(error.reason),
          reason: cleanErrorReason(error.reason),
          count: 0,
          sampleValues: [],
          sampleDocuments: [],
        });
      }

      const pattern = errorPatterns.get(patternKey)!;
      pattern.count++;

      // Store first few sample values and document IDs
      if (pattern.sampleValues.length < 3) {
        const sampleValue = extractSampleValue(error.reason);
        if (sampleValue && !pattern.sampleValues.includes(sampleValue)) {
          pattern.sampleValues.push(sampleValue);
        }
      }

      if (pattern.sampleDocuments.length < 3) {
        pattern.sampleDocuments.push(item.index._id ?? "unknown");
      }
    }
  });

  return {
    patterns: Array.from(errorPatterns.values()),
    totalErrors,
  };
}

/**
 * Displays a concise error summary in the terminal
 */
function displayConciseErrorSummary(
  errorAnalysis: { patterns: ErrorPattern[]; totalErrors: number },
  logFileName?: string
): void {
  Logger.generic("");
  Logger.generic("");
  Logger.info`Bulk indexing rejected ${errorAnalysis.totalErrors} records`;

  const mappingPatterns = errorAnalysis.patterns.filter(
    (p) => p.type === "mapper_parsing_exception"
  );
  const otherPatterns = errorAnalysis.patterns.filter(
    (p) => p.type !== "mapper_parsing_exception"
  );

  if (mappingPatterns.length > 0) {
    Logger.suggestion("Mapping Type Mismatches");
    mappingPatterns.forEach((pattern) => {
      Logger.generic(
        `   ▸ Field "${pattern.field}": ${pattern.reason} (${pattern.count} records affected)`
      );
      if (pattern.sampleValues.length > 0) {
        Logger.generic(
          `     Values received: ${pattern.sampleValues.join(", ")}`
        );
      }
      Logger.generic(
        `     Fix: update "${pattern.field}" type in your Elasticsearch mapping`
      );
    });
  }

  if (otherPatterns.length > 0) {
    Logger.suggestion("Other Issues");
    otherPatterns.forEach((pattern) => {
      Logger.generic(
        `   ▸ ${pattern.type} — ${pattern.reason} (${pattern.count} records)`
      );
      if (pattern.sampleValues.length > 0) {
        Logger.generic(
          `     Values received: ${pattern.sampleValues.join(", ")}`
        );
      }
    });
  }

  if (logFileName) {
    Logger.generic(`   ▸ Full error log: ${logFileName}`);
  }
}

/**
 * Writes detailed error information to a log file
 */
async function writeErrorLogFile(
  errorAnalysis: { patterns: ErrorPattern[]; totalErrors: number },
  items: BulkResponseItem[],
  indexName: string,
  logDir?: string
): Promise<string> {
  try {
    const logDirectory = logDir || "./logs";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logFileName = `elasticsearch-errors-${timestamp}.log`;
    const logPath = path.join(logDirectory, logFileName);

    // Ensure log directory exists
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }

    let logContent = `Elasticsearch Bulk Operation Error Log\n`;
    logContent += `Index: ${indexName}\n`;
    logContent += `Timestamp: ${new Date().toISOString()}\n`;
    logContent += `Total Errors: ${errorAnalysis.totalErrors}\n\n`;

    // Write error patterns summary
    logContent += "ERROR PATTERNS:\n";
    logContent += "================\n\n";

    errorAnalysis.patterns.forEach((pattern, index) => {
      logContent += `${index + 1}. ${pattern.type} in field "${
        pattern.field
      }"\n`;
      logContent += `   Reason: ${pattern.reason}\n`;
      logContent += `   Count: ${pattern.count} records\n`;
      logContent += `   Sample values: ${pattern.sampleValues.join(", ")}\n`;
      logContent += `   Sample documents: ${pattern.sampleDocuments.join(
        ", "
      )}\n\n`;
    });

    // Write detailed errors
    logContent += "\nDETAILED ERRORS:\n";
    logContent += "=================\n\n";

    items.forEach((item: BulkResponseItem, index: number) => {
      if (item.index?.error) {
        logContent += `Record ${index}:\n`;
        logContent += `  Document ID: ${item.index._id}\n`;
        logContent += `  Status: ${item.index.status}\n`;
        logContent += `  Error: ${JSON.stringify(
          item.index.error,
          null,
          2
        )}\n\n`;
      }
    });

    fs.writeFileSync(logPath, logContent);

    // Return the relative path for display
    return logPath;
  } catch (error) {
    Logger.warnString(`Could not write error log file: ${error}`);
    return "";
  }
}

/**
 * Extracts field name from error reason
 */
function extractFieldName(reason: string): string {
  const fieldMatch = reason.match(/field \[([^\]]+)\]/);
  return fieldMatch ? fieldMatch[1] : "unknown_field";
}

/**
 * Extracts sample value from error reason
 */
function extractSampleValue(reason: string): string | null {
  const valueMatch = reason.match(/Preview of field's value: '([^']+)'/);
  return valueMatch ? valueMatch[1] : null;
}

/**
 * Cleans up error reason for display
 */
function cleanErrorReason(reason: string): string {
  // Extract the main error without field references and document IDs
  if (reason.includes("failed to parse field")) {
    const typeMatch = reason.match(/of type \[([^\]]+)\]/);

    if (typeMatch) {
      return `Expected ${typeMatch[1]}, but got string values`;
    }

    // Fallback for number format exceptions
    if (reason.includes("number_format_exception")) {
      return "Expected number, but got string values";
    }
  }

  // Clean up other error types
  const firstSentence = reason.split(".")[0];
  return firstSentence.length > 60
    ? firstSentence.substring(0, 60) + "..."
    : firstSentence;
}
