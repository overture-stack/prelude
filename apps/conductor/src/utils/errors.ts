// src/utils/errors.ts - Updated with error factory pattern
import { Logger } from "./logger";

export class ConductorError extends Error {
  public isLogged: boolean = false; // Add this property to track if error was already logged

  constructor(
    message: string,
    public code: string,
    public details?: any,
    public suggestions?: string[]
  ) {
    super(message);
    this.name = "ConductorError";
  }

  toString(): string {
    return `${this.message}${
      this.details ? `\nDetails: ${JSON.stringify(this.details, null, 2)}` : ""
    }`;
  }
}

export const ErrorCodes = {
  INVALID_ARGS: "INVALID_ARGS",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  INVALID_FILE: "INVALID_FILE",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  ENV_ERROR: "ENV_ERROR",
  PARSING_ERROR: "PARSING_ERROR",
  FILE_ERROR: "FILE_ERROR",
  FILE_WRITE_ERROR: "FILE_WRITE_ERROR",
  CONNECTION_ERROR: "CONNECTION_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  INDEX_NOT_FOUND: "INDEX_NOT_FOUND",
  TRANSFORM_ERROR: "TRANSFORM_ERROR",
  CLI_ERROR: "CLI_ERROR",
  CSV_ERROR: "CSV_ERROR",
  ES_ERROR: "ES_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  USER_CANCELLED: "USER_CANCELLED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Error factory methods for common error types
export class ErrorFactory {
  static validation(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.VALIDATION_FAILED,
      details,
      suggestions
    );
  }

  static file(
    message: string,
    filePath?: string,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.FILE_NOT_FOUND,
      { filePath },
      suggestions
    );
  }

  static invalidFile(
    message: string,
    filePath?: string,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.INVALID_FILE,
      { filePath },
      suggestions
    );
  }

  static args(message: string, suggestions?: string[]): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.INVALID_ARGS,
      undefined,
      suggestions
    );
  }

  static connection(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.CONNECTION_ERROR,
      details,
      suggestions
    );
  }

  static environment(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.ENV_ERROR,
      details,
      suggestions
    );
  }

  static parsing(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.PARSING_ERROR,
      details,
      suggestions
    );
  }

  static csv(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.CSV_ERROR,
      details,
      suggestions
    );
  }

  static elasticsearch(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.ES_ERROR,
      details,
      suggestions
    );
  }

  static auth(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      message,
      ErrorCodes.AUTH_ERROR,
      details,
      suggestions
    );
  }

  static indexNotFound(
    indexName: string,
    suggestions?: string[]
  ): ConductorError {
    return new ConductorError(
      `Index '${indexName}' not found`,
      ErrorCodes.INDEX_NOT_FOUND,
      { indexName },
      suggestions || [
        "Create the index first or use a different index name",
        "Check your index name spelling and permissions",
      ]
    );
  }
}

function formatErrorDetails(details: any): string {
  if (typeof details === "string") {
    return details;
  }
  if (details instanceof Error) {
    return details.message;
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

/**
 * Centralized error handler for the application
 * @param error - The error to handle
 * @param showHelp - Optional callback to show help information
 */
export function handleError(error: unknown, showHelp?: () => void): never {
  if (error instanceof ConductorError) {
    Logger.errorString(`[${error.code}] ${error.message}`);

    // Show suggestions using tip logging
    if (error.suggestions && error.suggestions.length > 0) {
      Logger.suggestion("Suggestions");
      error.suggestions.forEach((suggestion) => {
        Logger.tipString(suggestion);
      });
    }

    // Show help if callback provided
    if (showHelp) {
      showHelp();
    }

    // Show details in debug mode only
    if (process.argv.includes("--debug")) {
      if (error.details) {
        Logger.generic("");
        Logger.debugString("Details: " + formatErrorDetails(error.details));
      }
      Logger.generic("");
      Logger.debugString(
        "Stack Trace " + error.stack || "No stack trace available"
      );
    }
  } else {
    Logger.errorString(
      `${error instanceof Error ? error.message : String(error)}`
    );

    if (process.argv.includes("--debug") && error instanceof Error) {
      Logger.debugString(error.stack || "No stack trace available");
    }
  }

  process.exit(1);
}

// Keep the legacy function for backward compatibility during transition
export function createValidationError(
  message: string,
  details?: any
): ConductorError {
  return ErrorFactory.validation(message, details);
}
