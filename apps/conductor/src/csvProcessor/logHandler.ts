import chalk from "chalk";
import { Logger } from "../utils/logger";
import { formatDuration } from "./progressBar";
import { ConductorError, ErrorCodes } from "../utils/errors";

/**
 * Handles error reporting and summary display for CSV processing
 */
export class CSVProcessingErrorHandler {
  /**
   * Displays a comprehensive summary of CSV processing results
   *
   * @param processed Total number of processed records
   * @param failed Number of failed records
   * @param startTime Processing start time
   */
  static displaySummary(
    processed: number,
    failed: number,
    startTime: number
  ): void {
    // Determine overall processing status
    const successful = processed - failed;
    const totalTime = Date.now() - startTime;
    const recordsPerSecond = Math.round(processed / (totalTime / 1000));

    // Conditional success logging
    if (failed === 0) {
      Logger.section("Transfer to elasticsearch completed");
    } else {
      Logger.warn("Transfer to elasticsearch completed with partial errors");
    }

    // Detailed logging using Logger methods with formatting
    Logger.generic(` ▸ Total Records processed: ${processed}`);
    Logger.generic(` ▸ Records Successfully transfered: ${successful}`);

    if (failed === 0) {
      Logger.generic(` ▸ Records Unsuccessfully transfered: ${failed}`);
    } else if (failed > 0) {
      Logger.warn` ▸ Records Unsuccessfully transfered: ${failed}`;
      Logger.generic(" ▸ Error logs outputted to: /logs/");
    }

    Logger.generic(` ▸ Processing speed: ${recordsPerSecond} rows/sec`);
    Logger.generic(` ⏱ Total processing time: ${formatDuration(totalTime)}`);
  }

  /**
   * Handles and reports processing errors with detailed logging
   *
   * @param error The error that occurred
   * @param processedRecords Number of records processed before the error
   * @param isFirstLine Whether the error occurred during header processing
   * @param delimiter CSV delimiter being used
   * @throws ConductorError after detailed error reporting
   */
  static handleProcessingError(
    error: unknown,
    processedRecords: number,
    isFirstLine: boolean,
    delimiter: string
  ): never {
    // Error stage identification
    const processingStage = isFirstLine
      ? "Header validation"
      : "Data processing";

    // Log the error details
    Logger.error("Processing error occurred");

    if (error instanceof Error) {
      Logger.error` ▸ Error type: ${error.name}`;
      Logger.error` ▸ Error message: ${error.message}`;
      Logger.error` ▸ Line number: ${processedRecords + 2}`;
      Logger.error` ▸ Processing stage: ${processingStage}`;
    } else {
      Logger.error` ▸ Unknown error: ${String(error)}`;
    }

    // Possible solutions
    Logger.help("Possible solutions:");
    Logger.generic(" ▸ 1. Check if the file is a valid CSV");
    Logger.generic(
      ` ▸ 2. Verify the delimiter is correct (current: ${delimiter})`
    );
    Logger.generic(" ▸ 3. Check for special characters or encoding issues");
    Logger.generic(
      " ▸ 4. Try opening and resaving the CSV file in a text editor"
    );

    // Throw a standardized error
    if (error instanceof ConductorError) {
      throw error;
    } else {
      throw new ConductorError(
        "CSV processing failed",
        ErrorCodes.PARSING_ERROR,
        error
      );
    }
  }
}
