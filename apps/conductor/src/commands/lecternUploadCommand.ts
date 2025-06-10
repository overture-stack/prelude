// src/commands/lecternUploadCommand.ts - Updated to use new configuration system
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { LecternService } from "../services/lectern";
import { LecternSchemaUploadParams } from "../services/lectern/types";
import { ServiceConfigManager } from "../config/serviceConfigManager";
import * as fs from "fs";

/**
 * Command for uploading schemas to the Lectern service
 * Now uses the simplified configuration system!
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
      throw new ConductorError(
        "Schema file not specified. Use --schema-file or set LECTERN_SCHEMA environment variable.",
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
  }

  /**
   * Executes the Lectern schema upload process
   * Much simpler now with the new configuration system!
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration using the new simplified system
      const schemaFile = this.getSchemaFile(options)!;

      // Use the new ServiceConfigManager - much cleaner!
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
        throw new ConductorError(
          `Lectern service is not healthy: ${
            healthResult.message || "Unknown error"
          }`,
          ErrorCodes.CONNECTION_ERROR,
          { healthResult }
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
    Logger.info(`${chalk.bold.cyan("Uploading Schema to Lectern:")}`);
    Logger.info(`URL: ${serviceUrl}/dictionaries`);
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
      // Add context-specific help for common Lectern errors
      if (error.code === ErrorCodes.VALIDATION_FAILED) {
        Logger.info("\nSchema validation failed. Check your schema structure.");
        Logger.tip(
          'Ensure your schema has required fields: "name" and "schema"'
        );
      } else if (error.code === ErrorCodes.FILE_NOT_FOUND) {
        Logger.info("\nSchema file not found. Check the file path.");
      } else if (error.code === ErrorCodes.CONNECTION_ERROR) {
        Logger.info("\nConnection error. Check Lectern service availability.");
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
