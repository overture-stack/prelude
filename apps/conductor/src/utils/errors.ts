// src/utils/errors.ts - Enhanced with ErrorFactory pattern
import { Logger } from "./logger";

export class ConductorError extends Error {
  constructor(message: string, public code: string, public details?: any) {
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
  INVALID_ARGS: "[INVALID_ARGS]",
  FILE_NOT_FOUND: "[FILE_NOT_FOUND]",
  INVALID_FILE: "[INVALID_FILE]",
  VALIDATION_FAILED: "[VALIDATION_FAILED]",
  ENV_ERROR: "[ENV_ERROR]",
  PARSING_ERROR: "[PARSING_ERROR]",
  FILE_ERROR: "[FILE_ERROR]",
  FILE_WRITE_ERROR: "[FILE_WRITE_ERROR]",
  CONNECTION_ERROR: "[CONNECTION_ERROR]",
  AUTH_ERROR: "[AUTH_ERROR]",
  INDEX_NOT_FOUND: "[INDEX_NOT_FOUND]",
  TRANSFORM_ERROR: "[TRANSFORM_ERROR]",
  CLI_ERROR: "[CLI_ERROR]",
  CSV_ERROR: "[CSV_ERROR]",
  ES_ERROR: "[ES_ERROR]",
  UNKNOWN_ERROR: "[UNKNOWN_ERROR]",
  USER_CANCELLED: "[USER_CANCELLED]",
} as const;

/**
 * Factory for creating consistent, user-friendly errors with actionable suggestions
 */
export class ErrorFactory {
  /**
   * Create a file-related error with helpful suggestions
   */
  static file(
    message: string,
    filePath?: string,
    suggestions: string[] = []
  ): ConductorError {
    const details: any = {};
    if (filePath) {
      details.filePath = filePath;
      details.currentDirectory = process.cwd();
    }

    const defaultSuggestions = [
      "Check that the file path is correct",
      "Ensure the file exists and is readable",
      "Verify file permissions allow access",
    ];

    if (filePath && !suggestions.length) {
      defaultSuggestions.push(`Current directory: ${process.cwd()}`);
    }

    return new ConductorError(message, ErrorCodes.FILE_NOT_FOUND, {
      ...details,
      suggestions: suggestions.length ? suggestions : defaultSuggestions,
    });
  }

  /**
   * Create a validation error with specific field guidance
   */
  static validation(
    message: string,
    details?: any,
    suggestions: string[] = []
  ): ConductorError {
    const defaultSuggestions = [
      "Check the input format and structure",
      "Verify all required fields are present",
      "Ensure data types match expected values",
    ];

    return new ConductorError(message, ErrorCodes.VALIDATION_FAILED, {
      ...details,
      suggestions: suggestions.length ? suggestions : defaultSuggestions,
    });
  }

  /**
   * Create a connection error with service-specific troubleshooting
   */
  static connection(
    message: string,
    service?: string,
    url?: string,
    suggestions: string[] = []
  ): ConductorError {
    const details: any = { service };
    if (url) details.url = url;

    const defaultSuggestions = service
      ? [
          `Check that ${service} is running and accessible`,
          "Verify network connectivity and firewall settings",
          "Confirm authentication credentials are correct",
          ...(url ? [`Try: curl ${url}/health`] : []),
        ]
      : [
          "Check network connectivity",
          "Verify service is running",
          "Confirm connection parameters",
        ];

    return new ConductorError(message, ErrorCodes.CONNECTION_ERROR, {
      ...details,
      suggestions: suggestions.length ? suggestions : defaultSuggestions,
    });
  }

  /**
   * Create a configuration error with parameter-specific guidance
   */
  static config(
    message: string,
    parameter?: string,
    suggestions: string[] = []
  ): ConductorError {
    const details: any = {};
    if (parameter) details.parameter = parameter;

    const defaultSuggestions = parameter
      ? [
          `Check the ${parameter} configuration value`,
          "Verify environment variables are set correctly",
          "Ensure configuration file syntax is valid",
        ]
      : [
          "Check configuration values",
          "Verify environment variables",
          "Ensure all required settings are provided",
        ];

    return new ConductorError(message, ErrorCodes.ENV_ERROR, {
      ...details,
      suggestions: suggestions.length ? suggestions : defaultSuggestions,
    });
  }

