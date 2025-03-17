import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { LyricDataService } from "../services/lyric/lyricDataService";
import * as fs from "fs";
import * as path from "path";

/**
 * Command for loading data into Lyric
 */
export class LyricUploadCommand extends Command {
  private readonly MAX_RETRIES = 10;
  private readonly RETRY_DELAY = 20000; // 20 seconds

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

    // Provide default values and fallbacks
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
    const maxRetries =
      cliOutput.config.lyric?.maxRetries ||
      parseInt(process.env.MAX_RETRIES || "10");
    const retryDelay =
      cliOutput.config.lyric?.retryDelay ||
      parseInt(process.env.RETRY_DELAY || "20000");

    try {
      // Create Lyric data service
      const lyricDataService = new LyricDataService(lyricUrl, lecternUrl);

      // Print data loading information
      Logger.info(`\x1b[1;36mStarting data loading process...\x1b[0m`);
      Logger.info(`Lyric URL: ${lyricUrl}`);
      Logger.info(`Lectern URL: ${lecternUrl}`);
      Logger.info(`Data Directory: ${dataDirectory}`);
      Logger.info(`Category ID: ${categoryId}`);
      Logger.info(`Organization: ${organization}`);
      Logger.info(`Max Retries: ${maxRetries}`);

      // Load data into Lyric
      const result = await lyricDataService.loadData({
        categoryId,
        organization,
        dataDirectory,
        maxRetries: Number(maxRetries),
        retryDelay: Number(retryDelay),
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
      // Special handling for common error scenarios
      if (error instanceof ConductorError) {
        if (error.code === ErrorCodes.VALIDATION_FAILED) {
          Logger.info(
            "\nSubmission validation failed. Please check your data files for errors."
          );

          if (error.details?.status) {
            Logger.info(`Status: ${error.details.status}`);
          }

          if (error.details?.submissionId) {
            Logger.info(`Submission ID: ${error.details.submissionId}`);
            Logger.info(
              `You can check the submission details at: ${lyricUrl}/submission/${error.details.submissionId}`
            );
          }
        } else if (error.code === ErrorCodes.FILE_NOT_FOUND) {
          Logger.info(
            "\nNo matching files found. Make sure your CSV files match the schema name."
          );

          if (error.details?.suggestion) {
            Logger.info(`Suggestion: ${error.details.suggestion}`);
          }
        }
      }

      // Handle errors and return failure result
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof ConductorError
          ? error.code
          : ErrorCodes.CONNECTION_ERROR;

      // Extract additional details if available
      const errorDetails =
        error instanceof ConductorError ? error.details : undefined;

      return {
        success: false,
        errorMessage,
        errorCode,
        details: errorDetails,
      };
    }
  }

  /**
   * Resolves the data directory with fallback and validation
   * @param cliOutput The CLI configuration and inputs
   * @returns A resolved, absolute path to the data directory
   */
  private resolveDataDirectory(cliOutput: CLIOutput): string {
    // First, try to get the data directory from config or environment
    const rawDataDirectory =
      cliOutput.config.lyric?.dataDirectory ||
      process.env.LYRIC_DATA ||
      "./data";

    // Resolve to an absolute path
    const resolvedPath = path.resolve(process.cwd(), rawDataDirectory);

    // Validate the directory exists
    if (!fs.existsSync(resolvedPath)) {
      throw new ConductorError(
        `Data directory not found: ${resolvedPath}`,
        ErrorCodes.FILE_NOT_FOUND,
        {
          providedPath: rawDataDirectory,
          resolvedPath,
        }
      );
    }

    return resolvedPath;
  }

  /**
   * Validates command line arguments and configuration
   *
   * @param cliOutput - The parsed command line arguments
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    // Ensure config exists
    if (!cliOutput.config) {
      throw new ConductorError(
        "Configuration is missing",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate Lyric URL
    const lyricUrl = cliOutput.config.lyric?.url || process.env.LYRIC_URL;
    if (!lyricUrl) {
      throw new ConductorError(
        "No Lyric URL provided. Use --lyric-url option or set LYRIC_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate Lectern URL
    const lecternUrl = cliOutput.config.lectern?.url || process.env.LECTERN_URL;
    if (!lecternUrl) {
      throw new ConductorError(
        "No Lectern URL provided. Use --lectern-url option or set LECTERN_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // This will throw an error if the directory is invalid
    this.resolveDataDirectory(cliOutput);

    // Optional additional validations
    const categoryId =
      cliOutput.config.lyric?.categoryId || process.env.CATEGORY_ID || "1";
    if (!categoryId) {
      throw new ConductorError(
        "Category ID is invalid or not specified.",
        ErrorCodes.INVALID_ARGS
      );
    }

    const organization =
      cliOutput.config.lyric?.organization ||
      process.env.ORGANIZATION ||
      "OICR";
    if (!organization) {
      throw new ConductorError(
        "Organization is invalid or not specified.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }
}
