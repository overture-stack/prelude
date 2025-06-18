// src/commands/lyricUploadCommand.ts - Updated with single file support
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { LyricSubmissionService } from "../services/lyric/LyricSubmissionService";
import { DataSubmissionParams } from "../services/lyric/LyricSubmissionService";
import * as fs from "fs";
import * as path from "path";

/**
 * Command for loading data into Lyric
 * Enhanced to support both single files and directories
 */
export class LyricUploadCommand extends Command {
  constructor() {
    super("Lyric Data Loading");
  }

  /**
   * Override to indicate this command doesn't require input files from -f/--file
   * It uses data directories or files instead.
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

      // Check service health with direct error handling
      try {
        Logger.debug`Checking Lyric service health at ${serviceConfig.url}`;
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

        Logger.debug`Lyric service health check passed`;
      } catch (healthError) {
        // Enhanced error handling for health check failures
        const errorMessage =
          healthError instanceof Error
            ? healthError.message
            : String(healthError);

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
      // Let baseCommand handle all error logging
      return this.handleExecutionError(error);
    }
  }

  /**
   * ENHANCED: Validates command line arguments - now supports both files and directories
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
        value: this.getDataInput(cliOutput),
        name: "Data input (file or directory)",
        suggestion:
          "Use --data-directory (-d) option to specify a CSV file or directory containing CSV files",
      },
    ];

    for (const param of requiredParams) {
      if (!param.value) {
        throw ErrorFactory.args(`${param.name} is required`, [
          param.suggestion,
          "Example: -d ./data/diagnosis.csv or -d ./data/csv-files/",
        ]);
      }
    }

    // ENHANCED: Validate data input (file or directory) exists
    const dataInput = this.getDataInput(cliOutput)!;
    if (!fs.existsSync(dataInput)) {
      throw ErrorFactory.file("Data input not found", dataInput, [
        "Check that the file or directory exists",
        "Verify the path is correct",
        "Ensure you have access to the path",
      ]);
    }

    const stats = fs.statSync(dataInput);

    if (stats.isFile()) {
      // Single file validation
      await this.validateSingleFile(dataInput);
    } else if (stats.isDirectory()) {
      // Directory validation
      await this.validateDirectory(dataInput);
    } else {
      throw ErrorFactory.file("Input is not a file or directory", dataInput, [
        "Provide a valid CSV file path or directory containing CSV files",
        "Check that the path points to an existing file or directory",
      ]);
    }
  }

  /**
   * NEW: Validate a single CSV file
   */
  private async validateSingleFile(filePath: string): Promise<void> {
    // Check file extension
    if (!filePath.toLowerCase().endsWith(".csv")) {
      throw ErrorFactory.invalidFile(
        "File must have .csv extension",
        filePath,
        [
          "Ensure the file has a .csv extension",
          "Only CSV files are supported for Lyric uploads",
          "Example: diagnosis.csv, donor.csv, etc.",
        ]
      );
    }

    // Check file has content
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw ErrorFactory.invalidFile("File is empty", filePath, [
        "Ensure the file contains data",
        "Check if the file was created properly",
        "Verify the file wasn't truncated during transfer",
      ]);
    }

    // Check read permissions
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file("Cannot read file", filePath, [
        "Check file permissions",
        "Ensure you have read access to the file",
        "Try running with appropriate privileges",
      ]);
    }

    Logger.debug`Single file validation passed: ${path.basename(filePath)} (${
      Math.round((stats.size / 1024) * 10) / 10
    } KB)`;
  }

  /**
   * EXISTING: Validate directory contains CSV files
   */
  private async validateDirectory(directoryPath: string): Promise<void> {
    try {
      const files = fs
        .readdirSync(directoryPath)
        .filter((file) => file.toLowerCase().endsWith(".csv"));

      if (files.length === 0) {
        throw ErrorFactory.validation(
          "No CSV files found in directory",
          { directoryPath },
          [
            "Ensure the directory contains CSV files",
            "Check that files have .csv extension",
            "Verify files are not empty",
          ]
        );
      }

      Logger.debug`Found ${files.length} CSV files in ${directoryPath}`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.file("Failed to read directory", directoryPath, [
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
      dataDirectory: this.getDataInput(cliOutput)!, // Now supports both files and directories
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
   * ENHANCED: Get data input (file or directory) from various sources
   */
  private getDataInput(cliOutput: CLIOutput): string | undefined {
    return (
      cliOutput.options.dataDirectory ||
      cliOutput.config.lyric?.dataDirectory ||
      process.env.LYRIC_DATA
    );
  }

  /**
   * ENHANCED: Log submission information with better file/directory detection
   */
  private logSubmissionInfo(
    params: DataSubmissionParams,
    serviceUrl: string
  ): void {
    const inputType = fs.statSync(params.dataDirectory).isFile()
      ? "file"
      : "directory";

    Logger.debug`Uploading from ${inputType}: ${params.dataDirectory}`;
    Logger.debug`Lyric URL: ${serviceUrl}`;
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
    Logger.generic(chalk.gray(`    - Submission ID: ${result.submissionId}`));
    Logger.generic(chalk.gray(`    - Status: ${result.status}`));
    Logger.generic(
      chalk.gray(`    - Files Submitted: ${result.filesSubmitted.join(", ")}`)
    );
  }

  /**
   * Handle execution errors - DON'T LOG HERE, let baseCommand handle it
   */
  private handleExecutionError(error: unknown): CommandResult {
    // Don't log here - let baseCommand handle all logging
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
        "Data input or file issue",
        undefined,
        [
          "Check that the data file or directory exists",
          "Verify CSV files are present and accessible",
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
      `Data loading failed: ${errorMessage}`,
      { originalError: error },
      [
        "Check the service logs for more details",
        "Verify your data format and structure",
        "Try the upload again after a few moments",
        "Use --debug for detailed error information",
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
