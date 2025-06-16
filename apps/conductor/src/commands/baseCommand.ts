/**
 * Command Module
 *
 * Provides the base abstract class and interfaces for all command implementations.
 * Commands follow the Command Pattern for encapsulating operations.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 * Updated to use centralized file utilities.
 */

import { CLIOutput } from "../types/cli";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { validateFileAccess } from "../utils/fileUtils";

/**
 * Abstract base class for all CLI commands in the conductor service.
 * Provides common functionality for command execution, validation, and file handling.
 * Enhanced with ErrorFactory patterns for better error messages and user guidance.
 * Updated to match composer pattern - throws errors instead of returning CommandResult.
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
   * Updated to throw errors directly like composer instead of returning CommandResult.
   *
   * @param cliOutput - The parsed command line arguments
   * @returns A promise that resolves when command execution is complete
   */
  async run(cliOutput: CLIOutput): Promise<void> {
    const startTime = Date.now();

    // Enable debug logging if requested
    if (cliOutput.debug) {
      Logger.enableDebug();
      Logger.debugString(`Running ${this.name} command with debug enabled`);
    }

    Logger.header(`♫ Running ${this.name} Command`);

    // Enhanced validation with ErrorFactory
    await this.validate(cliOutput);

    Logger.debugString(`Output path before check: ${cliOutput.outputPath}`);

    let usingDefaultPath = false;

    // If no output path specified, use the default
    if (!cliOutput.outputPath?.trim()) {
      Logger.debugString("No output directory specified. Using default.");
      usingDefaultPath = true;
      cliOutput.outputPath = path.join(this.defaultOutputPath);
    }

    const isDefaultPath = this.isUsingDefaultPath(cliOutput);

    // Inform user about output path
    if (isDefaultPath || usingDefaultPath) {
      Logger.warn`Using default output path: ${cliOutput.outputPath}`;
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
        // Throw error instead of returning result
        throw ErrorFactory.validation("Operation cancelled by user", {
          command: this.name,
        });
      }
    } else if (forceFlag) {
      Logger.debugString("Force flag enabled, skipping overwrite confirmation");
    }

    Logger.debug`Starting execution of ${this.name} command`;

    // Execute the specific command implementation
    await this.execute(cliOutput);

    // Calculate and log execution time
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;

    Logger.debug`${
      this.name
    } baseCommand: command completed successfully in ${executionTime.toFixed(
      2
    )}s`;
  }

  /**
   * Abstract method that must be implemented by derived classes.
   * Contains the specific logic for each command.
   * Updated to throw errors directly instead of returning CommandResult.
   *
   * @param cliOutput - The parsed command line arguments
   * @returns A promise that resolves when execution is complete
   */
  protected abstract execute(cliOutput: CLIOutput): Promise<void>;

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

    // Enhanced file validation with detailed feedback using centralized utilities
    for (const filePath of cliOutput.filePaths) {
      validateFileAccess(filePath, "input file");
    }
  }

  /**
   * Checks if the current output path is the default one.
   *
   * @param cliOutput - The parsed command line arguments
   * @returns True if using default output path
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    if (!cliOutput.outputPath) return true;
    const normalizedOutput = path.normalize(cliOutput.outputPath);
    const normalizedDefault = path.normalize(this.defaultOutputPath);
    return normalizedOutput === normalizedDefault;
  }

  /**
   * Enhanced method to check for existing files in the output directory
   * and prompt user for confirmation if files would be overwritten.
   *
   * @param directoryPath - Path to the output directory
   * @param outputFileName - Optional specific filename to check
   * @returns Promise resolving to true if user confirms or no conflicts exist
   */
  protected async checkForExistingFiles(
    directoryPath: string,
    outputFileName?: string
  ): Promise<boolean> {
    // Create directory if it doesn't exist
    if (!fs.existsSync(directoryPath)) {
      try {
        fs.mkdirSync(directoryPath, { recursive: true });
        Logger.debug`Created output directory: ${directoryPath}`;
        return true; // No existing files to worry about
      } catch (error) {
        throw ErrorFactory.file(
          `Cannot create output directory: ${path.basename(directoryPath)}`,
          directoryPath,
          [
            "Check directory permissions",
            "Ensure parent directory is writable",
            "Verify disk space is available",
            "Try using a different output directory",
          ]
        );
      }
    }

    // Get existing files in directory
    let existingEntries: string[];
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
   * Enhanced utility method for validating file existence - now uses centralized utils
   */
  protected validateFileExists(filePath: string, fileType?: string): void {
    validateFileAccess(filePath, fileType);
  }
}
