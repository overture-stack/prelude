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

// Track if we've already displayed the error summary to avoid duplicates during retries
let hasDisplayedErrorSummary = false;

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

  // Reset the error display flag for each new bulk request
  hasDisplayedErrorSummary = false;

  let attempt = 0;
  let success = false;
  let lastErrorAnalysis: any = null;

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
        displayConciseErrorSummary(errorAnalysis, logFileName);

        onFailure(errorAnalysis.totalErrors);

        // If some records succeeded, consider it a partial success
        if (errorAnalysis.totalErrors < records.length) {
          success = true;
        } else {
          attempt++;
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
      onFailure(records.length);
      attempt++;

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
function analyzeErrors(items: any[]): {
  patterns: ErrorPattern[];
  totalErrors: number;
} {
  const errorPatterns = new Map<string, ErrorPattern>();
  let totalErrors = 0;

  items.forEach((item: any, index: number) => {
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
        pattern.sampleDocuments.push(item.index._id);
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
  // Only display if we haven't shown this pattern before (to avoid duplicates during retries)
  if (!hasDisplayedErrorSummary) {
    Logger.generic("");
    Logger.generic("");
    Logger.info`Bulk indexing failed for ${errorAnalysis.totalErrors} records`;

    Logger.suggestion("Issues");
    errorAnalysis.patterns.forEach((pattern) => {
      if (pattern.type === "mapper_parsing_exception") {
        Logger.generic(
          `   ▸ ${pattern.field}: ${pattern.reason} (${pattern.count} records)`
        );
        if (pattern.sampleValues.length > 0) {
          Logger.generic(
            `     Sample of values provided: ${pattern.sampleValues.join(", ")}`
          );
        }
      }
    });

    // Show other error types if any
    const otherPatterns = errorAnalysis.patterns.filter(
      (p) => p.type !== "mapper_parsing_exception"
    );
    if (otherPatterns.length > 0) {
      Logger.suggestion("Other Issues");
      otherPatterns.forEach((pattern) => {
        Logger.generic(
          `     ${pattern.type}: ${pattern.reason} (${pattern.count} records)`
        );
      });
    }

    if (logFileName) {
      Logger.generic(`   ▸ Detailed error log: ${logFileName}`);
    }

    hasDisplayedErrorSummary = true;
  }
}

/**
 * Writes detailed error information to a log file
 */
async function writeErrorLogFile(
  errorAnalysis: { patterns: ErrorPattern[]; totalErrors: number },
  items: any[],
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

    items.forEach((item: any, index: number) => {
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
