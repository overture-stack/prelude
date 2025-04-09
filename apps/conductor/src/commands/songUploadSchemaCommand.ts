import * as fs from "fs";
import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { validateSongSchema } from "../services/song/songSchemaValidator";

/**
 * Response from SONG schema upload
 */
export interface SongUploadResponse {
  /** The unique identifier for the uploaded schema */
  id?: string;

  /** The name of the schema */
  name?: string;

  /** The version of the schema */
  version?: string;

  /** Any error message returned by SONG */
  error?: string;

  /** Additional response details */
  [key: string]: any;
}

/**
 * Command for uploading schemas to the SONG service
 */
export class SongUploadSchemaCommand extends Command {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly TIMEOUT = 10000; // 10 seconds

  constructor() {
    super("SONG Schema Upload");
  }

  /**
   * Normalize URL to ensure it includes the /schemas endpoint
   * @param url Original URL
   * @returns Normalized URL
   */
  private normalizeSchemaUrl(url: string): string {
    // Remove trailing slash if present
    url = url.replace(/\/$/, "");

    // Add /schemas if not already present
    if (!url.endsWith("/schemas")) {
      url = `${url}/schemas`;
    }

    return url;
  }

  /**
   * Checks SONG service health
   * @param url SONG service URL
   * @returns Promise resolving to boolean indicating health status
   */
  private async checkSongHealth(url: string): Promise<boolean> {
    // Remove /schemas from the URL if present to get base URL for health check
    const baseUrl = url.replace(/\/schemas$/, "");
    const healthUrl = `${baseUrl}/isAlive`;

    try {
      Logger.info(`Checking SONG health: ${healthUrl}`);

      const response = await axios.get(healthUrl, {
        timeout: this.TIMEOUT,
        headers: { accept: "*/*" },
      });

      // Check for health status
      const isHealthy = response.status === 200;

      if (isHealthy) {
        Logger.info(`\x1b[32mSuccess:\x1b[0m SONG is healthy`);
        return true;
      }

      Logger.warn(`SONG health check failed. Status: ${response.status}`);
      return false;
    } catch (error) {
      Logger.warn(`SONG health check failed`);
      Logger.error(`\x1b[31mFailed to connect to SONG service\x1b[0m`);
      return false;
    }
  }

