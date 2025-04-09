import { ConductorError, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";
import { formatDuration } from "./progressBar";

/**
 * Error handler for CSV processing operations.
 * Manages CSV-specific errors and generates appropriate error logs.
 */
export class CSVProcessingErrorHandler {
  /**
   * Handles errors during CSV processing
   *
   * @param error - The error that occurred
   * @param processedRecords - Number of records processed before error
   * @param isFirstLine - Whether the error occurred on the first line (headers)
   * @param delimiter - CSV delimiter character
   * @throws ConductorError with appropriate error code and message
   */
  public static handleProcessingError(
    error: unknown,
    processedRecords: number,
    isFirstLine: boolean,
    delimiter: string
  ): never {
    // Convert to string for guaranteed safe output
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (isFirstLine) {
      // First line errors are usually header parsing issues
      Logger.error(`CSV header parsing failed: ${errorMessage}`);
      Logger.tip(`Make sure your CSV file uses '${delimiter}' as a delimiter`);

      throw new ConductorError(
        "Failed to parse CSV headers",
        ErrorCodes.VALIDATION_FAILED,
        { originalError: error }
      );
    } else {
      // General processing errors
      Logger.error(
        `CSV processing failed after ${processedRecords} records: ${errorMessage}`
      );

      throw new ConductorError(
        "CSV processing failed",
        ErrorCodes.CSV_ERROR, // Using CSV_ERROR instead of PROCESSING_FAILED
        {
          recordsProcessed: processedRecords,
          originalError: error,
        }
      );
    }
  }

  /**
   * Displays a summary of the CSV processing operation
   *
   * @param processed - Total number of processed records
   * @param failed - Number of failed records
   * @param startTime - When the processing started
   */
  public static displaySummary(
    processed: number,
    failed: number,
    startTime: number
  ): void {
    const elapsedMs = Date.now() - startTime;
    const recordsPerSecond = Math.max(
      0.1,
      processed / Math.max(1, elapsedMs / 1000)
    );
    const successfulRecords = Math.max(0, processed - failed); // Ensure it's never negative

    // Clear the current line
    process.stdout.write("\n");

    if (failed > 0) {
      Logger.warn(`Transfer to elasticsearch completed with partial errors`);
    } else if (processed === 0) {
      Logger.warn(`No records were processed`);
    } else {
      Logger.success(`Transfer to elasticsearch completed successfully`);
    }

    // Print summary
    Logger.generic(` ▸ Total Records processed: ${processed}`);
    Logger.generic(` ▸ Records Successfully transferred: ${successfulRecords}`);

    if (failed > 0) {
      Logger.warn(`  ▸ Records Unsuccessfully transferred: ${failed}`);
      Logger.generic(` ▸ Error logs outputted to: /logs/`);
    }

    Logger.generic(
      ` ▸ Processing speed: ${Math.round(recordsPerSecond)} rows/sec`
    );
    Logger.generic(` ⏱ Total processing time: ${formatDuration(elapsedMs)}`);
  }
}
