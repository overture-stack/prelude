/**
 * Command Module
 *
 * Provides the base abstract class and interfaces for all command implementations.
 * Commands follow the Command Pattern for encapsulating operations.
 * FIXED: Centralized error logging - only log here, nowhere else
 */

import { CLIOutput } from "../types/cli";
import * as fs from "fs";
import { Logger } from "../utils/logger";
import { ErrorFactory, ConductorError } from "../utils/errors";

/**
 * Command execution result
 */
export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;

  /** Optional error message if the command failed */
  errorMessage?: string;

  /** Optional error code if the command failed */
  errorCode?: string;

  /** Additional result details */
  details?: Record<string, any>;
}

/**
 * Abstract base class for all CLI commands in the conductor service.
 * Provides common functionality for command execution, validation, and error handling.
 */
export abstract class Command {
  /**
   * Creates a new Command instance.
   *
   * @param name - Name of the command for logging and identification
   */
  constructor(protected name: string) {}

  /**
   * Main method to run the command with the provided CLI arguments.
   * FIXED: Single point of error logging - only log errors here
   *
   * @param cliOutput - The parsed command line arguments
   * @returns A promise that resolves to a CommandResult object
   */
  async run(cliOutput: CLIOutput): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Enable debug logging if requested
      if (cliOutput.debug) {
        Logger.enableDebug();
        Logger.debug`Running ${this.name} command with debug enabled`;
      }

      // Validate input arguments
      try {
        await this.validate(cliOutput);
      } catch (validationError) {
        Logger.debug`Validation error: ${validationError}`;
        if (validationError instanceof Error) {
          throw validationError;
        }
        throw ErrorFactory.validation(String(validationError), undefined, [
          "Check your command line arguments",
          "Use --help for usage information",
        ]);
      }

      Logger.debug`Starting execution of ${this.name} command`;

      // Execute the specific command implementation
      const result = await this.execute(cliOutput);

      // Calculate and log execution time
      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;

      if (result.success) {
        Logger.debug`${
          this.name
        } command completed successfully in ${executionTime.toFixed(2)}s`;
      } else {
        Logger.debug`${this.name} command failed after ${executionTime.toFixed(
          2
        )}s: ${result.errorMessage || "Unknown error"}`;
      }

      return result;
    } catch (error: unknown) {
      Logger.debug`ERROR IN ${this.name} COMMAND: ${error}`;

      // CENTRALIZED ERROR LOGGING - SINGLE POINT OF CONTROL
      if (error instanceof ConductorError) {
        // Only log if not already logged
        if (!error.isLogged) {
          Logger.errorString(error.message);

          // Display suggestions if available
          if (error.suggestions && error.suggestions.length > 0) {
            Logger.suggestion("Suggestions");
            error.suggestions.forEach((suggestion: string) => {
              Logger.tipString(suggestion);
            });
          }

          error.isLogged = true; // Mark as logged
        }

        // Display additional details in debug mode
        if (cliOutput.debug && error.details) {
          Logger.debug`Error details: ${JSON.stringify(
            error.details,
            null,
            2
          )}`;
        }

        return {
          success: false,
          errorMessage: error.message,
          errorCode: error.code,
          details: error.details,
        };
      }

      // For unexpected errors, improve error details and visibility
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // ALWAYS ensure the error is visible to the user
      Logger.errorString(`Command execution failed: ${errorMessage}`);

      const wrappedError = ErrorFactory.args(
        `Command execution failed: ${errorMessage}`,
        [
          "Check the command arguments",
          "Use --debug for more detailed error information",
          "Verify input files and permissions",
        ]
      );

      // Log the suggestions once - don't duplicate
      Logger.suggestion("Suggestions");
      wrappedError.suggestions?.forEach((suggestion: string) => {
        Logger.tipString(suggestion);
      });

      // In debug mode, show stack trace
      if (cliOutput.debug && error instanceof Error && error.stack) {
        Logger.debug`Stack trace: ${error.stack}`;
      }

      return {
        success: false,
        errorMessage: wrappedError.message,
        errorCode: wrappedError.code,
        details: {
          originalError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  /**
   * Abstract method that must be implemented by derived classes.
   * Contains the specific logic for each command.
   *
   * @param cliOutput - The parsed command line arguments
   * @returns A promise that resolves to a CommandResult
   */
  protected abstract execute(cliOutput: CLIOutput): Promise<CommandResult>;

  /**
   * Validates command line arguments.
   * This base implementation checks for required input files.
   * Derived classes should override to add additional validation.
   *
   * @param cliOutput - The parsed command line arguments
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    // Only validate file paths if the command requires them
    // This allows commands to operate without files if needed
    if (!cliOutput.filePaths?.length && this.requiresInputFiles()) {
      throw ErrorFactory.args("No input files provided", [
        "Use -f or --file to specify input files",
        "Example: -f data.csv metadata.csv",
        "Check that file paths are correct",
      ]);
    }

    // Validate each input file exists if file paths are provided
    if (cliOutput.filePaths?.length) {
      for (const filePath of cliOutput.filePaths) {
        if (!fs.existsSync(filePath)) {
          throw ErrorFactory.file("Input file not found", filePath, [
            "Check the file path spelling",
            "Ensure the file exists in the specified location",
            "Verify you have access to the file",
          ]);
        }

        // Check if file is readable
        try {
          fs.accessSync(filePath, fs.constants.R_OK);
        } catch (error) {
          throw ErrorFactory.file("File is not readable", filePath, [
            "Check file permissions",
            "Ensure you have read access to the file",
            "Try running with appropriate privileges",
          ]);
        }

        // Check if file has content
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          throw ErrorFactory.invalidFile("File is empty", filePath, [
            "Ensure the file contains data",
            "Check if the file was created properly",
            "Verify the file wasn't truncated during transfer",
          ]);
        }
      }
    }
  }

  /**
   * Override this method in derived classes that don't require input files
   * Default is true for backward compatibility
   */
  protected requiresInputFiles(): boolean {
    return true;
  }

  /**
   * Helper method to create a directory if it doesn't exist.
   * Available for commands that need to create output directories.
   */
  protected createDirectoryIfNotExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        Logger.info`Created directory: ${dirPath}`;
      } catch (error) {
        throw ErrorFactory.file("Failed to create directory", dirPath, [
          "Check directory permissions",
          "Ensure parent directories exist",
          "Verify sufficient disk space",
        ]);
      }
    }
  }

  /**
   * Helper method to log generated files.
   * Available for commands that generate output files.
   */
  protected logGeneratedFile(filePath: string): void {
    Logger.success`Generated file: ${filePath}`;
  }
}
