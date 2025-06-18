// src/commands/lyricUploadCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { LyricSubmissionService } from "../services/lyric/LyricSubmissionService";
import { DataSubmissionParams } from "../services/lyric/LyricSubmissionService";
import * as fs from "fs";

/**
 * Command for loading data into Lyric
 * Updated to use error factory pattern for consistent error handling
 */
export class LyricUploadCommand extends Command {
  constructor() {
    super("Lyric Data Loading");
  }

  /**
   * Override to indicate this command doesn't require input files from -f/--file
   * It uses data directories instead.
   */
  protected requiresInputFiles(): boolean {
    return false;
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

      // EXPLICIT ERROR HANDLING: Check service health with direct error logging
      try {
        Logger.debug`Checking Lyric service health at ${serviceConfig.url}`;
        const healthResult = await lyricSubmissionService.checkHealth();

        if (!healthResult.healthy) {
          Logger.errorString("Lyric service is not healthy");
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

        Logger.debug`Lyric service health check passed`;
      } catch (healthError) {
        // Direct error logging here to ensure it's visible
        const errorMessage =
          healthError instanceof Error
            ? healthError.message
            : String(healthError);

        Logger.errorString(
          `Lyric service health check failed: ${errorMessage}`
        );

        // Provide more specific suggestions based on error
        if (
          errorMessage.includes("ECONNREFUSED") ||
          errorMessage.includes("ENOTFOUND")
        ) {
          throw ErrorFactory.connection(
            "Failed to connect to Lyric service",
            { originalError: healthError, serviceUrl: serviceConfig.url },
            [
              "Check that Lyric service is running",
              `Verify the service URL: ${serviceConfig.url}`,
              "Check network connectivity",
              "Review firewall settings",
            ]
          );
        }

        throw ErrorFactory.connection(
          "Lyric service health check failed",
          { originalError: healthError, serviceUrl: serviceConfig.url },
          [
            "Check Lyric service status and configuration",
            `Verify the service URL: ${serviceConfig.url}`,
            "Check network connectivity",
            "Use --debug for detailed error information",
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
      // IMPORTANT: Direct explicit error logging here
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Ensure the error is visibly logged
      if (!(error instanceof Error && error.name === "ConductorError")) {
        Logger.errorString(`Lyric data upload failed: ${errorMessage}`);
      }

      return this.handleExecutionError(error);
    }
  }

  /**
   * Validates command line arguments
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    // First call the parent validate method with our override
    // This skips the file validation since we return false in requiresInputFiles()
    await super.validate(cliOutput);

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
    if (!fs.existsSync(dataDirectory)) {
      throw ErrorFactory.file("Data directory not found", dataDirectory, [
        "Check that the directory exists",
        "Verify the path is correct",
        "Ensure you have access to the directory",
      ]);
    }

    // Validate data directory contains CSV files
    try {
      const files = fs
        .readdirSync(dataDirectory)
        .filter((file) => file.toLowerCase().endsWith(".csv"));

      if (files.length === 0) {
        throw ErrorFactory.validation(
          "No CSV files found in data directory",
          { dataDirectory },
          [
            "Ensure the directory contains CSV files",
            "Check that files have .csv extension",
            "Verify files are not empty",
          ]
        );
      }

      Logger.debug`Found ${files.length} CSV files in ${dataDirectory}`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.file("Failed to read data directory", dataDirectory, [
        "Check directory permissions",
        "Verify you have access to read the directory",
        "Ensure the directory path is correct",
      ]);
    }
  }

  /**
   * Extract submission parameters from CLI output
   */
  private extractSubmissionParams(cliOutput: CLIOutput): DataSubmissionParams {
    return {
      categoryId:
        cliOutput.config.lyric?.categoryId ||
        cliOutput.options.categoryId ||
        process.env.CATEGORY_ID ||
        "1",
      organization:
        cliOutput.config.lyric?.organization ||
        cliOutput.options.organization ||
        process.env.ORGANIZATION ||
        "OICR",
      dataDirectory: this.getDataDirectory(cliOutput)!,
      maxRetries: parseInt(
        String(
          cliOutput.options.maxRetries ||
            cliOutput.config.lyric?.maxRetries ||
            process.env.MAX_RETRIES ||
            "10"
        )
      ),
      retryDelay: parseInt(
        String(
          cliOutput.options.retryDelay ||
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
      retries: 1,
    };
  }

  /**
   * Get Lyric URL from various sources
   */
  private getLyricUrl(cliOutput: CLIOutput): string | undefined {
    return (
      cliOutput.options.lyricUrl ||
      cliOutput.config.lyric?.url ||
      process.env.LYRIC_URL
    );
  }

  /**
   * Get data directory from various sources
   */
  private getDataDirectory(cliOutput: CLIOutput): string | undefined {
    return (
      cliOutput.options.dataDirectory ||
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
    Logger.debug`Uploading ${params.dataDirectory}`;
    Logger.debug`Lyric URL: ${serviceUrl}`;
    Logger.debug`Data Directory: ${params.dataDirectory}`;
    Logger.debug`Category ID: ${params.categoryId}`;
    Logger.debug`Organization: ${params.organization}`;
    Logger.debug`Max Retries: ${params.maxRetries}`;
    Logger.debug`Retry Delay: ${params.retryDelay}ms`;
  }

  /**
   * Log successful submission
   */
  private logSuccess(result: any): void {
    Logger.successString("Data upload complete");
    Logger.generic("");
    Logger.generic(chalk.gray(`    - Submission ID: ${result.submissionId}`));
    Logger.generic(chalk.gray(`    - Status: ${result.status}`));
    Logger.generic(
      chalk.gray(`    - Files Submitted: ${result.filesSubmitted.join(", ")}`)
    );
    Logger.generic("");
  }

  /**
   * Handle execution errors with helpful user feedback
   * IMPORTANT: Ensure errors are explicitly displayed
   */
  private handleExecutionError(error: unknown): CommandResult {
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;

      // Skip logging if the error was already logged
      if (!conductorError.alreadyLogged) {
        // This is crucial: Always log the error message
        Logger.errorString(conductorError.message);

        // Display suggestions
        if (
          conductorError.suggestions &&
          conductorError.suggestions.length > 0
        ) {
          Logger.suggestion("Suggestions");
          conductorError.suggestions.forEach((suggestion: string) => {
            Logger.tipString(suggestion);
          });
        }
      }

      return {
        success: false,
        errorMessage: conductorError.message,
        errorCode: conductorError.code,
        details: {
          ...conductorError.details,
          alreadyLogged: true, // Mark as logged for the base command
        },
      };
    }

    // Handle unexpected errors with categorization
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Connection errors
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ENOTFOUND")
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

      // Log these suggestions explicitly
      connectionError.suggestions?.forEach((suggestion) => {
        Logger.tipString(suggestion);
      });

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

      // Log these suggestions explicitly
      fileError.suggestions?.forEach((suggestion) => {
        Logger.tipString(suggestion);
      });

      return {
        success: false,
        errorMessage: fileError.message,
        errorCode: fileError.code,
        details: fileError.details,
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

      // Log these suggestions explicitly
      authError.suggestions?.forEach((suggestion) => {
        Logger.tipString(suggestion);
      });

      return {
        success: false,
        errorMessage: authError.message,
        errorCode: authError.code,
        details: authError.details,
      };
    }

    // Generic fallback
    const genericError = ErrorFactory.connection(
      `Data loading failed: ${errorMessage}`,
      { originalError: error },
      [
        "Check the service logs for more details",
        "Verify your data format and structure",
        "Try the upload again after a few moments",
        "Use --debug for detailed error information",
      ]
    );

    // Log these suggestions explicitly
    genericError.suggestions?.forEach((suggestion) => {
      Logger.tipString(suggestion);
    });

    return {
      success: false,
      errorMessage: genericError.message,
      errorCode: genericError.code,
      details: genericError.details,
    };
  }
}
