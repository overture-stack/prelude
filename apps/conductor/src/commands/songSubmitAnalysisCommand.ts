import * as fs from "fs";
import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";

/**
 * Response from SONG analysis submission
 */
export interface SongSubmissionResponse {
  /** The analysis ID returned by SONG */
  analysisId?: string;

  /** Any error message returned by SONG */
  error?: string;

  /** Additional response details */
  [key: string]: any;
}

/**
 * Command for submitting analysis data to the SONG service
 */
export class SongSubmitAnalysisCommand extends Command {
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly TIMEOUT = 20000; // 20 seconds

  constructor() {
    super("SONG Analysis Submission");
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
   * Parses error messages from SONG server responses
   * @param responseData Response data from SONG server
   * @returns Structured error information with specific guidance
   */
  private parseErrorMessage(responseData: any): {
    errorType: string;
    message: string;
    suggestion: string;
  } {
    // Default values
    let errorType = "UNKNOWN";
    let message = "Unknown error occurred";
    let suggestion = "Check server logs for more details";

    if (!responseData || typeof responseData !== "object") {
      return { errorType, message, suggestion };
    }

    // Extract message if available
    if (responseData.message) {
      message = responseData.message;
    }

    // Check for specific error patterns
    if (typeof message === "string") {
      // Analysis type not found
      if (message.includes("analysis.type.not.found")) {
        errorType = "ANALYSIS_TYPE_NOT_FOUND";
        suggestion =
          "Verify the analysisType.name in your JSON matches a schema that was uploaded with songUploadSchema";

        // Try to extract the schema name if it's in the error message
        const schemaMatch = message.match(/name '([^']+)'/);
        if (schemaMatch && schemaMatch[1]) {
          suggestion += `\nThe schema name '${schemaMatch[1]}' was not found on the server`;
        } else {
          // If we can't extract it, look at our analysis data
          suggestion +=
            "\nCheck the value of analysisType.name in your analysis file";
        }
      }
      // Study not found
      else if (message.includes("not.found") && message.includes("stud")) {
        errorType = "STUDY_NOT_FOUND";
        suggestion = "Create the study first using the songCreateStudy command";
      }
      // Schema validation error
      else if (
        message.includes("schema") &&
        (message.includes("validation") || message.includes("invalid"))
      ) {
        errorType = "SCHEMA_VALIDATION";
        suggestion =
          "Your analysis data doesn't match the required schema format";

        if (responseData.debugMessage) {
          message += "\n" + responseData.debugMessage;
        }
      }
      // Duplicate analysis
      else if (
        message.includes("duplicate") ||
        message.includes("already exists")
      ) {
        errorType = "DUPLICATE_ANALYSIS";
        suggestion = "Use --allow-duplicates to submit anyway";
      }
      // Authentication error
      else if (
        message.includes("auth") ||
        message.includes("permission") ||
        message.includes("unauthorized")
      ) {
        errorType = "AUTHENTICATION";
        suggestion = "Check your authorization token";
      }
    }

    return { errorType, message, suggestion };
  }

