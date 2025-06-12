// src/utils/errors.ts - Remove unused exports
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

// Remove the exported type - just use typeof if needed internally
// type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

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
    Logger.error(`${error.message}`);

    // Detailed error only in debug mode
    if (process.argv.includes("--debug")) {
      if (error.details) {
        Logger.debug("Error details:");
        Logger.debug(formatErrorDetails(error.details));
      }

      Logger.debug("Stack trace:");
      Logger.debug(error.stack || "No stack trace available");
    }

    if (showAvailableProfiles) {
      showAvailableProfiles();
    }
  } else {
    // For unexpected errors, just output the message
    Logger.error(
      `Unexpected error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    if (process.argv.includes("--debug") && error instanceof Error) {
      Logger.debug("Stack trace:");
      Logger.debug(error.stack || "No stack trace available");
    }
  }

  process.exit(1);
}

export function createValidationError(
  message: string,
  details?: any
): ConductorError {
  return new ConductorError(message, ErrorCodes.VALIDATION_FAILED, details);
}
