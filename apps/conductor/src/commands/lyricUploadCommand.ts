// src/commands/lyricUploadCommand.ts - Enhanced with ErrorFactory patterns
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
import * as fs from "fs";
import * as path from "path";

/**
 * Command for loading data into Lyric
 * Enhanced with ErrorFactory patterns and comprehensive validation
 */
export class LyricUploadCommand extends Command {
  constructor() {
    super("Lyric Data Loading");
  }

  /**
   * Validates command line arguments with enhanced error messages
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    // Ensure config exists
    if (!cliOutput.config) {
      throw ErrorFactory.config("Configuration is missing", "config", [
        "Internal configuration error",
        "Restart the application",
        "Check command line arguments",
        "Use --debug for detailed information",
      ]);
    }

    Logger.debug`Validating Lyric data upload parameters`;

    // Enhanced validation for required parameters
    this.validateLyricUrl(cliOutput);
    this.validateDataDirectory(cliOutput);
    this.validateCategoryId(cliOutput);
    this.validateOrganization(cliOutput);
    this.validateRetrySettings(cliOutput);

    // Validate data directory contents
    await this.validateDataDirectoryContents(cliOutput);

    Logger.successString("Lyric data upload parameters validated");
  }

  /**
   * Executes the Lyric data loading process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    try {
      // Extract and validate configuration
      const submissionParams = this.extractSubmissionParams(cliOutput);
      const serviceConfig = this.extractServiceConfig(cliOutput);

      Logger.info`Starting Lyric data loading process`;
      Logger.info`Data Directory: ${submissionParams.dataDirectory}`;
      Logger.info`Category ID: ${submissionParams.categoryId}`;
      Logger.info`Organization: ${submissionParams.organization}`;

      // Create service with enhanced error handling
      const lyricSubmissionService = new LyricSubmissionService(serviceConfig);

      // Enhanced health check with specific feedback
      Logger.info`Checking Lyric service health...`;
      const healthResult = await lyricSubmissionService.checkHealth();
      if (!healthResult.healthy) {
        throw ErrorFactory.connection(
          "Lyric service health check failed",
          "Lyric",
          serviceConfig.url,
          [
            "Check that Lyric service is running",
            `Verify service URL: ${serviceConfig.url}`,
            "Check network connectivity and firewall settings",
            "Review Lyric service logs for errors",
            `Test manually: curl ${serviceConfig.url}/health`,
            healthResult.message
              ? `Health check message: ${healthResult.message}`
              : "",
          ].filter(Boolean)
        );
      }

      // Log submission info with enhanced context
      this.logSubmissionInfo(submissionParams, serviceConfig.url);

      // Execute the complete workflow with enhanced progress tracking
      Logger.info`Starting data submission workflow...`;
      const result = await lyricSubmissionService.submitDataWorkflow(
        submissionParams
      );

      // Enhanced success logging
      this.logSuccess(result);

      return {
        success: true,
        details: {
          submissionParams,
          serviceUrl: serviceConfig.url,
          submissionResult: result,
        },
      };
    } catch (error) {
      return this.handleExecutionError(error, cliOutput);
    }
  }

  /**
   * Enhanced Lyric URL validation
   */
  private validateLyricUrl(cliOutput: CLIOutput): void {
    const lyricUrl = this.getLyricUrl(cliOutput);

    if (!lyricUrl) {
      throw ErrorFactory.config(
        "Lyric service URL not configured",
        "lyricUrl",
        [
          "Set Lyric URL: conductor lyricUpload --lyric-url http://localhost:3030",
          "Set LYRIC_URL environment variable",
          "Verify Lyric service is running and accessible",
          "Check network connectivity to Lyric service",
        ]
      );
    }

    // Basic URL format validation
    try {
      new URL(lyricUrl);
      Logger.debug`Using Lyric URL: ${lyricUrl}`;
    } catch (error) {
      throw ErrorFactory.config(
        `Invalid Lyric URL format: ${lyricUrl}`,
        "lyricUrl",
        [
          "Use a valid URL format: http://localhost:3030",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 3030 for Lyric)",
        ]
      );
    }
  }

  /**
   * Enhanced data directory validation
   */
  private validateDataDirectory(cliOutput: CLIOutput): void {
    const dataDirectory = this.getDataDirectory(cliOutput);

    if (!dataDirectory) {
      throw ErrorFactory.args("Data directory not specified", "lyricUpload", [
        "Provide data directory: conductor lyricUpload --data-directory ./data",
        "Set LYRIC_DATA environment variable",
        "Ensure directory contains CSV files to upload",
        "Use absolute or relative path to data directory",
      ]);
    }

    if (!fs.existsSync(dataDirectory)) {
      throw ErrorFactory.file(
        `Data directory not found: ${dataDirectory}`,
        dataDirectory,
        [
          "Check that the directory path is correct",
          "Ensure the directory exists",
          "Verify permissions allow access",
          `Current directory: ${process.cwd()}`,
          "Use absolute path if relative path is not working",
        ]
      );
    }

    const stats = fs.statSync(dataDirectory);
    if (!stats.isDirectory()) {
      throw ErrorFactory.file(
        `Path is not a directory: ${dataDirectory}`,
        dataDirectory,
        [
          "Provide a directory path, not a file path",
          "Check the path points to a directory",
          "Ensure the path is correct",
        ]
      );
    }

    Logger.debug`Data directory validated: ${dataDirectory}`;
  }

  /**
   * Enhanced category ID validation
   */
  private validateCategoryId(cliOutput: CLIOutput): void {
    const categoryId =
      cliOutput.config.lyric?.categoryId ||
      cliOutput.options?.categoryId ||
      process.env.CATEGORY_ID;

    if (!categoryId) {
      throw ErrorFactory.args("Category ID not specified", "lyricUpload", [
        "Provide category ID: conductor lyricUpload --category-id 1",
        "Set CATEGORY_ID environment variable",
        "Category ID should match your registered dictionary",
        "Contact administrator for valid category IDs",
      ]);
    }

    // Validate category ID format
    const categoryIdNum = parseInt(categoryId);
    if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
      throw ErrorFactory.validation(
        `Invalid category ID format: ${categoryId}`,
        { categoryId },
        [
          "Category ID must be a positive integer",
          "Examples: 1, 2, 3, etc.",
          "Check with Lyric administrator for valid IDs",
          "Ensure the category exists in Lyric",
        ]
      );
    }

    Logger.debug`Category ID validated: ${categoryId}`;
  }

  /**
   * Enhanced organization validation
   */
  private validateOrganization(cliOutput: CLIOutput): void {
    const organization =
      cliOutput.config.lyric?.organization ||
      cliOutput.options?.organization ||
      process.env.ORGANIZATION;

    if (!organization) {
      throw ErrorFactory.args("Organization not specified", "lyricUpload", [
        "Provide organization: conductor lyricUpload --organization OICR",
        "Set ORGANIZATION environment variable",
        "Use your institution or organization name",
        "Organization should match your Lyric configuration",
      ]);
    }

    if (typeof organization !== "string" || organization.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid organization format",
        { organization },
        [
          "Organization must be a non-empty string",
          "Use your institution's identifier",
          "Examples: 'OICR', 'NIH', 'University-Toronto'",
          "Check with Lyric administrator for valid organizations",
        ]
      );
    }

    Logger.debug`Organization validated: ${organization}`;
  }

  /**
   * Enhanced retry settings validation
   */
  private validateRetrySettings(cliOutput: CLIOutput): void {
    const maxRetries =
      cliOutput.config.lyric?.maxRetries ||
      (cliOutput.options?.maxRetries
        ? parseInt(cliOutput.options.maxRetries)
        : undefined) ||
      10;

    const retryDelay =
      cliOutput.config.lyric?.retryDelay ||
      (cliOutput.options?.retryDelay
        ? parseInt(cliOutput.options.retryDelay)
        : undefined) ||
      20000;

    if (maxRetries < 1 || maxRetries > 50) {
      throw ErrorFactory.validation(
        `Invalid max retries value: ${maxRetries}`,
        { maxRetries },
        [
          "Max retries must be between 1 and 50",
          "Recommended: 5-15 for most use cases",
          "Higher values for unstable connections",
          "Example: conductor lyricUpload --max-retries 10",
        ]
      );
    }

    if (retryDelay < 1000 || retryDelay > 300000) {
      throw ErrorFactory.validation(
        `Invalid retry delay value: ${retryDelay}ms`,
        { retryDelay },
        [
          "Retry delay must be between 1000ms (1s) and 300000ms (5min)",
          "Recommended: 10000-30000ms for most use cases",
          "Longer delays for heavily loaded services",
          "Example: conductor lyricUpload --retry-delay 20000",
        ]
      );
    }

    Logger.debug`Retry settings validated: ${maxRetries} retries, ${retryDelay}ms delay`;
  }

  /**
   * Enhanced data directory contents validation
   */
  private async validateDataDirectoryContents(
    cliOutput: CLIOutput
  ): Promise<void> {
    const dataDirectory = this.getDataDirectory(cliOutput)!;

    try {
      const files = fs.readdirSync(dataDirectory);
      const csvFiles = files.filter((file) =>
        file.toLowerCase().endsWith(".csv")
      );

      if (csvFiles.length === 0) {
        throw ErrorFactory.file(
          `No CSV files found in data directory: ${path.basename(
            dataDirectory
          )}`,
          dataDirectory,
          [
            "Ensure the directory contains CSV files",
            "Check file extensions are .csv",
            "Verify files are not in subdirectories",
            `Directory contains: ${files.slice(0, 5).join(", ")}${
              files.length > 5 ? "..." : ""
            }`,
            "Only CSV files are supported for Lyric upload",
          ]
        );
      }

      // Validate each CSV file
      const invalidFiles = [];
      for (const csvFile of csvFiles) {
        const filePath = path.join(dataDirectory, csvFile);
        try {
          const stats = fs.statSync(filePath);
          if (stats.size === 0) {
            invalidFiles.push(`${csvFile} (empty file)`);
          } else if (stats.size > 100 * 1024 * 1024) {
            // 100MB
            Logger.warn`Large CSV file detected: ${csvFile} (${(
              stats.size /
              1024 /
              1024
            ).toFixed(1)}MB)`;
            Logger.tipString("Large files may take longer to process");
          }
        } catch (error) {
          invalidFiles.push(`${csvFile} (cannot read)`);
        }
      }

      if (invalidFiles.length > 0) {
        throw ErrorFactory.file(
          `Invalid CSV files found in data directory`,
          dataDirectory,
          [
            `Fix these files: ${invalidFiles.join(", ")}`,
            "Ensure all CSV files contain data",
            "Check file permissions",
            "Remove or fix empty or corrupted files",
          ]
        );
      }

      Logger.success`Found ${csvFiles.length} valid CSV file(s) for upload`;
      csvFiles.forEach((file) => Logger.debug`  - ${file}`);
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.file(
        `Error reading data directory: ${
          error instanceof Error ? error.message : String(error)
        }`,
        dataDirectory,
        [
          "Check directory permissions",
          "Ensure directory is accessible",
          "Verify directory is not corrupted",
        ]
      );
    }
  }

  /**
   * Extract submission parameters with validation
   */
  private extractSubmissionParams(cliOutput: CLIOutput): DataSubmissionParams {
    return {
      categoryId:
        cliOutput.config.lyric?.categoryId ||
        cliOutput.options?.categoryId ||
        process.env.CATEGORY_ID ||
        "1",
      organization:
        cliOutput.config.lyric?.organization ||
        cliOutput.options?.organization ||
        process.env.ORGANIZATION ||
        "OICR",
      dataDirectory: this.getDataDirectory(cliOutput)!,
      maxRetries: parseInt(
        String(
          cliOutput.config.lyric?.maxRetries ||
            cliOutput.options?.maxRetries ||
            process.env.MAX_RETRIES ||
            "10"
        )
      ),
      retryDelay: parseInt(
        String(
          cliOutput.config.lyric?.retryDelay ||
            cliOutput.options?.retryDelay ||
            process.env.RETRY_DELAY ||
            "20000"
        )
      ),
    };
  }

  /**
   * Extract service configuration with enhanced defaults
   */
  private extractServiceConfig(cliOutput: CLIOutput) {
    return {
      url: this.getLyricUrl(cliOutput)!,
      timeout: 60000, // Longer timeout for file uploads (1 minute)
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
   * Enhanced submission information logging
   */
  private logSubmissionInfo(
    params: DataSubmissionParams,
    serviceUrl: string
  ): void {
    Logger.info`${chalk.bold.cyan("Lyric Data Loading Details:")}`;
    Logger.generic(`  Service: ${serviceUrl}`);
    Logger.generic(`  Data Directory: ${params.dataDirectory}`);
    Logger.generic(`  Category ID: ${params.categoryId}`);
    Logger.generic(`  Organization: ${params.organization}`);
    Logger.generic(`  Max Retries: ${params.maxRetries}`);
    Logger.generic(`  Retry Delay: ${params.retryDelay}ms`);
  }

  /**
   * Enhanced success logging with detailed information
   */
  private logSuccess(result: DataSubmissionResult): void {
    Logger.success`Data loading completed successfully`;
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    ✓ Submission ID: ${result.submissionId}`));
    Logger.generic(chalk.gray(`    ✓ Status: ${result.status}`));
    Logger.generic(
      chalk.gray(`    ✓ Files Submitted: ${result.filesSubmitted.length}`)
    );

    if (result.filesSubmitted.length > 0) {
      Logger.generic(
        chalk.gray(`    ✓ Files: ${result.filesSubmitted.join(", ")}`)
      );
    }

    if (result.message) {
      Logger.generic(chalk.gray(`    ✓ Message: ${result.message}`));
    }

    Logger.generic(" ");
    Logger.tipString(
      "Data is now available in Lyric for analysis and querying"
    );
  }

  /**
   * Enhanced execution error handling with context-specific guidance
   */
  private handleExecutionError(
    error: unknown,
    cliOutput: CLIOutput
  ): CommandResult {
    const dataDirectory = this.getDataDirectory(cliOutput) || "unknown";
    const serviceUrl = this.getLyricUrl(cliOutput);

    if (error instanceof Error && error.name === "ConductorError") {
      // Add data loading context to existing errors
      return {
        success: false,
        errorMessage: error.message,
        errorCode: (error as any).code,
        details: {
          ...(error as any).details,
          dataDirectory,
          command: "lyricUpload",
          serviceUrl,
        },
      };
    }

    // Handle service-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    let suggestions = [
      "Check Lyric service connectivity and availability",
      "Verify data directory contains valid CSV files",
      "Ensure category ID and organization are correct",
      "Review Lyric service logs for additional details",
      "Use --debug flag for detailed error information",
    ];

    // Add specific suggestions based on error content
    if (
      errorMessage.includes("validation") ||
      errorMessage.includes("INVALID")
    ) {
      suggestions.unshift(
        "Data validation failed - check CSV file format and content"
      );
      suggestions.unshift(
        "Verify data matches the registered dictionary schema"
      );
      suggestions.unshift("Check for required fields and data types");
    } else if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      suggestions.unshift("Upload timed out - files may be too large");
      suggestions.unshift("Try uploading smaller batches of files");
      suggestions.unshift("Check network stability and connection speed");
    } else if (
      errorMessage.includes("category") ||
      errorMessage.includes("404")
    ) {
      suggestions.unshift("Category ID may not exist in Lyric");
      suggestions.unshift("Verify category was properly registered");
      suggestions.unshift(
        "Check with Lyric administrator for valid category IDs"
      );
    }

    return {
      success: false,
      errorMessage: `Lyric data loading failed: ${errorMessage}`,
      errorCode: "CONNECTION_ERROR",
      details: {
        originalError: error,
        dataDirectory,
        suggestions,
        command: "lyricUpload",
        serviceUrl,
      },
    };
  }
}
