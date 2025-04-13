import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
const { exec } = require("child_process");

/**
 * Interface for Lyric submission response
 */
interface LyricSubmissionResponse {
  submissionId: string;
  status: string;
  [key: string]: any;
}

/**
 * Expands directory paths to individual file paths, filtering by extension if specified
 * @param paths Array of file or directory paths
 * @param extensions Optional array of extensions to filter by (e.g., ['.csv', '.json'])
 * @returns Array of expanded file paths
 */
function expandDirectoryPaths(
  paths: string[],
  extensions?: string[]
): string[] {
  if (!paths || paths.length === 0) {
    return [];
  }

  let expandedPaths: string[] = [];

  paths.forEach((inputPath) => {
    try {
      const stats = fs.statSync(inputPath);

      if (stats.isDirectory()) {
        Logger.debug(`Processing directory: ${inputPath}`);

        // Read all files in the directory
        const filesInDir = fs
          .readdirSync(inputPath)
          .map((file) => path.join(inputPath, file))
          .filter((file) => {
            try {
              const fileStat = fs.statSync(file);

              // Skip if not a file
              if (!fileStat.isFile()) {
                return false;
              }

              // Filter by extension if specified
              if (extensions && extensions.length > 0) {
                const ext = path.extname(file).toLowerCase();
                return extensions.includes(ext);
              }

              return true;
            } catch (error) {
              Logger.debug(`Error accessing file ${file}: ${error}`);
              return false;
            }
          });

        if (filesInDir.length === 0) {
          if (extensions && extensions.length > 0) {
            Logger.warn(
              `No files with extensions ${extensions.join(
                ", "
              )} found in directory: ${inputPath}`
            );
          } else {
            Logger.warn(`Directory is empty: ${inputPath}`);
          }
        } else {
          Logger.debug(
            `Found ${filesInDir.length} files in directory ${inputPath}`
          );
          expandedPaths = [...expandedPaths, ...filesInDir];
        }
      } else {
        // It's a file, check extension if needed
        if (extensions && extensions.length > 0) {
          const ext = path.extname(inputPath).toLowerCase();
          if (extensions.includes(ext)) {
            expandedPaths.push(inputPath);
          } else {
            Logger.debug(
              `Skipping file with unsupported extension: ${inputPath}`
            );
          }
        } else {
          expandedPaths.push(inputPath);
        }
      }
    } catch (error) {
      Logger.debug(`Error accessing path ${inputPath}: ${error}`);
      throw new ConductorError(
        `Cannot access path: ${inputPath}`,
        ErrorCodes.FILE_NOT_FOUND,
        error
      );
    }
  });

  return expandedPaths;
}

/**
 * Gets all CSV files from the provided directory
 * @param dirPath Directory path to scan
 * @returns Array of CSV file paths
 */
function getCSVFiles(dirPath: string): string[] {
  return expandDirectoryPaths([dirPath], [".csv"]);
}

/**
 * Command for loading data into Lyric
 */
export class LyricUploadCommand extends Command {
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY = 5000;

  constructor() {
    super("Lyric Data Loading");
  }

