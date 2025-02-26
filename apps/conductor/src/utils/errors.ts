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
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

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
    // Just output the code and message without any prefix
    // Your Logger.error already adds the "✗ Error" prefix
    Logger.error(`${error.code}: ${error.message}`);

    if (showAvailableProfiles) {
      showAvailableProfiles();
    }

    if (error.details) {
      const formattedDetails = formatErrorDetails(error.details);
      Logger.debug("Details:");
      Logger.debug(formattedDetails);
    }

    Logger.debug("Stack trace:");
    Logger.debug(error.stack || "No stack trace available");
  } else {
    // For unexpected errors, just output the message
    if (error instanceof Error) {
      Logger.error(error.message);
      Logger.debug("Stack trace:");
      Logger.debug(error.stack || "No stack trace available");
    } else {
      Logger.error(String(error));
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
