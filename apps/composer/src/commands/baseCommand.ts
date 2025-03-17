import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes, handleError } from "../utils/errors";
import { Logger } from "../utils/logger";
import * as fs from "fs";
import * as path from "path";
import { validateFile, validateDelimiter } from "../validations/fileValidator";
import * as readline from "readline";
import { expandDirectoryPaths } from "../utils/fileUtils"; // Add this import

/**
 * Abstract base class for all CLI commands.
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
   * @returns A promise that resolves when command execution is complete
   */
  async run(cliOutput: CLIOutput): Promise<void> {
    const startTime = Date.now();

    try {
      // Enable debug logging if requested
      if (cliOutput.debug) {
        Logger.enableDebug();
        Logger.debug`Running ${this.name} command with debug enabled`;
      }

      // Validate input arguments
      await this.validate(cliOutput);

      Logger.debug`Output path before check: ${cliOutput.outputPath}`;

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
        Logger.defaultValueInfo(
          `Using default output path: ${cliOutput.outputPath}`,
          "Use -o or --output <path> to specify a different location"
        );
      } else {
        Logger.info`Output directory set to: ${cliOutput.outputPath}`;
      }

      // Check for existing files and confirm overwrite if needed
      // Skip confirmation if force flag is set
      if (cliOutput.outputPath && cliOutput.force !== true) {
        const shouldContinue = await this.checkForExistingFiles(
          cliOutput.outputPath
        );
        if (!shouldContinue) {
          Logger.info("Operation cancelled by user.");
          return;
        }
      } else if (cliOutput.force === true) {
        Logger.debug("Force flag enabled, skipping overwrite confirmation");
      }

      Logger.header(`Generating ${this.name} Configurations`);

      // Execute the specific command implementation
      await this.execute(cliOutput);
    } catch (error) {
      handleError(error);
    }
  }

  /**
   * Abstract method that must be implemented by derived classes.
   * Contains the specific logic for each command.
   *
   * @param cliOutput - The parsed command line arguments
   * @returns A promise that resolves when execution is complete
   */
  protected abstract execute(cliOutput: CLIOutput): Promise<void>;

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
   * Validates command line arguments.
   * Ensures that input files exist and validates any specified delimiter.
   *
   * @param cliOutput - The parsed command line arguments
   * @throws ComposerError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    if (!cliOutput.filePaths?.length) {
      throw new ComposerError(
        "No input files provided",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Expand directory paths to file paths
    const originalPaths = [...cliOutput.filePaths];
    const expandedPaths = expandDirectoryPaths(cliOutput.filePaths);

    if (expandedPaths.length === 0) {
      throw new ComposerError(
        "No valid input files found",
        ErrorCodes.INVALID_ARGS
      );
    }

    // If we found more files than were originally specified, log this info
    if (expandedPaths.length > originalPaths.length) {
      Logger.info(`Found ${expandedPaths.length} files from specified paths`);
    }

    // Replace the original file paths with expanded ones
    cliOutput.filePaths = expandedPaths;
    Logger.debug(`Expanded file paths: ${cliOutput.filePaths.join(", ")}`);

    // Validate each input file
    for (const filePath of cliOutput.filePaths) {
      await validateFile(filePath);
    }

    // Validate delimiter if provided
    if (cliOutput.delimiter) {
      validateDelimiter(cliOutput.delimiter);
    }
  }

  /**
   * Creates a directory if it doesn't already exist.
   *
   * @param dirPath - Path to the directory to create
   */
  protected createDirectoryIfNotExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      Logger.info`Created directory: ${dirPath}`;
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
    Logger.fileList(
      "The following file(s) in the output directory will be overwritten",
      filesToOverwrite
    );

    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Prompt user for confirmation
    return new Promise((resolve) => {
      rl.question(
        Logger.input("Do you wish to continue? [y/n]: "),
        (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === "y");
        }
      );
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
}