  /**
   * Executes the Lyric data loading process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    // Ensure config exists
    if (!cliOutput.config) {
      throw new ConductorError(
        "Configuration is missing",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Extract configuration with fallbacks
    const lyricUrl =
      cliOutput.config.lyric?.url ||
      process.env.LYRIC_URL ||
      "http://localhost:3030";
    const lecternUrl =
      cliOutput.config.lectern?.url ||
      process.env.LECTERN_URL ||
      "http://localhost:3031";
    const dataDirectory = this.resolveDataDirectory(cliOutput);
    const categoryId =
      cliOutput.config.lyric?.categoryId || process.env.CATEGORY_ID || "1";
    const organization =
      cliOutput.config.lyric?.organization ||
      process.env.ORGANIZATION ||
      "OICR";
    const maxRetries = parseInt(
      String(
        cliOutput.config.lyric?.maxRetries || process.env.MAX_RETRIES || "10"
      )
    );
    const retryDelay = parseInt(
      String(
        cliOutput.config.lyric?.retryDelay || process.env.RETRY_DELAY || "20000"
      )
    );

    try {
      // Print data loading information
      Logger.info(`\x1b[1;36mStarting data loading process...\x1b[0m`);
      Logger.info(`Lyric URL: ${lyricUrl}`);
      Logger.info(`Lectern URL: ${lecternUrl}`);
      Logger.info(`Data Directory: ${dataDirectory}`);
      Logger.info(`Category ID: ${categoryId}`);
      Logger.info(`Organization: ${organization}`);
      Logger.info(`Max Retries: ${maxRetries}`);

      // Find all CSV files in the directory
      const csvFilePaths = this.findCSVFiles(dataDirectory);

      if (csvFilePaths.length === 0) {
        throw new ConductorError(
          `No CSV files found in ${dataDirectory}`,
          ErrorCodes.FILE_NOT_FOUND,
          {
            suggestion: "Make sure your directory contains valid CSV files.",
          }
        );
      }

      Logger.info(`Found ${csvFilePaths.length} CSV files to submit:`);
      csvFilePaths.forEach((file) => {
        Logger.info(`- ${path.basename(file)}`);
      });

      // Submit all files to Lyric using curl
      const result = await this.submitFilesWithCurl({
        categoryId,
        organization,
        csvFilePaths,
        lyricUrl,
        maxRetries,
        retryDelay,
      });

      // Log success message
      Logger.success(`Data loading completed successfully`);
      Logger.generic(" ");
      Logger.generic(chalk.gray(`    - Submission ID: ${result.submissionId}`));
      Logger.generic(chalk.gray(`    - Status: ${result.status}`));
      Logger.generic(" ");

      return {
        success: true,
        details: result,
      };
    } catch (error) {
      // Handle errors and provide helpful messages
      return this.handleExecutionError(error, lyricUrl);
    }
  }

  /**
   * Resolves the data directory with fallback and validation
   * @param cliOutput The CLI configuration and inputs
   * @returns A resolved, absolute path to the data directory
   */
  private resolveDataDirectory(cliOutput: CLIOutput): string {
    // First check command-line options.dataDirectory which is set by -d flag
    const fromCommandLine = cliOutput.options?.dataDirectory;

    // Then check the config object and environment
    const fromConfig = cliOutput.config.lyric?.dataDirectory;
    const fromEnv = process.env.LYRIC_DATA;

    // Use the first available source, with fallback to "./data"
    const rawDataDirectory =
      fromCommandLine || fromConfig || fromEnv || "./data";

    // Log where we found the directory path
    if (fromCommandLine) {
      Logger.debug(
        `Using data directory from command line: ${fromCommandLine}`
      );
    } else if (fromConfig) {
      Logger.debug(`Using data directory from config: ${fromConfig}`);
    } else if (fromEnv) {
      Logger.debug(`Using data directory from environment: ${fromEnv}`);
    } else {
      Logger.debug(`Using default data directory: ./data`);
    }

    // Resolve to an absolute path
    const resolvedPath = path.resolve(process.cwd(), rawDataDirectory);
    Logger.debug(`Resolved data directory path: ${resolvedPath}`);

    // Validate the directory exists
    if (!fs.existsSync(resolvedPath)) {
      throw new ConductorError(
        `Data directory not found: ${resolvedPath}`,
        ErrorCodes.FILE_NOT_FOUND,
        {
          providedPath: rawDataDirectory,
          resolvedPath,
          suggestion: "Make sure the directory exists and is accessible.",
        }
      );
    }

    // Validate it's actually a directory
    if (!fs.statSync(resolvedPath).isDirectory()) {
      throw new ConductorError(
        `Path exists but is not a directory: ${resolvedPath}`,
        ErrorCodes.INVALID_ARGS,
        {
          providedPath: rawDataDirectory,
          resolvedPath,
          suggestion: "Provide a valid directory path, not a file path.",
        }
      );
    }

    return resolvedPath;
  }

