// src/services/fileProcessor.ts
/**
 * Handles file processing with consistent error handling and reporting
 */

import { CommandResult } from "../commands/baseCommand";
import { Logger } from "../utils/logger";

export class FileProcessor {
  async processFiles(
    filePaths: string[],
    processFile: (filePath: string) => Promise<void>
  ): Promise<CommandResult> {
    const results = new ProcessingResults();

    Logger.debug`Processing ${filePaths.length} files`;

    for (const filePath of filePaths) {
      Logger.generic("");
      Logger.debug`Uploading ${filePath}`;

      try {
        await processFile(filePath);
        results.addSuccess(filePath);
        Logger.debug`✓ Successfully processed ${filePath}`;
      } catch (error) {
        results.addFailure(filePath, error);
        this.logProcessingError(filePath, error);
      }
    }

    return results.toCommandResult();
  }

  private logProcessingError(filePath: string, error: unknown): void {
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;

      Logger.errorString(`${conductorError.message}`);

      if (conductorError.suggestions?.length > 0) {
        Logger.suggestion("Suggestions:");
        conductorError.suggestions.forEach((suggestion: string) => {
          Logger.suggestion(`  • ${suggestion}`);
        });
      }
    } else {
      Logger.error`Failed to process ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }
}

/**
 * Tracks processing results for multiple files
 */
export class ProcessingResults {
  private successes: string[] = [];
  private failures: Array<{ filePath: string; error: unknown }> = [];

  addSuccess(filePath: string): void {
    this.successes.push(filePath);
  }

  addFailure(filePath: string, error: unknown): void {
    this.failures.push({ filePath, error });
  }

  toCommandResult(): CommandResult {
    const hasFailures = this.failures.length > 0;

    // Log final summary
    if (hasFailures) {
      Logger.error`${this.failures.length} files failed, ${this.successes.length} succeeded`;
      this.failures.forEach((f) => {
        Logger.error`  ✗ ${f.filePath}`;
      });
    } else {
      Logger.debug`All ${this.successes.length} files processed successfully`;
    }

    return {
      success: !hasFailures,
      errorMessage: hasFailures
        ? `${this.failures.length} of ${
            this.failures.length + this.successes.length
          } files failed`
        : undefined,
      details: {
        successCount: this.successes.length,
        failureCount: this.failures.length,
        successfulFiles: this.successes,
        failedFiles: this.failures.map((f) => f.filePath),
        failures: this.failures,
      },
    };
  }
}
