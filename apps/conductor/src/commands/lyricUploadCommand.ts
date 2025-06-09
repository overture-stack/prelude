// src/commands/lyricUploadCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import {
  DataSubmissionResult,
  LyricSubmissionService,
} from "../services/lyric/LyricSubmissionService";
import { DataSubmissionParams } from "../services/lyric/LyricSubmissionService";

/**
 * Command for loading data into Lyric
 * Much simpler now with workflow extracted to service layer
 */
export class LyricUploadCommand extends Command {
  constructor() {
    super("Lyric Data Loading");
  }

  /**
   * Executes the Lyric data loading process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    try {
      // Extract and validate configuration
      const submissionParams = this.extractSubmissionParams(cliOutput);
      const serviceConfig = this.extractServiceConfig(cliOutput);

      // Create service
      const lyricSubmissionService = new LyricSubmissionService(serviceConfig);

      // Check service health
      const healthResult = await lyricSubmissionService.checkHealth();
      if (!healthResult.healthy) {
        throw new ConductorError(
          `Lyric service is not healthy: ${
            healthResult.message || "Unknown error"
          }`,
          ErrorCodes.CONNECTION_ERROR
        );
      }

      // Log submission info
      this.logSubmissionInfo(submissionParams, serviceConfig.url);

      // Execute the complete workflow
      const result = await lyricSubmissionService.submitDataWorkflow(
        submissionParams
      );

      // Log success
      this.logSuccess(result);

      return {
        success: true,
        details: result,
      };
    } catch (error) {
      return this.handleExecutionError(error);
    }
  }

  /**
   * Validates command line arguments
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    // Ensure config exists
    if (!cliOutput.config) {
      throw new ConductorError(
        "Configuration is missing",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate required parameters
    const requiredParams = [
      {
        value: this.getLyricUrl(cliOutput),
        name: "Lyric URL",
        suggestion:
          "Use --lyric-url option or set LYRIC_URL environment variable",
      },
      {
        value: this.getDataDirectory(cliOutput),
        name: "Data directory",
        suggestion:
          "Use --data-directory (-d) option or set LYRIC_DATA environment variable",
      },
    ];

    for (const param of requiredParams) {
      if (!param.value) {
        throw new ConductorError(
          `${param.name} is required. ${param.suggestion}`,
          ErrorCodes.INVALID_ARGS
        );
      }
    }

    // Validate data directory exists
    const dataDirectory = this.getDataDirectory(cliOutput)!;
    if (!require("fs").existsSync(dataDirectory)) {
      throw new ConductorError(
        `Data directory not found: ${dataDirectory}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }
  }

  /**
   * Extract submission parameters from CLI output
   */
  private extractSubmissionParams(cliOutput: CLIOutput): DataSubmissionParams {
    return {
      categoryId:
        cliOutput.config.lyric?.categoryId || process.env.CATEGORY_ID || "1",
      organization:
        cliOutput.config.lyric?.organization ||
        process.env.ORGANIZATION ||
        "OICR",
      dataDirectory: this.getDataDirectory(cliOutput)!,
      maxRetries: parseInt(
        String(
          cliOutput.config.lyric?.maxRetries || process.env.MAX_RETRIES || "10"
        )
      ),
      retryDelay: parseInt(
        String(
          cliOutput.config.lyric?.retryDelay ||
            process.env.RETRY_DELAY ||
            "20000"
        )
      ),
    };
  }

  /**
   * Extract service configuration from CLI output
   */
  private extractServiceConfig(cliOutput: CLIOutput) {
    return {
      url: this.getLyricUrl(cliOutput)!,
      timeout: 30000, // Longer timeout for file uploads
      retries: 3,
    };
  }

  /**
   * Get Lyric URL from various sources
   */
  private getLyricUrl(cliOutput: CLIOutput): string | undefined {
    return (
      cliOutput.config.lyric?.url ||
      cliOutput.options?.lyricUrl ||
      process.env.LYRIC_URL
    );
  }

  /**
   * Get data directory from various sources
   */
  private getDataDirectory(cliOutput: CLIOutput): string | undefined {
    return (
      cliOutput.options?.dataDirectory ||
      cliOutput.config.lyric?.dataDirectory ||
      process.env.LYRIC_DATA
    );
  }

  /**
   * Log submission information
   */
  private logSubmissionInfo(
    params: DataSubmissionParams,
    serviceUrl: string
  ): void {
    Logger.info(`${chalk.bold.cyan("Starting Data Loading Process:")}`);
    Logger.info(`Lyric URL: ${serviceUrl}`);
    Logger.info(`Data Directory: ${params.dataDirectory}`);
    Logger.info(`Category ID: ${params.categoryId}`);
    Logger.info(`Organization: ${params.organization}`);
    Logger.info(`Max Retries: ${params.maxRetries}`);
  }

  /**
   * Log successful submission
   */
  private logSuccess(result: DataSubmissionResult): void {
    Logger.success("Data loading completed successfully");
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    - Submission ID: ${result.submissionId}`));
    Logger.generic(chalk.gray(`    - Status: ${result.status}`));
    Logger.generic(
      chalk.gray(`    - Files Submitted: ${result.filesSubmitted.join(", ")}`)
    );
    Logger.generic(" ");
  }

  /**
   * Handle execution errors with helpful user feedback
   */
  private handleExecutionError(error: unknown): CommandResult {
    if (error instanceof ConductorError) {
      // Add context-specific help
      if (error.code === ErrorCodes.FILE_NOT_FOUND) {
        Logger.info(
          "\nFile or directory issue detected. Check paths and permissions."
        );
      } else if (error.code === ErrorCodes.VALIDATION_FAILED) {
        Logger.info(
          "\nSubmission validation failed. Check your data files for errors."
        );
        if (error.details?.submissionId) {
          Logger.info(`Submission ID: ${error.details.submissionId}`);
        }
      } else if (error.code === ErrorCodes.CONNECTION_ERROR) {
        Logger.info(
          "\nConnection error. Check network and service availability."
        );
      }

      if (error.details?.suggestion) {
        Logger.tip(error.details.suggestion);
      }

      return {
        success: false,
        errorMessage: error.message,
        errorCode: error.code,
        details: error.details,
      };
    }

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      errorMessage: `Data loading failed: ${errorMessage}`,
      errorCode: ErrorCodes.CONNECTION_ERROR,
      details: { originalError: error },
    };
  }
}
