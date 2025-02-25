import chalk from "chalk";

/**
 * Custom error class for the application.
 * Provides structured error information including error code and optional details.
 */
export class ConductorError extends Error {
  /**
   * @param message - Human-readable error message
   * @param code - Error code from ErrorCodes constant
   * @param details - Optional additional information for debugging
   */
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "ConductorError";
  }
}

/**
 * Standardized error codes for the application.
 * Used to categorize errors and provide consistent error handling.
 */
export const ErrorCodes = {
  /** Invalid function arguments or configuration */
  INVALID_ARGS: "INVALID_ARGS",

  /** File not found on the file system */
  FILE_NOT_FOUND: "FILE_NOT_FOUND",

  /** File exists but has invalid format or content */
  INVALID_FILE: "INVALID_FILE",

  /** Validation check failed */
  VALIDATION_FAILED: "VALIDATION_FAILED",

  /** Environment configuration error */
  ENV_ERROR: "ENV_ERROR",

  /** Generation of output failed */
  GENERATION_FAILED: "GENERATION_FAILED",

  /** Error parsing input data */
  PARSING_ERROR: "PARSING_ERROR",

  /** General file system error */
  FILE_ERROR: "FILE_ERROR",

  /** Error writing to file */
  FILE_WRITE_ERROR: "FILE_WRITE_ERROR",

  /** Database or connection error */
  CONNECTION_ERROR: "CONNECTION_ERROR",

  /** Authentication or authorization error */
  AUTH_ERROR: "AUTH_ERROR",

  /** Index not found in Elasticsearch */
  INDEX_NOT_FOUND: "INDEX_NOT_FOUND",

  /** Error during data transformation */
  TRANSFORM_ERROR: "TRANSFORM_ERROR",

  /** CLI setup error */
  CLI_ERROR: "CLI_ERROR",

  /** CSV processing error */
  CSV_ERROR: "CSV_ERROR",

  /** Elasticsearch operation error */
  ES_ERROR: "ES_ERROR",
} as const;

/**
 * Type for ErrorCodes values
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Global error handler that formats error output and exits process.
 * Provides different formatting for ConductorError vs other errors.
 *
 * @param error - Error to handle
 */
export function handleError(error: unknown): never {
  if (error instanceof ConductorError) {
    console.error(chalk.red(`\n❌ Error [${error.code}]: ${error.message}`));

    if (error.details) {
      console.error(chalk.yellow("\nDetails:"));

      if (typeof error.details === "object" && error.details !== null) {
        // Handle different detail formats
        if (Array.isArray(error.details)) {
          error.details.forEach((detail, index) => {
            console.error(chalk.yellow(`${index + 1}. `), detail);
          });
        } else if (error.details.message) {
          console.error(chalk.yellow(error.details.message));
          if (error.details.stack) {
            console.error(
              chalk.gray(error.details.stack.split("\n").slice(1).join("\n"))
            );
          }
        } else {
          // Print key-value pairs for objects
          Object.entries(error.details).forEach(([key, value]) => {
            console.error(chalk.yellow(`${key}: `), value);
          });
        }
      } else {
        console.error(chalk.yellow(error.details));
      }
    }

    // Provide helpful hints for specific error codes
    switch (error.code) {
      case ErrorCodes.FILE_NOT_FOUND:
        console.error(chalk.cyan("\nTip: Check the file path and permissions"));
        break;
      case ErrorCodes.VALIDATION_FAILED:
        console.error(
          chalk.cyan("\nTip: Review the validation requirements and try again")
        );
        break;
      case ErrorCodes.CONNECTION_ERROR:
        console.error(
          chalk.cyan(
            "\nTip: Verify network connectivity and service availability"
          )
        );
        break;
      case ErrorCodes.CLI_ERROR:
        console.error(
          chalk.cyan("\nTip: Run with --help to see command options")
        );
        break;
      case ErrorCodes.ES_ERROR:
        console.error(
          chalk.cyan("\nTip: Check Elasticsearch is running and accessible")
        );
        break;
      case ErrorCodes.CSV_ERROR:
        console.error(
          chalk.cyan("\nTip: Validate your CSV format and try again")
        );
        break;
    }
  } else {
    console.error(chalk.red("\n❌ Unexpected error:"));

    if (error instanceof Error) {
      console.error(chalk.yellow(`${error.name}: ${error.message}`));
      if (error.stack) {
        console.error(chalk.gray(error.stack.split("\n").slice(1).join("\n")));
      }
    } else {
      console.error(chalk.yellow(String(error)));
    }
  }

  process.exit(1);
}

/**
 * Formats and logs an error without exiting the process.
 * Useful for non-fatal errors that should be logged but don't require termination.
 *
 * @param error - Error to log
 * @param prefix - Optional prefix for the error message
 */
export function logError(error: unknown, prefix?: string): void {
  const messagePrefix = prefix ? `${prefix}: ` : "";

  if (error instanceof ConductorError) {
    console.error(
      chalk.red(`\n⚠️ ${messagePrefix}[${error.code}] ${error.message}`)
    );
    if (error.details) {
      console.error(chalk.yellow("Details:"), error.details);
    }
  } else if (error instanceof Error) {
    console.error(
      chalk.red(`\n⚠️ ${messagePrefix}${error.name}: ${error.message}`)
    );
  } else {
    console.error(chalk.red(`\n⚠️ ${messagePrefix}${String(error)}`));
  }
}

/**
 * Creates a user-friendly error message for common file operations.
 *
 * @param operation - The operation being performed (e.g., "reading", "writing")
 * @param filePath - Path to the file
 * @param originalError - The original error that occurred
 * @returns A ConductorError with appropriate code and context
 */
export function createFileError(
  operation: string,
  filePath: string,
  originalError: unknown
): ConductorError {
  // Determine the most appropriate error code
  let code: ErrorCode = ErrorCodes.FILE_ERROR;
  let message = `Error ${operation} file: ${filePath}`;

  if (originalError instanceof Error) {
    if (
      originalError.message.includes("no such file") ||
      originalError.message.includes("ENOENT")
    ) {
      code = ErrorCodes.FILE_NOT_FOUND as ErrorCode;
      message = `File not found: ${filePath}`;
    } else if (
      originalError.message.includes("permission denied") ||
      originalError.message.includes("EACCES")
    ) {
      code = ErrorCodes.FILE_ERROR;
      message = `Permission denied ${operation} file: ${filePath}`;
    } else if (operation === "writing") {
      code = ErrorCodes.FILE_WRITE_ERROR as ErrorCode;
    }
  }

  return new ConductorError(message, code, originalError);
}

/**
 * Creates an appropriate validation error with context.
 *
 * @param message - The validation error message
 * @param details - Validation details or context
 * @returns A ConductorError with the validation failed code
 */
export function createValidationError(
  message: string,
  details?: any
): ConductorError {
  return new ConductorError(message, ErrorCodes.VALIDATION_FAILED, details);
}

/**
 * Creates an appropriate connection error with context.
 *
 * @param service - The service name (e.g., "Elasticsearch")
 * @param details - Connection details or context
 * @returns A ConductorError with the connection error code
 */
export function createConnectionError(
  service: string,
  details?: any
): ConductorError {
  return new ConductorError(
    `Failed to connect to ${service}`,
    ErrorCodes.CONNECTION_ERROR,
    details
  );
}
