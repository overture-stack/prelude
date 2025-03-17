/**
 * Command Module
 *
 * Provides the base abstract class and interfaces for all command implementations.
 * Commands follow the Command Pattern for encapsulating operations.
 */

import { CLIOutput } from "../types/cli";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorCodes, handleError } from "../utils/errors";

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
        Logger.debug(`Running ${this.name} command with debug enabled`);
      }

      // Validate input arguments - directly throws errors
      try {
        await this.validate(cliOutput);
      } catch (validationError) {
        Logger.debug(`Validation error: ${validationError}`);
        if (validationError instanceof Error) {
          throw validationError;
        }
        throw new ConductorError(
          String(validationError),
          ErrorCodes.VALIDATION_FAILED
        );
      }

      Logger.debug(`Output path before check: ${cliOutput.outputPath}`);

      let usingDefaultPath = false;

      // If no output path specified, use the default
      if (!cliOutput.outputPath?.trim()) {
        Logger.debug("No output directory specified.");
        usingDefaultPath = true;
        cliOutput.outputPath = path.join(this.defaultOutputPath);
      }

      const isDefaultPath = this.isUsingDefaultPath(cliOutput);

      // Inform user about output path
      if (isDefaultPath || usingDefaultPath) {
        Logger.info(
          `Using default output path: ${cliOutput.outputPath}`,
          "Use -o or --output <path> to specify a different location"
        );
      } else {
        Logger.info(`Output directory set to: ${cliOutput.outputPath}`);
      }

      // Check for existing files and confirm overwrite if needed
      // Skip confirmation if force flag is set in options
      const forceFlag = cliOutput.options?.force === true;
      if (cliOutput.outputPath && !forceFlag) {
        const shouldContinue = await this.checkForExistingFiles(
          cliOutput.outputPath
        );
        if (!shouldContinue) {
          Logger.info("Operation cancelled by user.");
          return {
            success: false,
            errorMessage: "Operation cancelled by user",
            errorCode: "USER_CANCELLED",
          };
        }
      } else if (forceFlag) {
        Logger.debug("Force flag enabled, skipping overwrite confirmation");
      }

      Logger.info(`Starting execution of ${this.name} command`);

      // Execute the specific command implementation
      const result = await this.execute(cliOutput);

      // Calculate and log execution time
      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;

      if (result.success) {
        Logger.info(
          `${
            this.name
          } command completed successfully in ${executionTime.toFixed(2)}s`
        );
      } else {
        Logger.error(
          `${this.name} command failed after ${executionTime.toFixed(2)}s: ${
            result.errorMessage
          }`
        );
      }

      return result;
    } catch (error: unknown) {
      // Use Logger instead of console.error
      Logger.debug(`ERROR IN ${this.name} COMMAND:`, error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.debug(`Unexpected error in ${this.name} command: ${errorMessage}`);

      return {
        success: false,
        errorMessage,
        errorCode:
          error instanceof ConductorError
            ? error.code
            : ErrorCodes.UNKNOWN_ERROR,
        details: {
          error,
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
      throw new ConductorError(
        "No input files provided",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate each input file exists
    for (const filePath of cliOutput.filePaths) {
      if (!fs.existsSync(filePath)) {
        throw new ConductorError(
          `Input file not found: ${filePath}`,
          ErrorCodes.FILE_NOT_FOUND
        );
      }

      // Check if file is readable
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch (error) {
        throw new ConductorError(
          `File '${filePath}' is not readable`,
          ErrorCodes.INVALID_FILE,
          error
        );
      }

      // Check if file has content
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new ConductorError(
          `File '${filePath}' is empty`,
          ErrorCodes.INVALID_FILE
        );
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
      fs.mkdirSync(dirPath, { recursive: true });
      Logger.info(`Created directory: ${dirPath}`);
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
      Logger.debug(`Output path appears to be a file: ${outputPath}`);
      directoryPath = path.dirname(outputPath);
      outputFileName = path.basename(outputPath);
      Logger.debug(
        `Using directory: ${directoryPath}, fileName: ${outputFileName}`
      );
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
    Logger.info(
      "The following file(s) in the output directory will be overwritten:"
    );
    filesToOverwrite.forEach((file) => Logger.info(`- ${file}`));

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
    Logger.info(`Generated file: ${filePath}`);
  }
}
