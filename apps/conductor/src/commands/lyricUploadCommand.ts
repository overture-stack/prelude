import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { LyricDataService } from "../services/lyric/lyricDataService";
import * as fs from "fs";

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
    const dataDirectory =
      cliOutput.config.lyric?.dataDirectory || process.env.LYRIC_DATA;
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
      // Validate required parameters
      if (!lyricUrl) {
        throw new ConductorError(
          "Lyric URL not specified. Use --lyric-url or set LYRIC_URL environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      if (!lecternUrl) {
        throw new ConductorError(
          "Lectern URL not specified. Use --lectern-url or set LECTERN_URL environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      if (!dataDirectory) {
        throw new ConductorError(
          "Data directory not specified. Use --data-directory or set LYRIC_DATA environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      // Validate data directory
      if (!fs.existsSync(dataDirectory)) {
        throw new ConductorError(
          `Data directory not found: ${dataDirectory}`,
          ErrorCodes.FILE_NOT_FOUND
        );
      }

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

  protected async validate(cliOutput: CLIOutput): Promise<CommandResult> {
    // Ensure config exists
    if (!cliOutput.config) {
      return {
        success: false,
        errorMessage: "Configuration is missing",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    const lyricUrl = cliOutput.config.lyric?.url || process.env.LYRIC_URL;
    const lecternUrl = cliOutput.config.lectern?.url || process.env.LECTERN_URL;
    const dataDirectory =
      cliOutput.config.lyric?.dataDirectory || process.env.LYRIC_DATA;

    if (!lyricUrl) {
      return {
        success: false,
        errorMessage:
          "No Lyric URL provided. Use --lyric-url option or set LYRIC_URL environment variable.",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    if (!lecternUrl) {
      return {
        success: false,
        errorMessage:
          "No Lectern URL provided. Use --lectern-url option or set LECTERN_URL environment variable.",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    if (!dataDirectory) {
      return {
        success: false,
        errorMessage:
          "No data directory provided. Use --data-directory option or set LYRIC_DATA environment variable.",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    return { success: true };
  }
}
