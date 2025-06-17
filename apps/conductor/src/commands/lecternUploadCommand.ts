// src/commands/lecternUploadCommand.ts - Simple version without over-engineering
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

      // Check service health
      const healthResult = await lecternService.checkHealth();
      if (!healthResult.healthy) {
        throw ErrorFactory.connection(
          "Lectern service is not healthy",
          {
            healthResult,
            serviceUrl: serviceConfig.url,
          },
          [
            "Check that Lectern service is running",
            `Verify the service URL: ${serviceConfig.url}`,
            "Check network connectivity",
            "Review service logs for errors",
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
      Logger.info`Reading schema file: ${schemaFile}`;
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
    Logger.info`${chalk.bold.cyan("Uploading Schema to Lectern:")}`;
    Logger.infoString(`URL: ${serviceUrl}/dictionaries`);
    Logger.infoString(`Schema File: ${schemaFile}`);
  }

  /**
   * Log successful upload
   */
  private logSuccess(result: any): void {
    Logger.successString("Schema uploaded successfully");
    Logger.generic(" ");
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
   * Handle execution errors - simple approach
   */
  private handleExecutionError(error: unknown): CommandResult {
    // If it's already a ConductorError, just return it
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;
      return {
        success: false,
        errorMessage: conductorError.message,
        errorCode: conductorError.code,
        details: conductorError.details,
      };
    }

    // For unexpected errors, wrap them appropriately
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Simple categorization
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      const connectionError = ErrorFactory.connection(
        "Failed to connect to Lectern service",
        { originalError: error },
        [
          "Check that Lectern service is running",
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

    if (errorMessage.includes("401") || errorMessage.includes("403")) {
      const authError = ErrorFactory.auth(
        "Authentication failed",
        { originalError: error },
        [
          "Check your authentication token",
          "Verify you have permission to upload schemas",
          "Contact your administrator for access",
        ]
      );

      return {
        success: false,
        errorMessage: authError.message,
        errorCode: authError.code,
        details: authError.details,
      };
    }

    // Generic fallback for other errors
    const genericError = ErrorFactory.connection(
      "Schema upload failed",
      { originalError: error },
      [
        "Check the service logs for more details",
        "Verify your schema file format",
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