  /**
   * Executes the SONG analysis submission process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration from options or environment
      const analysisFile = options.analysisFile || process.env.ANALYSIS_FILE;
      const songUrl = options.songUrl || process.env.SONG_URL;
      const studyId = options.studyId || process.env.STUDY_ID || "demo";
      const allowDuplicates =
        options.allowDuplicates === true ||
        process.env.ALLOW_DUPLICATES === "true" ||
        false;
      const authToken = options.authToken || process.env.AUTH_TOKEN || "123";

      // Validate required parameters
      if (!analysisFile) {
        throw new ConductorError(
          "Analysis file not specified. Use --analysis-file or set ANALYSIS_FILE environment variable.",
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
      const normalizedUrl = this.normalizeUrl(songUrl);

      // First, check SONG service health
      const isHealthy = await this.checkSongHealth(normalizedUrl);
      if (!isHealthy) {
        throw new ConductorError(
          "Unable to establish connection with SONG service",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      // Validate analysis file exists
      if (!fs.existsSync(analysisFile)) {
        Logger.error(`Analysis file not found at ${analysisFile}`);
        throw new ConductorError(
          `Analysis file not found at ${analysisFile}`,
          ErrorCodes.FILE_NOT_FOUND
        );
      }

      // Read analysis file
      Logger.info(`Reading analysis file: ${analysisFile}`);
      let analysisContent = fs.readFileSync(analysisFile, "utf-8");

      // Validate JSON format
      let analysisJson: any;
      try {
        analysisJson = JSON.parse(analysisContent);

        // Basic validation of analysis JSON
        if (!analysisJson.studyId) {
          Logger.warn(
            "Analysis JSON is missing studyId. Using provided studyId parameter."
          );
          // This is not critical as we'll use the studyId parameter
        }

        if (!analysisJson.analysisType || !analysisJson.analysisType.name) {
          throw new ConductorError(
            "Invalid analysis format: Missing required field 'analysisType.name'",
            ErrorCodes.INVALID_FILE
          );
        } else {
          // Log the analysis type name for debugging
          Logger.info(`Analysis type name: ${analysisJson.analysisType.name}`);
        }

        if (
          !analysisJson.files ||
          !Array.isArray(analysisJson.files) ||
          analysisJson.files.length === 0
        ) {
          throw new ConductorError(
            "Invalid analysis format: 'files' must be a non-empty array",
            ErrorCodes.INVALID_FILE
          );
        }

        // Ensure studyId in the file matches the provided/default studyId
        if (analysisJson.studyId && analysisJson.studyId !== studyId) {
          Logger.warn(
            `StudyId in file (${analysisJson.studyId}) differs from provided studyId (${studyId})`
          );
          if (!options.force) {
            Logger.info("Use --force to override studyId in file");
            // We'll proceed with the original file content, warning is enough
          } else {
            Logger.info(`Forcing studyId to be ${studyId}`);
            analysisJson.studyId = studyId;
            // Reserialize the JSON with updated studyId
            analysisContent = JSON.stringify(analysisJson);
          }
        }

        Logger.info("Analysis validation passed");
      } catch (error) {
        if (error instanceof ConductorError) {
          throw error;
        }
        throw new ConductorError(
          `Analysis file contains invalid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
          ErrorCodes.INVALID_FILE
        );
      }

      // Submit analysis
      const submitUrl = `${normalizedUrl}/submit/${studyId}?allowDuplicates=${allowDuplicates}`;
      Logger.info(`Submitting analysis to ${submitUrl}`);

      let response;
      let attempt = 0;
      let lastError;

      while (attempt < this.MAX_RETRIES) {
        attempt++;
        try {
          response = await axios.post(submitUrl, analysisContent, {
            headers: {
              accept: "*/*",
              Authorization: `bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            timeout: this.TIMEOUT,
          });

          // Submission successful
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
              // Parse and display specific error information
              if (responseData.message) {
                Logger.error(`Error message: ${responseData.message}`);
              }

              if (responseData.debugMessage) {
                Logger.error(
                  `Debug message: ${responseData.debugMessage || "N/A"}`
                );
              }

              // Use improved error parsing
              const { errorType, message, suggestion } =
                this.parseErrorMessage(responseData);

              // Only log error type if it's not the direct message
              if (errorType !== "UNKNOWN" && !message.includes(errorType)) {
                Logger.error(`Error type: ${errorType}`);
              }

              // Display an appropriate suggestion based on the error type
              Logger.tip(suggestion);
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
              `Submission attempt ${attempt} failed, retrying in ${
                this.RETRY_DELAY / 1000
              }s...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, this.RETRY_DELAY)
            );
          }
        }
      }

      // Check if submission succeeded
      if (!response) {
        if (
          lastError &&
          lastError.response &&
          lastError.response.status === 409 &&
          allowDuplicates
        ) {
          // If we're allowing duplicates and got a 409, this is actually okay
          Logger.warn(
            "Submission already exists, but --allow-duplicates was specified"
          );
          // Try to extract the analysisId from the error response if possible
          let analysisId = "";
          try {
            if (
              lastError.response.data &&
              typeof lastError.response.data === "object" &&
              lastError.response.data.message
            ) {
              // Try to extract ID from error message
              const match = lastError.response.data.message.match(
                /analysisId: ([a-f0-9-]+)/i
              );
              if (match && match[1]) {
                analysisId = match[1];
              }
            }
          } catch (parseError) {
            // Ignore parse errors, just means we couldn't extract the ID
          }

          return {
            success: true,
            details: {
              analysisId: analysisId || "UNKNOWN",
              status: "DUPLICATE",
              message: "Analysis already exists",
            },
          };
        }

        throw (
          lastError ||
          new ConductorError(
            "Failed to submit analysis after multiple attempts",
            ErrorCodes.CONNECTION_ERROR
          )
        );
      }

      // Process response
      const result = response.data;

      // Extract analysis ID from response
      let analysisId = "";
      if (result && typeof result === "object") {
        // Use type assertion to tell TypeScript this object might have analysisId
        const resultObj = result as { analysisId?: string };
        analysisId = resultObj.analysisId || "";
      } else if (typeof result === "string") {
        // Try to extract from string response
        const match = result.match(/"analysisId"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          analysisId = match[1];
        }
      }

      if (!analysisId) {
        Logger.warn("Unable to extract analysis ID from response");
      }

      Logger.success(`Analysis submitted successfully`);
      Logger.generic(" ");
      Logger.generic(
        chalk.gray(`    - Analysis ID: ${analysisId || "UNKNOWN"}`)
      );
      Logger.generic(chalk.gray(`    - Study ID: ${studyId}`));
      Logger.generic(
        chalk.gray(`    - Analysis Type: ${analysisJson.analysisType.name}`)
      );
      Logger.generic(" ");

      return {
        success: true,
        details: {
          analysisId,
          studyId,
          analysisType: analysisJson.analysisType.name,
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
   * This implementation ensures that required parameters are provided.
   *
   * @param cliOutput - The parsed command line arguments
   * @returns A validation result indicating success or failure
   */
  protected async validate(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;
    const songUrl = options.songUrl || process.env.SONG_URL;
    const analysisFile = options.analysisFile || process.env.ANALYSIS_FILE;

    if (!songUrl) {
      return {
        success: false,
        errorMessage:
          "No SONG URL provided. Use --song-url option or set SONG_URL environment variable.",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    if (!analysisFile) {
      return {
        success: false,
        errorMessage:
          "No analysis file provided. Use --analysis-file option or set ANALYSIS_FILE environment variable.",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    return { success: true };
  }
}