  /**
   * Finds all CSV files in the directory
   * @param directory Directory to search
   * @returns Array of CSV file paths (with full paths)
   */
  private findCSVFiles(directory: string): string[] {
    try {
      // Use the utility function to get all CSV files
      const csvFilePaths = getCSVFiles(directory);

      if (csvFilePaths.length === 0) {
        Logger.warn(`No CSV files found in directory: ${directory}`);
      } else {
        Logger.debug(`Found ${csvFilePaths.length} CSV files in ${directory}`);
      }

      return csvFilePaths;
    } catch (error) {
      throw new ConductorError(
        `Error reading directory contents: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.FILE_NOT_FOUND,
        {
          directory,
          error: error instanceof Error ? error.message : String(error),
          suggestion: "Check directory permissions and path spelling.",
        }
      );
    }
  }

  /**
   * Submit files to Lyric using curl
   * @param params Parameters for submission
   * @returns Lyric submission response
   */
  private async submitFilesWithCurl(params: {
    categoryId: string;
    organization: string;
    csvFilePaths: string[];
    lyricUrl: string;
    maxRetries: number;
    retryDelay: number;
  }): Promise<LyricSubmissionResponse> {
    const {
      categoryId,
      organization,
      csvFilePaths,
      lyricUrl,
      maxRetries,
      retryDelay,
    } = params;

    try {
      // Normalize URL
      const url = `${lyricUrl.replace(
        /\/$/,
        ""
      )}/submission/category/${categoryId}/data`;

      // Filter out any invalid CSV files
      const validFiles = csvFilePaths.filter((filePath) => {
        try {
          const stats = fs.statSync(filePath);
          return stats.isFile() && stats.size > 0;
        } catch (err) {
          Logger.warn(
            `Skipping ${path.basename(filePath)} - error accessing file: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          return false;
        }
      });

      if (validFiles.length === 0) {
        throw new ConductorError(
          "No valid CSV files to submit after filtering",
          ErrorCodes.INVALID_ARGS,
          {
            suggestion: "Ensure your CSV files are valid and not empty.",
          }
        );
      }

      // Build curl command
      let command = `curl -X 'POST' '${url}' -H 'accept: application/json' -H 'Content-Type: multipart/form-data'`;

      // Add each file
      for (const filePath of validFiles) {
        command += ` -F 'files=@${filePath};type=text/csv'`;
      }

      // Add organization
      command += ` -F 'organization=${organization}'`;

      // Log the submission information
      Logger.info(`\x1b[1;36mSubmitting Data:\x1b[0m`);
      Logger.info(`API URL: ${url}`);
      Logger.info(
        `Files to submit: ${validFiles
          .map((file) => path.basename(file))
          .join(", ")}`
      );
      Logger.info(`Organization: ${organization}`);

      // Execute the curl command
      Logger.debug(`Executing curl command: ${command}`);
      const { stdout, stderr } = await this.execCommand(command);

      if (stderr && stderr.trim()) {
        Logger.debug(`Curl stderr output: ${stderr}`);
      }

      // Parse the JSON response from curl
      let responseData;
      try {
        responseData = JSON.parse(stdout);
      } catch (parseError) {
        Logger.error(`Failed to parse curl response as JSON: ${stdout}`);
        throw new ConductorError(
          `Failed to parse curl response: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`,
          ErrorCodes.CONNECTION_ERROR,
          { stdout, stderr }
        );
      }

      // Extract submission ID from response
      const submissionId = responseData?.submissionId;
      if (!submissionId) {
        throw new ConductorError(
          "Could not extract submission ID from response",
          ErrorCodes.CONNECTION_ERROR,
          { response: responseData }
        );
      }

      Logger.success(`Submission created with ID: ${submissionId}`);

      // Wait for validation to complete
      const status = await this.waitForValidation(
        submissionId,
        lyricUrl,
        maxRetries,
        retryDelay
      );

