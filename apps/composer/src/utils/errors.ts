import { Logger } from "./logger";
import chalk from "chalk";

export class ComposerError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "ComposerError";
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
  GENERATION_FAILED: "[GENERATION_FAILED]",
  PARSING_ERROR: "[PARSING_ERROR]",
  FILE_ERROR: "[FILE_ERROR]",
  FILE_WRITE_ERROR: "[FILE_WRITE_ERROR]",
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

export function handleError(error: unknown): never {
  if (error instanceof ComposerError) {
    Logger.error(`${chalk.bold.red(error.code)}: ${error.message}`);

    if (error.details) {
      const formattedDetails = formatErrorDetails(error.details);
      Logger.debug("Details:");
      Logger.debug(formattedDetails);
    }

    // Log stack trace in debug mode
    Logger.debug("Stack trace:");
    Logger.debug(error.stack || "No stack trace available");
  } else {
    Logger.error("Unexpected error occurred");

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
