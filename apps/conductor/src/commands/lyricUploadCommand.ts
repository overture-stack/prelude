// src/commands/lyricUploadCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import {
  DataSubmissionResult,
  LyricSubmissionService,
} from "../services/lyric/LyricSubmissionService";
import { DataSubmissionParams } from "../services/lyric/LyricSubmissionService";

/**
 * Command for loading data into Lyric
 * Updated to use error factory pattern for consistent error handling
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
        throw ErrorFactory.connection(
          "Lyric service is not healthy",
          {
            healthResult,
            serviceUrl: serviceConfig.url,
          },
          [
            "Check that Lyric service is running",
            `Verify the service URL: ${serviceConfig.url}`,
            "Check network connectivity",
            "Review service logs for errors",
          ]
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
      throw ErrorFactory.args("Configuration is missing", [
        "Check CLI setup and argument parsing",
        "Verify command line options are correct",
      ]);
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
        throw ErrorFactory.args(`${param.name} is required`, [
          param.suggestion,
          "Example: --data-directory ./csv-files",
        ]);
      }
    }

    // Validate data directory exists
    const dataDirectory = this.getDataDirectory(cliOutput)!;
    if (!require("fs").existsSync(dataDirectory)) {
      throw ErrorFactory.file("Data directory not found", dataDirectory, [
        "Check that the directory exists",
        "Verify the path is correct",
        "Ensure you have access to the directory",
      ]);
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
    Logger.info`${chalk.bold.cyan("Starting Data Loading Process:")}`;
    Logger.infoString(`Lyric URL: ${serviceUrl}`);
    Logger.infoString(`Data Directory: ${params.dataDirectory}`);
    Logger.infoString(`Category ID: ${params.categoryId}`);
    Logger.infoString(`Organization: ${params.organization}`);
    Logger.infoString(`Max Retries: ${params.maxRetries}`);
  }

  /**
   * Log successful submission
   */
  private logSuccess(result: DataSubmissionResult): void {
    Logger.successString("Data loading completed successfully");
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
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;
      return {
        success: false,
        errorMessage: conductorError.message,
        errorCode: conductorError.code,
        details: conductorError.details,
      };
    }

    // Handle unexpected errors with categorization
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Connection errors
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      const connectionError = ErrorFactory.connection(
        "Failed to connect to Lyric service",
        { originalError: error },
        [
          "Check that Lyric service is running",
          "Verify the service URL and port",
          "Check network connectivity",
          "Review firewall settings",
        ]
      );

      return {
        success: false,
        errorMessage: connectionError.message,
        errorCode: connectionError.code,
        details: connectionError.details,
      };
    }

    // File/directory errors
    if (errorMessage.includes("ENOENT") || errorMessage.includes("directory")) {
      const fileError = ErrorFactory.file(
        "Data directory or file issue",
        undefined,
        [
          "Check that the data directory exists",
          "Verify CSV files are present in the directory",
          "Ensure you have read access to the files",
        ]
      );

      return {
        success: false,
        errorMessage: fileError.message,
        errorCode: fileError.code,
        details: fileError.details,
      };
    }

    // Validation errors
    if (
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid")
    ) {
      const validationError = ErrorFactory.validation(
        "Data submission validation failed",
        { originalError: error },
        [
          "Check your CSV file format and structure",
          "Verify data meets Lyric service requirements",
          "Review validation error details in debug mode",
        ]
      );

      return {
        success: false,
        errorMessage: validationError.message,
        errorCode: validationError.code,
        details: validationError.details,
      };
    }

    // Authentication errors
    if (errorMessage.includes("401") || errorMessage.includes("403")) {
      const authError = ErrorFactory.auth(
        "Authentication failed with Lyric service",
        { originalError: error },
        [
          "Check your authentication credentials",
          "Verify you have permission to submit data",
          "Contact administrator for access",
        ]
      );

      return {
        success: false,
        errorMessage: authError.message,
        errorCode: authError.code,
        details: authError.details,
      };
    }

    // Generic fallback
    const genericError = ErrorFactory.connection(
      "Data loading failed",
      { originalError: error },
      [
        "Check the service logs for more details",
        "Verify your data format and structure",
        "Try the upload again after a few moments",
      ]
    );

    return {
      success: false,
      errorMessage: genericError.message,
      errorCode: genericError.code,
      details: genericError.details,
    };
  }
}