      // Commit the submission if valid
      if (status === "VALID") {
        await this.commitSubmission(categoryId, submissionId, lyricUrl);
        return {
          submissionId: submissionId.toString(),
          status: "COMMITTED",
        };
      } else {
        throw new ConductorError(
          `Submission has unexpected status: ${status}`,
          ErrorCodes.VALIDATION_FAILED,
          {
            submissionId,
            status,
            suggestion: "Check Lyric server logs for validation details.",
          }
        );
      }
    } catch (error) {
      if (error instanceof ConductorError) {
        throw error;
      }

      throw new ConductorError(
        `Data submission failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.CONNECTION_ERROR,
        {
          error: error instanceof Error ? error.stack : String(error),
          suggestion: "Check your network connection and Lyric server status.",
        }
      );
    }
  }

  /**
   * Wait for validation to complete
   * @param submissionId Submission ID to check
   * @param lyricUrl Lyric URL
   * @param maxRetries Maximum number of retries
   * @param retryDelay Delay between retries in milliseconds
   * @returns Final validation status
   */
  private async waitForValidation(
    submissionId: string,
    lyricUrl: string,
    maxRetries: number,
    retryDelay: number
  ): Promise<string> {
    let retries = 0;

    Logger.info(`Waiting for server to validate submission ${submissionId}...`);
    Logger.info(
      `This may take a few minutes depending on file size and complexity.`
    );

    while (retries < maxRetries) {
      Logger.info(
        `Checking validation status (attempt ${retries + 1}/${maxRetries})...`
      );

      try {
        const response = await axios.get(
          `${lyricUrl}/submission/${submissionId}`,
          {
            headers: { accept: "application/json" },
            timeout: 10000, // 10 second timeout for status check
          }
        );

        const responseData = response.data as { status?: string };
        const status = responseData?.status;

        if (!status) {
          throw new ConductorError(
            "Could not extract status from response",
            ErrorCodes.CONNECTION_ERROR,
            {
              response: responseData,
              suggestion:
                "Response format may have changed. Check Lyric server documentation.",
            }
          );
        }

        Logger.info(`Current status: ${status}`);

        if (status === "VALID") {
          Logger.success(`Submission validation passed`);
          return status;
        } else if (status === "INVALID") {
          throw new ConductorError(
            "Submission validation failed",
            ErrorCodes.VALIDATION_FAILED,
            {
              submissionId,
              status,
              suggestion: `Check validation details at ${lyricUrl}/submission/${submissionId} in your browser`,
            }
          );
        }

        // Wait for next check
        Logger.info(
          `Waiting ${retryDelay / 1000} seconds before next check...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retries++;
      } catch (error) {
        if (error instanceof ConductorError) {
          throw error;
        }

        if (
          this.isAxiosError(error) &&
          (error as any).response?.status === 404
        ) {
          throw new ConductorError(
            `Submission ${submissionId} not found. It may have been deleted or never created.`,
            ErrorCodes.CONNECTION_ERROR,
            {
              submissionId,
              suggestion: "Check the submission ID and Lyric server status.",
            }
          );
        }

        throw new ConductorError(
          `Error checking submission status: ${
            error instanceof Error ? error.message : String(error)
          }`,
          ErrorCodes.CONNECTION_ERROR,
          {
            error: error instanceof Error ? error.stack : String(error),
            submissionId,
            retryCount: retries,
            suggestion:
              "Check your network connection and Lyric server status.",
          }
        );
      }
    }

    throw new ConductorError(
      `Validation timed out after ${maxRetries} attempts`,
      ErrorCodes.CONNECTION_ERROR,
      {
        submissionId,
        attempts: maxRetries,
        totalWaitTime: `${(maxRetries * retryDelay) / 1000} seconds`,
        suggestion: `Your submission may still be processing. Check status manually at ${lyricUrl}/submission/${submissionId}`,
      }
    );
  }

  /**
   * Commit a submission
   * @param categoryId Category ID
   * @param submissionId Submission ID
   * @param lyricUrl Lyric URL
   * @returns True if commit successful
   */
  private async commitSubmission(
    categoryId: string,
    submissionId: string,
    lyricUrl: string
  ): Promise<boolean> {
    try {
      Logger.info(`\x1b[1;36mCommitting Submission:\x1b[0m ${submissionId}`);

      // Make commit request
      const commitUrl = `${lyricUrl}/submission/category/${categoryId}/commit/${submissionId}`;
      const response = await axios.post(commitUrl, null, {
        headers: {
          accept: "application/json",
        },
        timeout: 20000,
      });

      Logger.success(`Submission committed successfully`);
      return true;
    } catch (error) {
      // Handle commit errors with more context
      if (this.isAxiosError(error)) {
        const axiosError = error as any;

        // Special handling for 409 Conflict (already committed)
        if (axiosError.response?.status === 409) {
          Logger.warn(`Submission may already be committed`);
          return true;
        }

        throw new ConductorError(
          `Failed to commit submission: ${axiosError.response?.status || ""} ${
            axiosError.message
          }`,
          ErrorCodes.CONNECTION_ERROR,
          {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            submissionId,
            categoryId,
            suggestion: "Check Lyric server logs for more details.",
          }
        );
      }

      throw new ConductorError(
        `Failed to commit submission: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.CONNECTION_ERROR,
        {
          error: error instanceof Error ? error.stack : String(error),
          submissionId,
          categoryId,
          suggestion: "Check your network connection and Lyric server status.",
        }
      );
    }
  }

  /**
   * Execute a command via child_process.exec
   * @param command Command to execute
   * @returns Promise resolving to stdout and stderr
   */
  private async execCommand(
    command: string
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      exec(
        command,
        { maxBuffer: 10 * 1024 * 1024 },
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            reject(
              new ConductorError(
                `Command execution failed: ${error.message}`,
                ErrorCodes.CONNECTION_ERROR,
                { error, stderr, command }
              )
            );
            return;
          }
          resolve({ stdout, stderr });
        }
      );
    });
  }

  /**
   * Type guard to check if an error is an Axios error
   * @param error Error to check
   * @returns True if error is an Axios error
   */
  private isAxiosError(error: any): boolean {
    return Boolean(
      error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        error.isAxiosError === true
    );
  }

  /**
   * Handle execution errors with helpful user feedback
   * @param error The caught error
   * @param lyricUrl The Lyric URL for context
   * @returns CommandResult with error details
   */
  private handleExecutionError(
    error: unknown,
    lyricUrl: string
  ): CommandResult {
    // Special handling for common error scenarios
    if (error instanceof ConductorError) {
      // Validation failures
      if (error.code === ErrorCodes.VALIDATION_FAILED) {
        Logger.info(
          "\nSubmission validation failed. Please check your data files for errors."
        );

        if (error.details?.status) {
          Logger.error(`Status: ${error.details.status}\n`);
        }

        if (error.details?.submissionId) {
          Logger.info(`Submission ID: ${error.details.submissionId}`);
          Logger.generic(
            `     - Details found at: ${lyricUrl}/submission/${error.details.submissionId}`
          );
        }
      }
      // File not found
      else if (error.code === ErrorCodes.FILE_NOT_FOUND) {
        Logger.info(
          "\nFile or directory issue detected. Check paths and permissions."
        );

        if (error.details?.suggestion) {
          Logger.info(`Suggestion: ${error.details.suggestion}`);
        }
      }
      // Connection errors
      else if (error.code === ErrorCodes.CONNECTION_ERROR) {
        Logger.info(
          "\nConnection error. Check network and server availability."
        );

        if (error.details?.suggestion) {
          Logger.info(`Suggestion: ${error.details.suggestion}`);
        }
      }

      return {
        success: false,
        errorMessage: error.message,
        errorCode: error.code,
        details: error.details,
      };
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      errorMessage,
      errorCode: ErrorCodes.CONNECTION_ERROR,
      details: {
        error: error instanceof Error ? error.stack : String(error),
        suggestion:
          "An unexpected error occurred. Try running with --debug for more information.",
      },
    };
  }

  /**
   * Validates command line arguments
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    // Ensure config exists
    if (!cliOutput.config) {
      throw new ConductorError(
        "Configuration is missing",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Extract key parameters
    const lyricUrl = cliOutput.config.lyric?.url || process.env.LYRIC_URL;
    const lecternUrl = cliOutput.config.lectern?.url || process.env.LECTERN_URL;

    // Try to get data directory from CLI first, then config, then env
    const dataDirectoryFromCli = cliOutput.options?.dataDirectory;
    const dataDirectoryFromConfig = cliOutput.config.lyric?.dataDirectory;
    const dataDirectoryFromEnv = process.env.LYRIC_DATA;
    const dataDirectory =
      dataDirectoryFromCli || dataDirectoryFromConfig || dataDirectoryFromEnv;

    // Validate required parameters
    if (!lyricUrl) {
      throw new ConductorError(
        "No Lyric URL provided. Use --lyric-url option or set LYRIC_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (!lecternUrl) {
      throw new ConductorError(
        "No Lectern URL provided. Use --lectern-url option or set LECTERN_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (!dataDirectory) {
      throw new ConductorError(
        "No data directory provided. Use --data-directory (-d) option or set LYRIC_DATA environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }
}
