// src/commands/lecternUploadCommand.ts - Complete fix with direct connection testing
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { LecternService } from "../services/lectern";
import { LecternSchemaUploadParams } from "../services/lectern/types";
import { ServiceConfigManager } from "../config/serviceConfigManager";
import * as fs from "fs";

/**
 * Command for uploading schemas to the Lectern service
 */
export class LecternUploadCommand extends Command {
  constructor() {
    super("Lectern Schema Upload");
  }

  /**
   * Override validation since we don't use filePaths for this command
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Get schema file from various sources
    const schemaFile = this.getSchemaFile(options);

    if (!schemaFile) {
      throw ErrorFactory.args("Schema file not specified", [
        "Use --schema-file option to specify the schema file",
        "Set LECTERN_SCHEMA environment variable",
        "Example: --schema-file ./my-schema.json",
      ]);
    }

    // Validate file exists and is readable
    if (!fs.existsSync(schemaFile)) {
      throw ErrorFactory.file("Schema file not found", schemaFile, [
        "Check the file path spelling",
        "Ensure the file exists and is accessible",
        "Verify file permissions",
      ]);
    }

    // Validate it's a JSON file
    if (!schemaFile.toLowerCase().endsWith(".json")) {
      throw ErrorFactory.invalidFile(
        "Schema file must be a JSON file",
        schemaFile,
        [
          "Ensure the file has a .json extension",
          "Verify the file contains valid JSON content",
        ]
      );
    }

    // Try to parse the JSON to validate format
    try {
      const content = fs.readFileSync(schemaFile, "utf-8");
      JSON.parse(content);
    } catch (error) {
      throw ErrorFactory.parsing(
        "Invalid JSON in schema file",
        { filePath: schemaFile, originalError: error },
        [
          "Validate JSON syntax using a JSON validator",
          "Check for trailing commas or syntax errors",
          "Ensure the file is properly formatted JSON",
        ]
      );
    }
  }

  /**
   * Executes the Lectern schema upload process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration
      const schemaFile = this.getSchemaFile(options)!;

      // Use the ServiceConfigManager
      const serviceConfig = ServiceConfigManager.createLecternConfig({
        url: options.lecternUrl,
        authToken: options.authToken,
      });

      // Validate the configuration
      ServiceConfigManager.validateConfig(serviceConfig);

      const uploadParams = this.extractUploadParams(schemaFile);

      // Create service instance
      const lecternService = new LecternService(serviceConfig);

      // DIRECT CONNECTION TEST - bypass the generic checkHealth() method
      // This way we can catch and handle the specific connection error
      try {
        Logger.debug`Testing connection to Lectern service`;

        // Try to make a direct HTTP request to test connectivity
        const testResponse = await lecternService["http"].get("/health", {
          timeout: 5000,
          retries: 1,
        });

        Logger.debug`Lectern service is healthy`;
      } catch (healthError) {
        // Handle the specific connection error with detailed suggestions
        const errorMessage =
          healthError instanceof Error
            ? healthError.message
            : String(healthError);

        Logger.debug`Lectern health check failed`;

        if (
          errorMessage.includes("ECONNREFUSED") ||
          errorMessage.includes("connect ECONNREFUSED")
        ) {
          throw ErrorFactory.connection(
            "Cannot connect to Lectern service",
            {
              serviceUrl: serviceConfig.url,
              endpoint: serviceConfig.url + "/health",
              originalError: healthError,
            },
            [
              `Check that Lectern service is running on ${serviceConfig.url}`,
              "Verify the service URL and port number are correct",
              "Ensure the service is accessible from your network",
              "Test manually with: curl " + serviceConfig.url + "/health",
              "Check firewall settings and network connectivity",
            ]
          );
        }

        if (
          errorMessage.includes("ENOTFOUND") ||
          errorMessage.includes("getaddrinfo ENOTFOUND")
        ) {
          throw ErrorFactory.connection(
            "Lectern service host not found",
            {
              serviceUrl: serviceConfig.url,
              originalError: healthError,
            },
            [
              "Check the hostname in the service URL",
              "Verify DNS resolution for the hostname",
              "Ensure the service URL is spelled correctly",
              "Try using an IP address instead of hostname",
              "Check your network connection",
            ]
          );
        }

        if (errorMessage.includes("ETIMEDOUT")) {
          throw ErrorFactory.connection(
            "Timeout connecting to Lectern service",
            {
              serviceUrl: serviceConfig.url,
              timeout: 5000,
              originalError: healthError,
            },
            [
              "Check network connectivity to the service",
              "Verify the service is responding (may be overloaded)",
              "Consider increasing timeout value",
              "Check for network proxy or firewall blocking",
              "Verify the service port is accessible",
            ]
          );
        }

        if (errorMessage.includes("401") || errorMessage.includes("403")) {
          throw ErrorFactory.auth(
            "Authentication failed with Lectern service",
            {
              serviceUrl: serviceConfig.url,
              originalError: healthError,
            },
            [
              "Check your authentication token",
              "Verify you have permission to access the service",
              "Contact your administrator for proper credentials",
              "Ensure the auth token is not expired",
            ]
          );
        }

        // Generic health check failure with helpful suggestions
        throw ErrorFactory.connection(
          "Failed to connect to Lectern service",
          {
            serviceUrl: serviceConfig.url,
            originalError: healthError,
          },
          [
            `Verify Lectern service is running and accessible at ${serviceConfig.url}`,
            "Check the service URL spelling and port number",
            "Test connectivity manually: curl " + serviceConfig.url + "/health",
            "Review service logs for error details",
            "Check network connectivity and firewall settings",
          ]
        );
      }

      // Log upload info
      this.logUploadInfo(schemaFile, serviceConfig.url);

      // Upload schema
      const result = await lecternService.uploadSchema(uploadParams);

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
   * Get schema file from various sources
   */
  private getSchemaFile(options: any): string | undefined {
    return options.schemaFile || process.env.LECTERN_SCHEMA;
  }

