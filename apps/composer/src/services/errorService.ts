// src/services/errorService.ts - Removed unused ErrorCode enum
import { Logger } from "../utils/logger";

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
}

export class ErrorService {
  static validation(
    message: string,
    details?: any,
    suggestions?: string[]
  ): ComposerError {
    return new ComposerError(
      message,
      "VALIDATION_FAILED",
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
      "INVALID_FILE",
      { filePath },
      suggestions
    );
  }

  static args(message: string, suggestions?: string[]): ComposerError {
    return new ComposerError(message, "INVALID_ARGS", undefined, suggestions);
  }

  static handle(error: unknown, showHelp?: () => void): never {
    if (error instanceof ComposerError) {
      Logger.error(`[${error.code}] ${error.message}`);

      if (error.suggestions && error.suggestions.length > 0) {
        Logger.section("Suggestions");
        error.suggestions.forEach((suggestion) => {
          Logger.info(suggestion);
        });
      }

      if (showHelp) {
        showHelp();
      }

      if (error.details) {
        Logger.debug("Error details:");
        Logger.debugObject("Details", error.details);
      }

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
}
