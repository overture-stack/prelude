import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";

/**
 * Response from SONG study creation
 */
export interface SongStudyResponse {
  /** The study ID */
  studyId?: string;

  /** The name of the study */
  name?: string;

  /** The organization for the study */
  organization?: string;

  /** Any error message returned by SONG */
  error?: string;

  /** Additional response details */
  [key: string]: any;
}

/**
 * Command for creating a new study in the SONG service
 */
export class SongCreateStudyCommand extends Command {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly TIMEOUT = 10000; // 10 seconds

  constructor() {
    super("SONG Study Creation");
  }

  /**
   * Normalize URL to ensure it has the proper format
   * @param url Original URL
   * @returns Normalized URL
   */
  private normalizeUrl(url: string): string {
    // Remove trailing slash if present
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  /**
   * Checks SONG service health
   * @param url SONG service URL
   * @returns Promise resolving to boolean indicating health status
   */
  private async checkSongHealth(url: string): Promise<boolean> {
    // Use isAlive endpoint for SONG health check
    const healthUrl = `${url}/isAlive`;

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
   * Checks if a study already exists
   * @param url SONG service URL
   * @param studyId Study ID to check
   * @param authToken Authentication token
   * @returns Promise resolving to boolean indicating if study exists
   */
  private async checkStudyExists(
    url: string,
    studyId: string,
    authToken: string
  ): Promise<boolean> {
    try {
      const studyUrl = `${url}/studies/${studyId}`;
      Logger.debug(`Checking if study exists: ${studyUrl}`);

      const response = await axios.get(studyUrl, {
        timeout: this.TIMEOUT,
        headers: {
          accept: "*/*",
          Authorization: authToken,
        },
      });

      return response.status === 200;
    } catch (error: any) {
      // If we get a 404, study doesn't exist
      if (error.response && error.response.status === 404) {
        return false;
      }

      // For other errors, log and assume study doesn't exist
      Logger.warn(`Error checking if study exists: ${error.message}`);
      return false;
    }
  }

  /**
   * Executes the SONG study creation process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration from options or environment
      const songUrl = options.songUrl || process.env.SONG_URL;
      const studyId = options.studyId || process.env.STUDY_ID || "demo";
      const studyName = options.studyName || process.env.STUDY_NAME || "string";
      const organization =
        options.organization || process.env.ORGANIZATION || "string";
      const description =
        options.description || process.env.DESCRIPTION || "string";
      const authToken = options.authToken || process.env.AUTH_TOKEN || "123";
      const force = options.force || false;

      // Validate required parameters
      if (!songUrl) {
        throw new ConductorError(
          "SONG URL not specified. Use --song-url or set SONG_URL environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      // Normalize URL
      const normalizedUrl = this.normalizeUrl(songUrl);

      // First, check SONG service health
      const isHealthy = await this.checkSongHealth(normalizedUrl);
      if (!isHealthy) {
        throw new ConductorError(
          "Unable to establish connection with SONG service",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      // Check if study already exists
      const studyExists = await this.checkStudyExists(
        normalizedUrl,
        studyId,
        authToken
      );
      if (studyExists && !force) {
        Logger.warn(`Study ID ${studyId} already exists`);

        return {
          success: true,
          details: {
            studyId,
            status: "EXISTING",
            message: `Study ID ${studyId} already exists`,
          },
        };
      } else if (studyExists && force) {
        Logger.warn(
          `Study ID ${studyId} already exists, continuing with force option`
        );
      }

      // Prepare study payload
      const studyPayload = {
        description,
        info: {},
        name: studyName,
        organization,
        studyId,
      };

      // Upload study
      Logger.info(
        `\x1b[1;36mStudy Upload:\x1b[0m Uploading study to ${normalizedUrl}/studies/${studyId}/`
      );

      let response;
      let attempt = 0;
      let lastError;

      while (attempt < this.MAX_RETRIES) {
        attempt++;
        try {
          response = await axios.post(
            `${normalizedUrl}/studies/${studyId}/`,
            studyPayload,
            {
              headers: {
                accept: "*/*",
                Authorization: authToken,
                "Content-Type": "application/json",
              },
              timeout: this.TIMEOUT,
            }
          );

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

            // Handle existing study error
            if (status === 409) {
              Logger.warn(`Study ID ${studyId} already exists`);

              // Return success with existing status if the study already exists
              return {
                success: true,
                details: {
                  studyId,
                  status: "EXISTING",
                  message: `Study ID ${studyId} already exists`,
                },
              };
            }

            // Handle standard SONG error format
            if (responseData && typeof responseData === "object") {
              if (responseData.message) {
                Logger.error(`Error message: ${responseData.message}`);
              }

              if (responseData.debugMessage) {
                Logger.error(`Debug message: ${responseData.debugMessage}`);
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
              `Study creation attempt ${attempt} failed, retrying in ${
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
        throw (
          lastError ||
          new ConductorError(
            "Failed to create study after multiple attempts",
            ErrorCodes.CONNECTION_ERROR
          )
        );
      }

      // Process response
      const result = response.data;

      // Create strongly typed result object
      const typedResult: SongStudyResponse = {
        studyId,
        name: studyName,
        organization,
      };

      Logger.success(`Study created successfully`);
      Logger.generic(" ");
      Logger.generic(
        chalk.gray(`    - Study ID: ${typedResult.studyId || studyId}`)
      );
      Logger.generic(
        chalk.gray(`    - Study Name: ${typedResult.name || studyName}`)
      );
      Logger.generic(
        chalk.gray(
          `    - Organization: ${typedResult.organization || organization}`
        )
      );
      Logger.generic(" ");

      return {
        success: true,
        details: {
          ...typedResult,
          status: "CREATED",
        },
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
   * This implementation ensures that SONG URL is provided.
   *
   * @param cliOutput - The parsed command line arguments
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Validate SONG URL
    const songUrl = options.songUrl || process.env.SONG_URL;
    if (!songUrl) {
      throw new ConductorError(
        "No SONG URL provided. Use --song-url option or set SONG_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Optional additional validations
    const studyId = options.studyId || process.env.STUDY_ID || "demo";
    if (!studyId) {
      throw new ConductorError(
        "Study ID is invalid or not specified.",
        ErrorCodes.INVALID_ARGS
      );
    }

    const studyName = options.studyName || process.env.STUDY_NAME || "string";
    if (!studyName) {
      throw new ConductorError(
        "Study name is invalid or not specified.",
        ErrorCodes.INVALID_ARGS
      );
    }

    const organization =
      options.organization || process.env.ORGANIZATION || "string";
    if (!organization) {
      throw new ConductorError(
        "Organization is invalid or not specified.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }
}