  /**
   * Extract upload parameters from schema file
   */
  private extractUploadParams(schemaFile: string): LecternSchemaUploadParams {
    try {
      Logger.debug`Reading schema file: ${schemaFile}`;
      const schemaContent = fs.readFileSync(schemaFile, "utf-8");

      return {
        schemaContent,
      };
    } catch (error) {
      throw ErrorFactory.file("Error reading schema file", schemaFile, [
        "Check file permissions",
        "Verify the file is not corrupted",
        "Ensure sufficient disk space",
      ]);
    }
  }

  /**
   * Log upload information
   */
  private logUploadInfo(schemaFile: string, serviceUrl: string): void {
    Logger.debug`${chalk.bold.cyan("Uploading Schema to Lectern:")}`;
    Logger.debug`URL: ${serviceUrl}/dictionaries`;
    Logger.debug`Schema File: ${schemaFile}`;
  }

  /**
   * Log successful upload
   */
  private logSuccess(result: any): void {
    Logger.successString("Schema uploaded successfully");
    Logger.generic(chalk.gray(`    - Schema ID: ${result.id || "N/A"}`));
    Logger.generic(
      chalk.gray(`    - Schema Name: ${result.name || "Unnamed"}`)
    );
    Logger.generic(
      chalk.gray(`    - Schema Version: ${result.version || "N/A"}`)
    );
    Logger.generic(" ");
  }

  /**
   * Handle execution errors - should preserve ConductorError suggestions
   */
  private handleExecutionError(error: unknown): CommandResult {
    // If it's already a ConductorError, preserve it completely
    // The base Command.run() method will handle displaying the suggestions
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;

      // Log the error here to ensure it gets displayed
      Logger.errorString(conductorError.message);

      // Display suggestions immediately since they might not make it through the chain
      if (conductorError.suggestions && conductorError.suggestions.length > 0) {
        Logger.suggestion("Suggestions");
        conductorError.suggestions.forEach((suggestion: string) => {
          Logger.tipString(suggestion);
        });
      }

      return {
        success: false,
        errorMessage: conductorError.message,
        errorCode: conductorError.code,
        details: conductorError.details,
      };
    }

    // For any other unexpected errors, wrap them with helpful suggestions
    const errorMessage = error instanceof Error ? error.message : String(error);

    Logger.errorString(`Unexpected error: ${errorMessage}`);

    const suggestions = [
      "Check that Lectern service is running and accessible",
      "Verify your schema file format and content",
      "Use --debug for detailed error information",
      "Try the upload again after a few moments",
    ];

    // Display suggestions immediately
    Logger.suggestion("Suggestions");
    suggestions.forEach((suggestion: string) => {
      Logger.tipString(suggestion);
    });

    const genericError = ErrorFactory.connection(
      "Schema upload failed",
      { originalError: error },
      suggestions
    );

    return {
      success: false,
      errorMessage: genericError.message,
      errorCode: genericError.code,
      details: genericError.details,
    };
  }
}
