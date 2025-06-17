/**
 * Command Module
 *
 * Provides the base abstract class and interfaces for all command implementations.
 * Commands follow the Command Pattern for encapsulating operations.
 * Updated to handle ConductorErrors properly and avoid duplicate logging.
 */

import { CLIOutput } from "../types/cli";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

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
 * Provides common functionality for command execution, validation, and file handling.
 */
export abstract class Command {
  /** Default directory where output files will be stored if not specified by user */
  protected defaultOutputPath: string;

  /** Default filename for output files */
  protected defaultOutputFileName: string = "output.json";

  /** Commands that don't need output file handling */
  protected readonly noOutputCommands = ["upload", "maestroIndex"];

  /**
   * Creates a new Command instance.
   *
   * @param name - Name of the command for logging and identification
   * @param defaultOutputPath - Optional custom default output directory
   */
  constructor(protected name: string, defaultOutputPath?: string) {
    this.defaultOutputPath = defaultOutputPath || "configs";
  }

  /**
   * Main method to run the command with the provided CLI arguments.
   * Handles validation, output path resolution, and error handling.
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

      // Validate input arguments - directly throws errors
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

      // Only handle output path for commands that need it
      if (!this.noOutputCommands.includes(cliOutput.profile)) {
        Logger.debug`Output path before check: ${cliOutput.outputPath}`;

        let usingDefaultPath = false;

        // If no output path specified, use the default
        if (!cliOutput.outputPath?.trim()) {
          Logger.debug`No output directory specified.`;
          usingDefaultPath = true;
          cliOutput.outputPath = path.join(this.defaultOutputPath);
        }

        const isDefaultPath = this.isUsingDefaultPath(cliOutput);

        // Inform user about output path
        if (isDefaultPath || usingDefaultPath) {
          Logger.infoString(
            `Using default output path: ${cliOutput.outputPath}`
          );
          Logger.tipString(
            "Use -o or --output <path> to specify a different location"
          );
        } else {
          Logger.infoString(`Output directory set to: ${cliOutput.outputPath}`);
        }

        // Check for existing files and confirm overwrite if needed
        // Skip confirmation if force flag is set in options
        const forceFlag = cliOutput.options?.force === true;
        if (cliOutput.outputPath && !forceFlag) {
          const shouldContinue = await this.checkForExistingFiles(
            cliOutput.outputPath
          );
          if (!shouldContinue) {
            Logger.infoString("Operation cancelled by user.");
            return {
              success: false,
              errorMessage: "Operation cancelled by user",
              errorCode: "USER_CANCELLED",
            };
          }
        } else if (forceFlag) {
          Logger.debug`Force flag enabled, skipping overwrite confirmation`;
        }
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
        )}s: ${result.errorMessage}`;
      }

      return result;
    } catch (error: unknown) {
      // Use Logger for debug output
      Logger.debug`ERROR IN ${this.name} COMMAND: ${error}`;

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.debug`Unexpected error in ${this.name} command: ${errorMessage}`;

      // Check if it's already a properly formatted ConductorError
      if (error instanceof Error && error.name === "ConductorError") {
        const conductorError = error as any;

        // Don't log here - let individual commands handle their own error logging
        // This prevents duplicate logging when commands handle errors internally
        return {
          success: false,
          errorMessage: conductorError.message,
          errorCode: conductorError.code,
          details: conductorError.details,
        };
      }

      // For unexpected errors, wrap them in a generic error
      const wrappedError = ErrorFactory.args(
        `Command execution failed: ${errorMessage}`,
        [
          "Check the command arguments",
          "Use --debug for more detailed error information",
          "Verify input files and permissions",
        ]
      );

      // Log the wrapped error
      Logger.errorString(`${wrappedError.message}`);
      if (wrappedError.suggestions && wrappedError.suggestions.length > 0) {
        Logger.generic("");
        Logger.suggestion("Suggestions");
        wrappedError.suggestions.forEach((suggestion: string) => {
          Logger.tipString(suggestion);
        });
        Logger.generic("");
      }

      return {
        success: false,
        errorMessage: wrappedError.message,
        errorCode: wrappedError.code,
        details: {
          originalError: error,
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
    if (!cliOutput.filePaths?.length) {
      throw ErrorFactory.args("No input files provided", [
        "Use -f or --file to specify input files",
        "Example: -f data.csv metadata.csv",
        "Check that file paths are correct",
      ]);
    }

    // Validate each input file exists
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

  /**
   * Checks if the current output path is the default one.
   *
   * @param cliOutput - The parsed command line arguments
   * @returns true if using the default output path, false otherwise
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath === this.defaultOutputPath ||
      cliOutput.outputPath ===
        path.join(this.defaultOutputPath, this.defaultOutputFileName)
    );
  }

  /**
   * Creates a directory if it doesn't already exist.
   *
   * @param dirPath - Path to the directory to create
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
   * Checks if files in the output directory would be overwritten.
   * Prompts the user for confirmation if files would be overwritten.
   *
   * @param outputPath - Path where output files will be written
   * @returns A promise that resolves to true if execution should continue, false otherwise
   */
  protected async checkForExistingFiles(outputPath: string): Promise<boolean> {
    let directoryPath = outputPath;
    let outputFileName: string | undefined;

    // Determine if outputPath is a file or directory
    if (path.extname(outputPath)) {
      Logger.debug`Output path appears to be a file: ${outputPath}`;
      directoryPath = path.dirname(outputPath);
      outputFileName = path.basename(outputPath);
      Logger.debug`Using directory: ${directoryPath}, fileName: ${outputFileName}`;
    }

    // Create the output directory if it doesn't exist
    this.createDirectoryIfNotExists(directoryPath);

    // Get existing entries in the directory
    const existingEntries = fs.existsSync(directoryPath)
      ? fs.readdirSync(directoryPath)
      : [];

    // Filter existing files that would be overwritten
    const filesToOverwrite = existingEntries.filter((entry) => {
      const fullPath = path.join(directoryPath, entry);

      // If specific file name is given, only check that exact file
      if (outputFileName) {
        return entry === outputFileName && fs.statSync(fullPath).isFile();
      }

      // If no specific file name, check if entry is a file and would match generated output
      return (
        fs.statSync(fullPath).isFile() &&
        (entry.endsWith(".json") ||
          entry.startsWith(this.defaultOutputFileName.split(".")[0]))
      );
    });

    // If no files would be overwritten, continue without prompting
    if (filesToOverwrite.length === 0) {
      return true;
    }

    // Display list of files that would be overwritten
    Logger.warnString(
      "The following file(s) in the output directory will be overwritten:"
    );
    filesToOverwrite.forEach((file) => Logger.generic(`- ${file}`));

    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Prompt user for confirmation
    return new Promise((resolve) => {
      rl.question("Do you wish to continue? [y/n]: ", (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y");
      });
    });
  }

  /**
   * Logs information about a generated file.
   *
   * @param filePath - Path to the generated file
   */
  protected logGeneratedFile(filePath: string): void {
    Logger.success`Generated file: ${filePath}`;
  }
}
