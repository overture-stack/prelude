// src/commands/songUploadSchemaCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongSchemaUploadParams } from "../services/song-score/types";
import * as fs from "fs";

/**
 * Command for uploading schemas to the SONG service
 * Refactored to use the new SongService
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
      throw new ConductorError(
        "Schema file not specified. Use --schema-file or set SONG_SCHEMA environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate file exists and is readable
    if (!fs.existsSync(schemaFile)) {
      throw new ConductorError(
        `Schema file not found: ${schemaFile}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Validate SONG URL
    const songUrl = this.getSongUrl(options);
    if (!songUrl) {
      throw new ConductorError(
        "SONG URL not specified. Use --song-url or set SONG_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
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
        throw new ConductorError(
          `SONG service is not healthy: ${
            healthResult.message || "Unknown error"
          }`,
          ErrorCodes.CONNECTION_ERROR,
          { healthResult }
        );
      }

      // Log upload info
      this.logUploadInfo(schemaFile, serviceConfig.url);

      // Upload schema - much simpler now!
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
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Extract upload parameters from schema file
   */
  private extractUploadParams(schemaFile: string): SongSchemaUploadParams {
    try {
      Logger.info(`Reading schema file: ${schemaFile}`);
      const schemaContent = fs.readFileSync(schemaFile, "utf-8");

      return {
        schemaContent,
      };
    } catch (error) {
      throw new ConductorError(
        `Error reading schema file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.FILE_ERROR,
        error
      );
    }
  }

  /**
   * Log upload information
   */
  private logUploadInfo(schemaFile: string, serviceUrl: string): void {
    Logger.info(`${chalk.bold.cyan("Uploading Schema to SONG:")}`);
    Logger.info(`URL: ${serviceUrl}/schemas`);
    Logger.info(`Schema File: ${schemaFile}`);
  }

  /**
   * Log successful upload
   */
  private logSuccess(result: any): void {
    Logger.success("Schema uploaded successfully");
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
    if (error instanceof ConductorError) {
      // Add context-specific help for common SONG errors
      if (error.code === ErrorCodes.VALIDATION_FAILED) {
        Logger.info("\nSchema validation failed. Check your schema structure.");
        Logger.tip(
          'Ensure your schema has required fields: "name" and "schema"'
        );
      } else if (error.code === ErrorCodes.FILE_NOT_FOUND) {
        Logger.info("\nSchema file not found. Check the file path.");
      } else if (error.code === ErrorCodes.CONNECTION_ERROR) {
        Logger.info("\nConnection error. Check SONG service availability.");
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
      errorMessage: `Schema upload failed: ${errorMessage}`,
      errorCode: ErrorCodes.CONNECTION_ERROR,
      details: { originalError: error },
    };
  }
}