  /**
   * Executes the SONG schema upload process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration from options or environment
      const schemaFile = options.schemaFile || process.env.SONG_SCHEMA;
      const songUrl = options.songUrl || process.env.SONG_URL;
      const authToken =
        options.authToken || process.env.SONG_AUTH_TOKEN || "123";

      // Validate required parameters
      if (!schemaFile) {
        throw new ConductorError(
          "Schema file not specified. Use --schema-file or set SONG_SCHEMA environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      if (!songUrl) {
        throw new ConductorError(
          "SONG URL not specified. Use --song-url or set SONG_URL environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      // Normalize URL
      const normalizedUrl = this.normalizeSchemaUrl(songUrl);

      // First, check SONG service health
      const isHealthy = await this.checkSongHealth(normalizedUrl);
      if (!isHealthy) {
        throw new ConductorError(
          "Unable to establish connection with SONG service",
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

      // Read schema file
      Logger.info(`Reading schema file: ${schemaFile}`);
      const schemaContent = fs.readFileSync(schemaFile, "utf-8");

      // Validate JSON and schema structure
      let schemaJson: any;
      try {
        schemaJson = JSON.parse(schemaContent);

        // Validate against SONG-specific requirements
        const { isValid, warnings } = validateSongSchema(schemaJson);

        // Log any warnings
        if (warnings.length > 0) {
          Logger.warn("Schema validation warnings:");
          warnings.forEach((warning) => {
            Logger.warn(`  - ${warning}`);
          });
        }

        Logger.info("Schema validation passed");
      } catch (error) {
        if (error instanceof ConductorError) {
          throw error;
        }
        throw new ConductorError(
          `Schema file contains invalid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
          ErrorCodes.INVALID_FILE
        );
      }

      // Upload schema
      Logger.info(`Uploading schema to ${normalizedUrl}`);

      let response;
      let attempt = 0;
      let lastError;

      while (attempt < this.MAX_RETRIES) {
        attempt++;
        try {
          response = await axios.post(normalizedUrl, schemaContent, {
            headers: {
              accept: "*/*",
              Authorization: authToken,
              "Content-Type": "application/json",
            },
            timeout: this.TIMEOUT,
          });

          // Upload successful
          break;
        } catch (error: any) {
          lastError = error;

          // Extract detailed error information from Axios error
          if (error.response) {
            // Server responded with non-2xx status code
            const status = error.response.status;
            const responseData = error.response.data;

            Logger.error(`Server responded with status ${status}`);

            // Handle standard SONG error format
            if (responseData && typeof responseData === "object") {
              if (responseData.message) {
                Logger.error(`Error message: ${responseData.message}`);
              }

              if (responseData.debugMessage) {
                Logger.error(`Debug message: ${responseData.debugMessage}`);
              }

              if (
                responseData.stackTrace &&
                Array.isArray(responseData.stackTrace)
              ) {
                // Show first few lines of stack trace for context
                const relevantStackTrace = responseData.stackTrace.slice(0, 3);
                Logger.info("Server stack trace (first 3 lines):");
                relevantStackTrace.forEach((line: string) => {
                  Logger.generic(chalk.gray(`  ${line}`));
                });
              }

              // Check for common errors
              const errorString = JSON.stringify(responseData);

              // Check for missing name field
              if (
                errorString.includes("NullPointerException") ||
                (responseData.message &&
                  responseData.message.includes("required field"))
              ) {
                Logger.error(
                  `The schema appears to be missing required fields`
                );
                Logger.tip(
                  `Check your schema structure against the SONG documentation, ensuring it has required fields 'name' and 'schema'`
                );
              }

              // Check for validation errors
              if (
                errorString.includes("ValidationException") ||
                (responseData.message &&
                  responseData.message.includes("validation"))
              ) {
                Logger.error(`Schema validation failed on the server`);
                Logger.tip(
                  `The schema structure may be correct but fails server-side validation rules. Review the error message for details.`
                );
              }
            } else {
              // Log raw response if not in expected format
              Logger.error(
                `Raw error response: ${JSON.stringify(responseData)}`
              );
            }
          } else if (error.request) {
            // Request was made but no response received
            Logger.error(`No response received from server: ${error.message}`);
          } else {
            // Error in setting up the request
            Logger.error(`Error setting up request: ${error.message}`);
          }

          if (attempt < this.MAX_RETRIES) {
            Logger.warn(
              `Upload attempt ${attempt} failed, retrying in ${
                this.RETRY_DELAY / 1000
              }s...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, this.RETRY_DELAY)
            );
          }
        }
      }

      // Check if upload succeeded
      if (!response) {
        if (
          lastError &&
          lastError.response &&
          lastError.response.status === 500
        ) {
          throw new ConductorError(
            `Server error (500) during schema upload. Check server logs for details.`,
            ErrorCodes.CONNECTION_ERROR,
            {
              statusCode: 500,
              lastError: lastError.message,
              suggestion:
                "The schema may be missing required fields or contain invalid structure",
            }
          );
        }

        throw (
          lastError ||
          new ConductorError(
            "Failed to upload schema after multiple attempts",
            ErrorCodes.CONNECTION_ERROR
          )
        );
      }

      // Process response
      const result = response.data;

      // Create strongly typed result object
      const typedResult: SongUploadResponse =
        result && typeof result === "object"
          ? (result as SongUploadResponse)
          : {};

      // Check for error in response body
      if (typedResult.error) {
        throw new ConductorError(
          `SONG schema upload error: ${typedResult.error}`,
          ErrorCodes.CONNECTION_ERROR
        );
      }

      Logger.success(`Schema uploaded successfully`);
      Logger.generic(" ");
      Logger.generic(
        chalk.gray(`    - Schema Name: ${typedResult.name || "Unnamed"}`)
      );
      Logger.generic(
        chalk.gray(`    - Schema Version: ${typedResult.version || "N/A"}`)
      );
      Logger.generic(" ");

      return {
        success: true,
        details: typedResult as Record<string, any>,
      };
    } catch (error) {
      // Handle errors and return failure result
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof ConductorError
          ? error.code
          : ErrorCodes.CONNECTION_ERROR;

      // Add extra details to the error result
      const details = error instanceof ConductorError ? error.details : {};

      return {
        success: false,
        errorMessage,
        errorCode,
        details,
      };
    }
  }

  /**
   * Validates command line arguments.
   * This implementation ensures that SONG URL and schema file are provided.
   *
   * @param cliOutput - The parsed command line arguments
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Validate SONG URL
    const songUrl =
      options.songUrl || cliOutput.config.song?.url || process.env.SONG_URL;

    if (!songUrl) {
      throw new ConductorError(
        "No SONG URL provided. Use --song-url option or set SONG_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate schema file
    const schemaFile =
      options.schemaFile ||
      cliOutput.config.song?.schemaFile ||
      process.env.SONG_SCHEMA;

    if (!schemaFile) {
      throw new ConductorError(
        "No schema file provided. Use --schema-file option or set SONG_SCHEMA environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Verify schema file exists
    if (!fs.existsSync(schemaFile)) {
      throw new ConductorError(
        `Schema file not found: ${schemaFile}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Validate schema JSON structure
    try {
      const schemaContent = fs.readFileSync(schemaFile, "utf-8");
      const schemaJson = JSON.parse(schemaContent);

      // Basic schema validation
      if (!schemaJson.name) {
        throw new ConductorError(
          "Invalid schema format: Missing required field 'name'",
          ErrorCodes.INVALID_FILE
        );
      }

      if (!schemaJson.schema || typeof schemaJson.schema !== "object") {
        throw new ConductorError(
          "Invalid schema format: Missing or invalid 'schema' field",
          ErrorCodes.INVALID_FILE
        );
      }

      // Optional schema option validations
      if (schemaJson.options) {
        if (
          schemaJson.options.fileTypes &&
          !Array.isArray(schemaJson.options.fileTypes)
        ) {
          throw new ConductorError(
            "Invalid schema format: 'fileTypes' must be an array",
            ErrorCodes.INVALID_FILE
          );
        }

        if (
          schemaJson.options.externalValidations &&
          !Array.isArray(schemaJson.options.externalValidations)
        ) {
          throw new ConductorError(
            "Invalid schema format: 'externalValidations' must be an array",
            ErrorCodes.INVALID_FILE
          );
        }
      }
    } catch (error) {
      if (error instanceof ConductorError) {
        throw error;
      }

      throw new ConductorError(
        `Schema file contains invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.INVALID_FILE,
        error
      );
    }
  }
}
