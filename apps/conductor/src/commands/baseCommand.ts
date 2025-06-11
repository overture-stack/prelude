/**
 * Command Module
 *
 * Provides the base abstract class and interfaces for all command implementations.
 * Commands follow the Command Pattern for encapsulating operations.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { CLIOutput } from "../types/cli";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { Logger } from "../utils/logger";
import { ErrorFactory, ErrorCodes } from "../utils/errors";

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
 * Enhanced with ErrorFactory patterns for better error messages and user guidance.
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
   * Enhanced with ErrorFactory for consistent error patterns.
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
        Logger.debugString(`Running ${this.name} command with debug enabled`);
      }

      // Enhanced validation with ErrorFactory
      try {
        await this.validate(cliOutput);
      } catch (validationError) {
        Logger.debugString(`Validation error: ${validationError}`);

        if (
          validationError instanceof Error &&
          validationError.name === "ConductorError"
        ) {
          throw validationError;
        }

        throw ErrorFactory.validation(
          String(validationError),
          { command: this.name },
          [
            "Check command parameters and arguments",
            "Verify all required inputs are provided",
            "Use --help for command-specific usage information",
            "Review command documentation",
          ]
        );
      }

      Logger.debugString(`Output path before check: ${cliOutput.outputPath}`);

      let usingDefaultPath = false;

      // If no output path specified, use the default
      if (!cliOutput.outputPath?.trim()) {
        Logger.debugString("No output directory specified.");
        usingDefaultPath = true;
        cliOutput.outputPath = path.join(this.defaultOutputPath);
      }

      const isDefaultPath = this.isUsingDefaultPath(cliOutput);

      // Inform user about output path
      if (isDefaultPath || usingDefaultPath) {
        Logger.info`Using default output path: ${cliOutput.outputPath}`;
        Logger.tipString(
          "Use -o or --output <path> to specify a different location"
        );
      } else {
        Logger.info`Output directory set to: ${cliOutput.outputPath}`;
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
        Logger.debugString(
          "Force flag enabled, skipping overwrite confirmation"
        );
      }

      Logger.info`Starting execution of ${this.name} command`;

      // Execute the specific command implementation
      const result = await this.execute(cliOutput);

      // Calculate and log execution time
      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;

      if (result.success) {
        Logger.info`${
          this.name
        } command completed successfully in ${executionTime.toFixed(2)}s`;
      } else {
        Logger.debug`${this.name} command failed after ${executionTime.toFixed(
          2
        )}s: ${result.errorMessage}`;
      }

      return result;
    } catch (error: unknown) {
      // Enhanced error handling with ErrorFactory
      Logger.debug`ERROR IN ${this.name} COMMAND:`;
      Logger.debug`Error details: ${error}`;

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.debugString(
        `Unexpected error in ${this.name} command: ${errorMessage}`
      );

      // If it's already a ConductorError, preserve it
      if (error instanceof Error && error.name === "ConductorError") {
        return {
          success: false,
          errorMessage: error.message,
          errorCode: (error as any).code || ErrorCodes.UNKNOWN_ERROR,
          details: {
            ...(error as any).details,
            command: this.name,
          },
        };
      }

      // Wrap unexpected errors with enhanced context
      const commandError = ErrorFactory.validation(
        `Command '${this.name}' failed: ${errorMessage}`,
        {
          command: this.name,
          originalError: error,
          stack: error instanceof Error ? error.stack : undefined,
        },
        [
          "Check command parameters and configuration",
          "Verify all required services are running",
          "Use --debug flag for detailed error information",
          "Try running the command again",
          "Contact support if the problem persists",
        ]
      );

      return {
        success: false,
        errorMessage: commandError.message,
        errorCode: commandError.code,
        details: commandError.details,
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
   * Enhanced with ErrorFactory for better error messages.
   *
   * @param cliOutput - The parsed command line arguments
   * @throws Enhanced ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    if (!cliOutput.filePaths?.length) {
      throw ErrorFactory.args("No input files provided", this.name, [
        "Provide input files with -f or --file parameter",
        "Example: conductor upload -f data.csv",
        "Use wildcards for multiple files: -f *.csv",
        "Specify multiple files: -f file1.csv file2.csv",
      ]);
    }

    // Enhanced file validation with detailed feedback
    for (const filePath of cliOutput.filePaths) {
      try {
        this.validateSingleFile(filePath);
      } catch (error) {
        if (error instanceof Error && error.name === "ConductorError") {
          throw error;
        }

        throw ErrorFactory.file(
          `File validation failed: ${path.basename(filePath)}`,
          filePath,
          [
            "Check that the file exists and is readable",
            "Verify file permissions",
            "Ensure file is not empty or corrupted",
            "Try using absolute path if relative path fails",
          ]
        );
      }
    }
  }

  /**
   * Enhanced single file validation helper
   */
  private validateSingleFile(filePath: string): void {
    const fileName = path.basename(filePath);

    if (!fs.existsSync(filePath)) {
      throw ErrorFactory.file(`Input file not found: ${fileName}`, filePath, [
        "Check that the file path is correct",
        "Ensure the file exists at the specified location",
        "Verify file permissions allow read access",
        `Current directory: ${process.cwd()}`,
        "Use absolute path if relative path is not working",
      ]);
    }

    // Check if file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file(`File '${fileName}' is not readable`, filePath, [
        "Check file permissions",
        "Ensure the file is not locked by another process",
        "Verify you have read access to the file",
        "Try copying the file to a different location",
      ]);
    }

    // Check if file has content
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw ErrorFactory.file(`File '${fileName}' is empty`, filePath, [
        "Ensure the file contains data",
        "Check if the file was properly created",
        "Verify the file is not corrupted",
        "Try recreating the file with valid content",
      ]);
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
   * Enhanced with ErrorFactory for better error handling.
   *
   * @param dirPath - Path to the directory to create
   */
  protected createDirectoryIfNotExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        Logger.info`Created directory: ${dirPath}`;
      } catch (error) {
        throw ErrorFactory.file(
          `Cannot create directory: ${path.basename(dirPath)}`,
          dirPath,
          [
            "Check directory permissions",
            "Ensure parent directories exist",
            "Verify disk space is available",
            "Use a different output directory",
            "Try running with elevated permissions",
          ]
        );
      }
    }
  }

  /**
   * Checks if files in the output directory would be overwritten.
   * Prompts the user for confirmation if files would be overwritten.
   * Enhanced with better error handling and user feedback.
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
    let existingEntries: string[] = [];
    try {
      existingEntries = fs.existsSync(directoryPath)
        ? fs.readdirSync(directoryPath)
        : [];
    } catch (error) {
      throw ErrorFactory.file(
        `Cannot read output directory: ${path.basename(directoryPath)}`,
        directoryPath,
        [
          "Check directory permissions",
          "Ensure directory is accessible",
          "Verify directory is not corrupted",
          "Try using a different output directory",
        ]
      );
    }

    // Filter existing files that would be overwritten
    const filesToOverwrite = existingEntries.filter((entry) => {
      const fullPath = path.join(directoryPath, entry);

      try {
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
      } catch (error) {
        // Skip entries we can't stat
        return false;
      }
    });

    // If no files would be overwritten, continue without prompting
    if (filesToOverwrite.length === 0) {
      return true;
    }

    // Display list of files that would be overwritten
    Logger.info`The following file(s) in the output directory will be overwritten:`;
    filesToOverwrite.forEach((file) => Logger.info`- ${file}`);

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
    Logger.info`Generated file: ${filePath}`;
  }

  /**
   * Enhanced utility method for validating required parameters
   */
  protected validateRequired(
    params: Record<string, any>,
    requiredFields: string[],
    context?: string
  ): void {
    const missingFields = requiredFields.filter(
      (field) =>
        params[field] === undefined ||
        params[field] === null ||
        params[field] === ""
    );

    if (missingFields.length > 0) {
      const contextMsg = context ? ` for ${context}` : "";

      throw ErrorFactory.validation(
        `Missing required parameters${contextMsg}`,
        {
          missingFields,
          provided: Object.keys(params),
          context,
          command: this.name,
        },
        [
          `Provide values for: ${missingFields.join(", ")}`,
          "Check command line arguments and options",
          "Verify all required parameters are included",
          `Use 'conductor ${this.name} --help' for parameter information`,
        ]
      );
    }
  }

  /**
   * Enhanced utility method for validating file existence
   */
  protected validateFileExists(filePath: string, fileType?: string): void {
    const fileName = path.basename(filePath);
    const typeDescription = fileType || "file";

    if (!filePath) {
      throw ErrorFactory.args(
        `${typeDescription} path not specified`,
        this.name,
        [
          `Provide a ${typeDescription} path`,
          "Check command line arguments",
          `Example: --${typeDescription.toLowerCase()}-file example.json`,
        ]
      );
    }

    if (!fs.existsSync(filePath)) {
      throw ErrorFactory.file(
        `${typeDescription} not found: ${fileName}`,
        filePath,
        [
          "Check that the file path is correct",
          "Ensure the file exists at the specified location",
          "Verify file permissions allow read access",
          `Current directory: ${process.cwd()}`,
        ]
      );
    }

    // Check file readability
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file(
        `${typeDescription} is not readable: ${fileName}`,
        filePath,
        [
          "Check file permissions",
          "Ensure the file is not locked by another process",
          "Verify you have read access to the file",
        ]
      );
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw ErrorFactory.file(
        `${typeDescription} is empty: ${fileName}`,
        filePath,
        [
          `Ensure the ${typeDescription.toLowerCase()} contains data`,
          "Check if the file was properly created",
          "Verify the file is not corrupted",
        ]
      );
    }

    Logger.debugString(`${typeDescription} validated: ${fileName}`);
  }
}
