// src/commands/songUploadSchemaCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongSchemaUploadParams } from "../services/song-score/types";
import * as fs from "fs";

/**
 * Command for uploading schemas to the SONG service
 * Refactored to use the new SongService with error factory pattern
 */
export class SongUploadSchemaCommand extends Command {
  constructor() {
    super("SONG Schema Upload");
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
        "Set SONG_SCHEMA environment variable",
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

    // Validate SONG URL
    const songUrl = this.getSongUrl(options);
    if (!songUrl) {
      throw ErrorFactory.args("SONG URL not specified", [
        "Use --song-url option to specify SONG server URL",
        "Set SONG_URL environment variable",
        "Example: --song-url http://localhost:8080",
      ]);
    }
  }

  /**
   * Executes the SONG schema upload process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration
      const schemaFile = this.getSchemaFile(options)!;
      const serviceConfig = this.extractServiceConfig(options);
      const uploadParams = this.extractUploadParams(schemaFile);

      // Create service instance
      const songService = new SongService(serviceConfig);

      // Check service health
      const healthResult = await songService.checkHealth();
      if (!healthResult.healthy) {
        throw ErrorFactory.connection(
          "SONG service is not healthy",
          {
            healthResult,
            serviceUrl: serviceConfig.url,
          },
          [
            "Check that SONG service is running",
            `Verify the service URL: ${serviceConfig.url}`,
            "Check network connectivity",
            "Review service logs for errors",
          ]
        );
      }

      // Log upload info
      this.logUploadInfo(schemaFile, serviceConfig.url);

      // Upload schema
      const result = await songService.uploadSchema(uploadParams);

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
    return options.schemaFile || process.env.SONG_SCHEMA;
  }

  /**
   * Get SONG URL from various sources
   */
  private getSongUrl(options: any): string | undefined {
    return options.songUrl || process.env.SONG_URL;
  }

  /**
   * Extract service configuration from options
   */
  private extractServiceConfig(options: any) {
    return {
      url: this.getSongUrl(options)!,
      timeout: 10000,
      retries: 1,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Extract upload parameters from schema file
   */
  private extractUploadParams(schemaFile: string): SongSchemaUploadParams {
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
    Logger.info`${chalk.bold.cyan("Uploading Schema to SONG:")}`;
    Logger.infoString(`URL: ${serviceUrl}/schemas`);
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

    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      const connectionError = ErrorFactory.connection(
        "Failed to connect to SONG service",
        { originalError: error },
        [
          "Check that SONG service is running",
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
        "Authentication failed with SONG service",
        { originalError: error },
        [
          "Check authentication credentials",
          "Verify API token is valid",
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

    if (errorMessage.includes("400") || errorMessage.includes("validation")) {
      const validationError = ErrorFactory.validation(
        "Schema validation failed",
        { originalError: error },
        [
          "Check schema format and structure",
          "Ensure required fields are present",
          "Verify schema follows SONG requirements",
        ]
      );

      return {
        success: false,
        errorMessage: validationError.message,
        errorCode: validationError.code,
        details: validationError.details,
      };
    }

    if (errorMessage.includes("409") || errorMessage.includes("conflict")) {
      const conflictError = ErrorFactory.validation(
        "Schema already exists",
        { originalError: error },
        [
          "Schema with this name may already exist",
          "Update the schema version or name",
          "Use force flag if available to overwrite",
        ]
      );

      return {
        success: false,
        errorMessage: conflictError.message,
        errorCode: conflictError.code,
        details: conflictError.details,
      };
    }

    // Generic fallback
    const genericError = ErrorFactory.connection(
      "Schema upload failed",
      { originalError: error },
      [
        "Check SONG service availability",
        "Verify schema file format and content",
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
