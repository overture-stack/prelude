// src/utils/errors.ts - Consolidated error handling
import { Logger } from "./logger";

export class ComposerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public suggestions?: string[]
  ) {
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
  INVALID_ARGS: "INVALID_ARGS",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  INVALID_FILE: "INVALID_FILE",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  ENV_ERROR: "ENV_ERROR",
  GENERATION_FAILED: "GENERATION_FAILED",
  PARSING_ERROR: "PARSING_ERROR",
  FILE_ERROR: "FILE_ERROR",
  FILE_WRITE_ERROR: "FILE_WRITE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Error factory methods for common error types
export class ErrorFactory {
  static validation(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ComposerError {
    return new ComposerError(
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
  ): ComposerError {
    return new ComposerError(
      message,
      ErrorCodes.INVALID_FILE,
      { filePath },
      suggestions
    );
  }

  static args(message: string, suggestions?: string[]): ComposerError {
    return new ComposerError(
      message,
      ErrorCodes.INVALID_ARGS,
      undefined,
      suggestions
    );
  }

  static generation(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ComposerError {
    return new ComposerError(
      message,
      ErrorCodes.GENERATION_FAILED,
      details,
      suggestions
    );
  }

  static environment(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ComposerError {
    return new ComposerError(
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
  ): ComposerError {
    return new ComposerError(
      message,
      ErrorCodes.PARSING_ERROR,
      details,
      suggestions
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
  if (error instanceof ComposerError) {
    Logger.error`[${error.code}] ${error.message}`;

    // Show suggestions if available
    if (error.suggestions && error.suggestions.length > 0) {
      Logger.section("Suggestions");
      error.suggestions.forEach((suggestion) => {
        Logger.infoString(suggestion);
      });
    }

    // Show help if callback provided
    if (showHelp) {
      showHelp();
    }

    // Show details in debug mode
    if (error.details) {
      const formattedDetails = formatErrorDetails(error.details);
      Logger.debugString("Error details:");
      Logger.debugString(formattedDetails);
    }

    // Show stack trace in debug mode
    Logger.debugString("Stack trace:");
    Logger.debugString(error.stack || "No stack trace available");
  } else {
    Logger.errorString("Unexpected error occurred");

    if (error instanceof Error) {
      Logger.errorString(error.message);
      Logger.debugString("Stack trace:");
      Logger.debugString(error.stack || "No stack trace available");
    } else {
      Logger.errorString(String(error));
    }
  }

  process.exit(1);
}
