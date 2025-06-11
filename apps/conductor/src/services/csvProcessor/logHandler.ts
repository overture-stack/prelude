// src/services/csvProcessor/logHandler.ts - Enhanced with ErrorFactory patterns
import { ErrorFactory, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";
import { formatDuration } from "./progressBar";

/**
 * Error handler for CSV processing operations.
 * Manages CSV-specific errors and generates appropriate error logs.
 * Enhanced with ErrorFactory patterns for consistent user guidance.
 */
export class CSVProcessingErrorHandler {
  /**
   * Handles errors during CSV processing with enhanced error analysis
   *
   * @param error - The error that occurred
   * @param processedRecords - Number of records processed before error
   * @param isFirstLine - Whether the error occurred on the first line (headers)
   * @param delimiter - CSV delimiter character
   * @throws Enhanced ConductorError with appropriate error code and guidance
   */
  public static handleProcessingError(
    error: unknown,
    processedRecords: number,
    isFirstLine: boolean,
    delimiter: string
  ): never {
    // Convert to string for guaranteed safe output
    const errorMessage = error instanceof Error ? error.message : String(error);

    // If it's already a ConductorError, preserve it with additional context
    if (error instanceof Error && error.name === "ConductorError") {
      // Add CSV processing context to existing errors
      const existingError = error as any;
      const enhancedDetails = {
        ...existingError.details,
        processedRecords,
        isFirstLine,
        delimiter,
        context: "CSV processing",
      };

      throw ErrorFactory.csv(
        existingError.message,
        existingError.details?.filePath,
        isFirstLine ? 1 : undefined,
        existingError.details?.suggestions || [
          "Check CSV file format and structure",
          "Verify delimiter and encoding settings",
          "Review error details for specific guidance",
        ]
      );
    }

    if (isFirstLine) {
      // Enhanced first line (header) error handling
      Logger.error`CSV header parsing failed: ${errorMessage}`;
      Logger.tip`Make sure your CSV file uses '${delimiter.replace(
        "\t",
        "\\t"
      )}' as a delimiter`;

      // Analyze header-specific issues
      const suggestions = this.generateHeaderErrorSuggestions(
        errorMessage,
        delimiter
      );

      throw ErrorFactory.csv(
        "Failed to parse CSV headers",
        undefined,
        1,
        suggestions
      );
    } else {
      // Enhanced data processing error handling
      Logger.error`CSV processing failed after ${processedRecords} records: ${errorMessage}`;

      // Analyze data processing issues
      const suggestions = this.generateDataProcessingErrorSuggestions(
        errorMessage,
        processedRecords,
        delimiter
      );

      throw ErrorFactory.csv(
        `CSV processing failed after processing ${processedRecords} records`,
        undefined,
        undefined,
        suggestions
      );
    }
  }

  /**
   * Displays a comprehensive summary of the CSV processing operation
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

    // Enhanced summary display based on results
    if (failed > 0 && successfulRecords > 0) {
      Logger.warn`Transfer to elasticsearch completed with partial errors`;
      Logger.generic(" ");
      Logger.generic(`📊 Processing Summary:`);
    } else if (failed > 0 && successfulRecords === 0) {
      Logger.error`Transfer to elasticsearch failed completely`;
      Logger.generic(" ");
      Logger.generic(`❌ Processing Summary:`);
    } else if (processed === 0) {
      Logger.warn`No records were processed`;
      Logger.generic(" ");
      Logger.generic(`⚠️  Processing Summary:`);
    } else {
      Logger.success`Transfer to elasticsearch completed successfully`;
      Logger.generic(" ");
      Logger.generic(`✅ Processing Summary:`);
    }

    // Enhanced metrics display
    Logger.generic(` ▸ Total Records processed: ${processed.toLocaleString()}`);
    Logger.generic(
      ` ▸ Records Successfully transferred: ${successfulRecords.toLocaleString()}`
    );

    if (failed > 0) {
      const failureRate = ((failed / processed) * 100).toFixed(1);
      Logger.warn`  ▸ Records Unsuccessfully transferred: ${failed.toLocaleString()} (${failureRate}%)`;
      Logger.generic(` ▸ Error logs outputted to: /logs/`);

      // Enhanced failure analysis
      if (failed > processed * 0.5) {
        Logger.generic(" ");
        Logger.warn`High failure rate detected (>${failureRate}%)`;
        Logger.tipString("Consider reviewing data format and index mappings");
      }
    }

    // Enhanced performance metrics
    const processingRate = Math.round(recordsPerSecond);
    Logger.generic(
      ` ▸ Processing speed: ${processingRate.toLocaleString()} rows/sec`
    );
    Logger.generic(` ⏱ Total processing time: ${formatDuration(elapsedMs)}`);

    // Enhanced performance insights
    if (processingRate < 100) {
      Logger.generic(" ");
      Logger.tipString("Consider increasing batch size for better performance");
    } else if (processingRate > 5000) {
      Logger.generic(" ");
      Logger.tipString("Excellent processing performance!");
    }

    // Enhanced recommendations based on results
    if (failed === 0 && processed > 0) {
      Logger.generic(" ");
      Logger.tipString(
        "All records processed successfully - data is ready for analysis"
      );
    } else if (failed > 0) {
      Logger.generic(" ");
      Logger.tipString(
        "Review failed records and consider reprocessing with corrected data"
      );
    }
  }

  /**
   * Generate specific suggestions for header parsing errors
   */
  private static generateHeaderErrorSuggestions(
    errorMessage: string,
    delimiter: string
  ): string[] {
    const suggestions: string[] = [];

    // Analyze error message for specific issues
    if (errorMessage.toLowerCase().includes("delimiter")) {
      suggestions.push(
        `Verify delimiter '${delimiter.replace(
          "\t",
          "\\t"
        )}' is correct for this CSV`
      );
      suggestions.push(
        "Try common delimiters: ',' (comma), ';' (semicolon), '\\t' (tab)"
      );
      suggestions.push(
        "Check if the file uses a different delimiter than expected"
      );
    }

    if (errorMessage.toLowerCase().includes("encoding")) {
      suggestions.push("Check file encoding - should be UTF-8");
      suggestions.push(
        "Try opening the file in a text editor to verify encoding"
      );
      suggestions.push("Convert file to UTF-8 if using a different encoding");
    }

    if (errorMessage.toLowerCase().includes("quote")) {
      suggestions.push("Check for unmatched quotes in header row");
      suggestions.push(
        "Ensure proper CSV escaping for header names with special characters"
      );
      suggestions.push("Remove or properly escape quotes in column names");
    }

    if (errorMessage.toLowerCase().includes("empty")) {
      suggestions.push("Ensure the first row contains column headers");
      suggestions.push("Check that the file is not empty or corrupted");
      suggestions.push(
        "Verify the CSV has proper structure with headers and data"
      );
    }

    // Add general header suggestions if no specific ones were added
    if (suggestions.length === 0) {
      suggestions.push("Check CSV file format and header structure");
      suggestions.push(
        `Verify delimiter '${delimiter.replace("\t", "\\t")}' is correct`
      );
      suggestions.push(
        "Ensure headers follow naming conventions (letters, numbers, underscores)"
      );
      suggestions.push("Check file encoding (should be UTF-8)");
    }

    // Always add file inspection suggestion
    suggestions.push(
      "Try opening the file in a text editor to inspect the first row manually"
    );

    return suggestions;
  }

  /**
   * Generate specific suggestions for data processing errors
   */
  private static generateDataProcessingErrorSuggestions(
    errorMessage: string,
    processedRecords: number,
    delimiter: string
  ): string[] {
    const suggestions: string[] = [];

    // Analyze error message for specific data processing issues
    if (errorMessage.toLowerCase().includes("elasticsearch")) {
      suggestions.push("Check Elasticsearch service connectivity and health");
      suggestions.push("Verify index exists and has proper permissions");
      suggestions.push("Ensure cluster has sufficient resources");
      suggestions.push("Review Elasticsearch logs for additional details");
    }

    if (
      errorMessage.toLowerCase().includes("batch") ||
      errorMessage.toLowerCase().includes("bulk")
    ) {
      suggestions.push("Try reducing batch size to handle large documents");
      suggestions.push("Check for document size limits in Elasticsearch");
      suggestions.push("Consider splitting large files into smaller chunks");
    }

    if (
      errorMessage.toLowerCase().includes("memory") ||
      errorMessage.toLowerCase().includes("heap")
    ) {
      suggestions.push("Reduce batch size to lower memory usage");
      suggestions.push("Process files in smaller chunks");
      suggestions.push("Check system memory availability");
      suggestions.push("Consider increasing Node.js heap size");
    }

    if (errorMessage.toLowerCase().includes("timeout")) {
      suggestions.push("Increase timeout settings for large operations");
      suggestions.push("Check network connectivity to Elasticsearch");
      suggestions.push("Verify Elasticsearch cluster performance");
      suggestions.push("Consider processing in smaller batches");
    }

    if (
      errorMessage.toLowerCase().includes("mapping") ||
      errorMessage.toLowerCase().includes("field")
    ) {
      suggestions.push("Check data types match Elasticsearch index mapping");
      suggestions.push("Verify field names are consistent with mapping");
      suggestions.push("Update index mapping or modify data format");
      suggestions.push("Check for special characters in field values");
    }

    if (
      errorMessage.toLowerCase().includes("parse") ||
      errorMessage.toLowerCase().includes("format")
    ) {
      suggestions.push("Check CSV data format consistency");
      suggestions.push(
        `Verify delimiter '${delimiter.replace(
          "\t",
          "\\t"
        )}' is used consistently`
      );
      suggestions.push("Look for malformed rows or inconsistent column counts");
      suggestions.push("Check for special characters that need escaping");
    }

    // Add progress-based suggestions
    if (processedRecords === 0) {
      suggestions.push(
        "Error occurred immediately - check file format and headers"
      );
      suggestions.push("Verify the CSV file structure and delimiter");
      suggestions.push("Ensure Elasticsearch connection is working");
    } else if (processedRecords < 100) {
      suggestions.push(
        `Error occurred early (record ${processedRecords}) - check data format`
      );
      suggestions.push("Review the first few data rows for format issues");
      suggestions.push("Check for inconsistent data types in early records");
    } else {
      suggestions.push(
        `Error occurred after processing ${processedRecords} records`
      );
      suggestions.push(
        "Check for data format changes or corruption in later records"
      );
      suggestions.push(
        "Consider processing in smaller batches to isolate issues"
      );
    }

    // Add general suggestions if no specific ones were added
    if (suggestions.length === 0) {
      suggestions.push("Check CSV data format and structure");
      suggestions.push("Verify Elasticsearch connectivity and configuration");
      suggestions.push("Review system resources (memory, disk space)");
      suggestions.push("Check for data corruption or format inconsistencies");
    }

    // Always add debug suggestion
    suggestions.push("Use --debug flag for detailed error information");

    return suggestions;
  }

  /**
   * Enhanced error categorization for better user guidance
   */
  public static categorizeError(error: unknown): {
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    recoverable: boolean;
  } {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Critical errors (cannot continue)
    if (
      lowerMessage.includes("file not found") ||
      lowerMessage.includes("permission denied")
    ) {
      return {
        category: "File Access",
        severity: "critical",
        recoverable: false,
      };
    }

    if (
      lowerMessage.includes("elasticsearch") &&
      lowerMessage.includes("connection")
    ) {
      return {
        category: "Connection",
        severity: "critical",
        recoverable: false,
      };
    }

    // High severity errors (major issues)
    if (lowerMessage.includes("memory") || lowerMessage.includes("heap")) {
      return { category: "Resource", severity: "high", recoverable: true };
    }

    if (lowerMessage.includes("header") || lowerMessage.includes("delimiter")) {
      return { category: "CSV Format", severity: "high", recoverable: true };
    }

    // Medium severity errors (data issues)
    if (
      lowerMessage.includes("mapping") ||
      lowerMessage.includes("validation")
    ) {
      return {
        category: "Data Validation",
        severity: "medium",
        recoverable: true,
      };
    }

    if (lowerMessage.includes("batch") || lowerMessage.includes("bulk")) {
      return { category: "Processing", severity: "medium", recoverable: true };
    }

    // Low severity errors (minor issues)
    if (lowerMessage.includes("timeout")) {
      return { category: "Performance", severity: "low", recoverable: true };
    }

    // Default categorization
    return { category: "General", severity: "medium", recoverable: true };
  }

  /**
   * Generate recovery suggestions based on error categorization
   */
  public static generateRecoverySuggestions(error: unknown): string[] {
    const { category, severity, recoverable } = this.categorizeError(error);

    if (!recoverable) {
      return [
        "This error requires immediate attention before processing can continue",
        "Fix the underlying issue and restart the operation",
        "Contact support if the problem persists",
      ];
    }

    const suggestions: string[] = [];

    switch (category) {
      case "CSV Format":
        suggestions.push("Fix CSV format issues and retry");
        suggestions.push("Validate file structure before reprocessing");
        break;

      case "Resource":
        suggestions.push("Reduce batch size and retry");
        suggestions.push("Close other applications to free memory");
        suggestions.push("Process file in smaller chunks");
        break;

      case "Data Validation":
        suggestions.push("Review and correct data format");
        suggestions.push("Update index mapping if needed");
        suggestions.push("Clean invalid data entries");
        break;

      case "Processing":
        suggestions.push("Adjust processing parameters");
        suggestions.push("Retry with smaller batch sizes");
        break;

      case "Performance":
        suggestions.push("Retry the operation");
        suggestions.push("Check system performance");
        break;

      default:
        suggestions.push("Review error details and try again");
        suggestions.push("Contact support if issues persist");
    }

    // Add severity-based suggestions
    if (severity === "high" || severity === "critical") {
      suggestions.push("Address this issue before continuing");
    } else {
      suggestions.push("This issue may be temporary - consider retrying");
    }

    return suggestions;
  }
}
