import * as fs from "fs";
import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { LecternService } from "../services/lectern/lecternService";

// Define an interface for the health check response
interface LecternHealthResponse {
  appStatus?: string;
  status?: string;
  [key: string]: any;
}

export class LecternUploadCommand extends Command {
  private readonly MAX_RETRIES = 10;
  private readonly RETRY_DELAY = 20000; // 20 seconds
  private readonly TIMEOUT = 10000; // 10 seconds

  constructor() {
    super("Lectern Schema Upload");
  }

  /**
   * Override the base validate method since we don't require input files in filePaths
   * but instead use the schema file directly.
   */
  protected async validate(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;
    const schemaFile = options.schemaFile || process.env.LECTERN_SCHEMA;

    if (!schemaFile) {
      return {
        success: false,
        errorMessage:
          "Schema file not specified. Use --schema-file or set LECTERN_SCHEMA environment variable.",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    // Check if the schema file exists
    if (!fs.existsSync(schemaFile)) {
      return {
        success: false,
        errorMessage: `Schema file not found: ${schemaFile}`,
        errorCode: ErrorCodes.FILE_NOT_FOUND,
      };
    }

    // We passed validation
    return { success: true };
  }

  /**
   * Normalize URL for health check
   * @param url Original URL
   * @returns Base URL for health check
   */
  private normalizeHealthCheckUrl(url: string): string {
    // Remove /dictionary or /dictionaries if present
    return url
      .replace(/\/dictionaries?$/, "")
      .replace(/\/dictionary$/, "")
      .replace(/\/$/, "");
  }

  /**
   * Checks Lectern service health
   * @param url Lectern service URL
   * @returns Promise resolving to boolean indicating health status
   */
  private async checkLecternHealth(url: string): Promise<boolean> {
    const baseUrl = this.normalizeHealthCheckUrl(url);
    const healthUrl = `${baseUrl}/health`;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        Logger.info(
          `Checking Lectern health (Attempt ${attempt}): ${healthUrl}`
        );

        const response = await axios.get<LecternHealthResponse>(healthUrl, {
          timeout: this.TIMEOUT,
          headers: { accept: "*/*" },
        });

        // Check for health status (multiple possible keys)
        const isHealthy =
          response.data?.appStatus === "Up" ||
          response.data?.status === "Up" ||
          response.data?.status === "Healthy";

        if (isHealthy) {
          Logger.info(`\x1b[32mSuccess:\x1b[0m Lectern is healthy`);
          return true;
        }

        Logger.warn(
          `Lectern health check failed. Status: ${JSON.stringify(
            response.data
          )}`
        );
      } catch (error) {
        Logger.warn(`Lectern health check attempt ${attempt} failed`);

        if (attempt === this.MAX_RETRIES) {
          Logger.error(
            `\x1b[31mFailed to connect to Lectern after ${this.MAX_RETRIES} attempts\x1b[0m`
          );
          return false;
        }
      }

      // Wait before next retry
      await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
    }

    return false;
  }

  /**
   * Executes the Lectern schema upload process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration from options or environment
      const schemaFile = options.schemaFile || process.env.LECTERN_SCHEMA;
      const lecternUrl = options.lecternUrl || process.env.LECTERN_URL;
      const authToken =
        options.authToken || process.env.LECTERN_AUTH_TOKEN || "bearer123";

      // Validate required parameters
      if (!schemaFile) {
        throw new ConductorError(
          "Schema file not specified. Use --schema-file or set LECTERN_SCHEMA environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      if (!lecternUrl) {
        throw new ConductorError(
          "Lectern URL not specified. Use --lectern-url or set LECTERN_URL environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      // First, check Lectern service health
      const isHealthy = await this.checkLecternHealth(lecternUrl);
      if (!isHealthy) {
        throw new ConductorError(
          "Unable to establish connection with Lectern service",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      // Validate schema file exists
      if (!fs.existsSync(schemaFile)) {
        Logger.error(`Schema file not found at ${schemaFile}`);
        throw new ConductorError(
          `Schema file not found at ${schemaFile}`,
          ErrorCodes.FILE_NOT_FOUND
        );
      }

      // Create Lectern service
      const lecternService = new LecternService(lecternUrl, authToken);

      // Read schema file
      Logger.info(`Reading schema file: ${schemaFile}`);
      const schemaContent = fs.readFileSync(schemaFile, "utf-8");

      // Validate JSON
      try {
        JSON.parse(schemaContent);
      } catch (error) {
        throw new ConductorError(
          `Schema file contains invalid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
          ErrorCodes.INVALID_FILE
        );
      }

      // Upload schema
      Logger.info(`Uploading schema to ${lecternService.getUrl()}`);
      const result = await lecternService.uploadSchema(schemaContent);

      Logger.success(`Schema uploaded successfully`);
      Logger.generic(" ");
      Logger.generic(chalk.gray(`    - Schema ID: ${result.id || "N/A"}`));
      Logger.generic(
        chalk.gray(`    - Schema Name: ${result.name || "Unnamed"}`)
      );
      Logger.generic(
        chalk.gray(`    - Schema Version: ${result.version || "N/A"}`)
      );
      Logger.generic(" ");

      return {
        success: true,
        details: result,
      };
    } catch (error) {
      // Handle errors and return failure result
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof ConductorError
          ? error.code
          : ErrorCodes.CONNECTION_ERROR;

      return {
        success: false,
        errorMessage,
        errorCode,
      };
    }
  }
}