  /**
   * Create an invalid arguments error with usage guidance
   */
  static args(
    message: string,
    command?: string,
    suggestions: string[] = []
  ): ConductorError {
    const details: any = {};
    if (command) details.command = command;

    const defaultSuggestions = command
      ? [
          `Check the syntax for '${command}' command`,
          `Use: conductor ${command} --help for usage information`,
          "Verify all required parameters are provided",
        ]
      : [
          "Check command syntax and parameters",
          "Use: conductor --help for available commands",
          "Verify all required arguments are provided",
        ];

    return new ConductorError(message, ErrorCodes.INVALID_ARGS, {
      ...details,
      suggestions: suggestions.length ? suggestions : defaultSuggestions,
    });
  }

  /**
   * Create a CSV-specific error with format guidance
   */
  static csv(
    message: string,
    filePath?: string,
    row?: number,
    suggestions: string[] = []
  ): ConductorError {
    const details: any = {};
    if (filePath) details.filePath = filePath;
    if (row !== undefined) details.row = row;

    const defaultSuggestions = [
      "Check CSV file format and structure",
      "Verify headers are properly formatted",
      "Ensure delimiter is correct (comma, tab, etc.)",
      "Check for special characters in data",
    ];

    return new ConductorError(message, ErrorCodes.CSV_ERROR, {
      ...details,
      suggestions: suggestions.length ? suggestions : defaultSuggestions,
    });
  }

  /**
   * Create an index/database error with specific guidance
   */
  static index(
    message: string,
    indexName?: string,
    suggestions: string[] = []
  ): ConductorError {
    const details: any = {};
    if (indexName) details.indexName = indexName;

    const defaultSuggestions = indexName
      ? [
          `Check that index '${indexName}' exists`,
          "Verify Elasticsearch is running and accessible",
          "Confirm index permissions and mappings",
          `Try: GET /${indexName}/_mapping to check index structure`,
        ]
      : [
          "Check index exists and is accessible",
          "Verify database connection",
          "Confirm index permissions",
        ];

    return new ConductorError(message, ErrorCodes.INDEX_NOT_FOUND, {
      ...details,
      suggestions: suggestions.length ? suggestions : defaultSuggestions,
    });
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

export function handleError(
  error: unknown,
  showAvailableProfiles?: () => void
): never {
  if (error instanceof ConductorError) {
    // Basic error message for all users
    Logger.errorString(error.message);

    // Show suggestions if available
    if (
      error.details?.suggestions &&
      Array.isArray(error.details.suggestions)
    ) {
      Logger.generic("\n💡 Suggestions:");
      error.details.suggestions.forEach((suggestion: string) => {
        Logger.generic(`  • ${suggestion}`);
      });
    }

    // Detailed error only in debug mode
    if (process.argv.includes("--debug")) {
      if (error.details) {
        Logger.debugString("Error details:");
        Logger.debugString(formatErrorDetails(error.details));
      }

      Logger.debugString("Stack trace:");
      Logger.debugString(error.stack || "No stack trace available");
    }

    if (showAvailableProfiles) {
      showAvailableProfiles();
    }
  } else {
    // For unexpected errors, just output the message
    Logger.error`Unexpected error: ${
      error instanceof Error ? error.message : String(error)
    }`;

    if (process.argv.includes("--debug") && error instanceof Error) {
      Logger.debugString("Stack trace:");
      Logger.debugString(error.stack || "No stack trace available");
    }
  }

  process.exit(1);
}

// Backward compatibility - can be removed after migration
export function createValidationError(
  message: string,
  details?: any
): ConductorError {
  Logger.warnString(
    "createValidationError is deprecated, use ErrorFactory.validation instead"
  );
  return ErrorFactory.validation(message, details);
}
