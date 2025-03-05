import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";

/**
 * Command for publishing a Song analysis after file upload
 * Uses the SONG REST API directly based on the Swagger spec
 */
export class SongPublishAnalysisCommand extends Command {
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly TIMEOUT = 10000; // 10 seconds

  constructor() {
    super("SONG Analysis Publication");
  }

  /**
   * Executes the SONG analysis publication process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration from options or environment
      const analysisId = options.analysisId || process.env.ANALYSIS_ID;
      const studyId = options.studyId || process.env.STUDY_ID || "demo";
      const songUrl =
        options.songUrl || process.env.SONG_URL || "http://localhost:8080";
      const authToken = options.authToken || process.env.AUTH_TOKEN || "123";
      const ignoreUndefinedMd5 = options.ignoreUndefinedMd5 || false;

      // Validate required parameters
      if (!analysisId) {
        throw new ConductorError(
          "Analysis ID not specified. Use --analysis-id or set ANALYSIS_ID environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      // Log publication details
      Logger.info(`\x1b[1;36mPublishing Analysis:\x1b[0m`);
      Logger.info(`Analysis ID: ${analysisId}`);
      Logger.info(`Study ID: ${studyId}`);
      Logger.info(`Song URL: ${songUrl}`);

      // Publish the analysis via REST API
      const publishResult = await this.publishAnalysisViaAPI(
        studyId,
        analysisId,
        songUrl,
        authToken,
        ignoreUndefinedMd5
      );

      // Log success
      Logger.success(`Analysis published successfully`);
      Logger.generic(" ");
      Logger.generic(chalk.gray(`    - Analysis ID: ${analysisId}`));
      Logger.generic(chalk.gray(`    - Study ID: ${studyId}`));
      Logger.generic(" ");

      return {
        success: true,
        details: {
          analysisId,
          studyId,
          message: publishResult.message || "Successfully published",
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
      const details = error instanceof ConductorError ? error.details : {};

      // Special handling for common error cases
      if (errorMessage.includes("not found")) {
        Logger.tip(
          "Make sure the analysis ID exists and belongs to the specified study"
        );
      } else if (
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("permission")
      ) {
        Logger.tip("Check that you have the correct authorization token");
      }

      return {
        success: false,
        errorMessage,
        errorCode,
        details,
      };
    }
  }

  /**
   * Publishes an analysis using the SONG REST API
   * Based on the SONG Swagger specification for the publish endpoint
   *
   * @param studyId - Study ID
   * @param analysisId - Analysis ID to publish
   * @param songUrl - Song server URL
   * @param authToken - Authorization token
   * @param ignoreUndefinedMd5 - Whether to ignore undefined MD5 checksums
   * @returns Object with the publish result
   */
  private async publishAnalysisViaAPI(
    studyId: string,
    analysisId: string,
    songUrl: string,
    authToken: string,
    ignoreUndefinedMd5: boolean
  ): Promise<{ message: string }> {
    Logger.info("Using SONG REST API to publish analysis");

    // Normalize URL by removing trailing slash if present
    const baseUrl = songUrl.endsWith("/") ? songUrl.slice(0, -1) : songUrl;

    // Construct the publish endpoint URL
    // Format: /studies/{studyId}/analysis/publish/{analysisId}
    const publishUrl = `${baseUrl}/studies/${studyId}/analysis/publish/${analysisId}`;

    // Set up headers with authorization
    const headers = {
      Accept: "application/json",
      Authorization: authToken.startsWith("Bearer ")
        ? authToken
        : `Bearer ${authToken}`,
    };

    // Add the ignoreUndefinedMd5 query parameter if needed
    const params: Record<string, any> = {};
    if (ignoreUndefinedMd5) {
      params.ignoreUndefinedMd5 = true;
    }

    Logger.debug(`Making PUT request to: ${publishUrl}`);
    Logger.debug(`Headers: ${JSON.stringify(headers)}`);
    Logger.debug(`Params: ${JSON.stringify(params)}`);

    try {
      // Make the PUT request
      // According to the SONG API Swagger spec, the publish endpoint is a PUT request
      // with no request body, and optional ignoreUndefinedMd5 query parameter
      const response = await axios.put(publishUrl, null, {
        headers,
        params,
        timeout: this.TIMEOUT,
      });

      Logger.debug(`Publish response: ${JSON.stringify(response.data)}`);

      // Return the response message
      // Fixed type checking error by properly handling different response types
      return {
        message:
          typeof response.data === "object" &&
          response.data !== null &&
          "message" in response.data
            ? String(response.data.message)
            : "Successfully published",
      };
    } catch (error: any) {
      // Extract detailed error information if available
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        Logger.error(`API error ${status}: ${JSON.stringify(data)}`);

        // For common status codes, provide more helpful error messages
        if (status === 401 || status === 403) {
          throw new ConductorError(
            `Authentication failed: Invalid or expired token`,
            ErrorCodes.CONNECTION_ERROR,
            { status, responseData: data }
          );
        } else if (status === 404) {
          throw new ConductorError(
            `Analysis not found: Check that analysis ${analysisId} exists in study ${studyId}`,
            ErrorCodes.FILE_NOT_FOUND,
            { status, responseData: data }
          );
        } else if (status === 409) {
          throw new ConductorError(
            `Conflict: The analysis may already be published or in an invalid state`,
            ErrorCodes.VALIDATION_FAILED,
            { status, responseData: data }
          );
        }

        // Generic error with the available details
        throw new ConductorError(
          `Publishing failed with status ${status}: ${
            typeof data === "object" && data !== null && "message" in data
              ? String(data.message)
              : "Unknown error"
          }`,
          ErrorCodes.CONNECTION_ERROR,
          { status, responseData: data }
        );
      }

      // Network errors, timeouts, etc.
      throw new ConductorError(
        `Failed to connect to SONG API: ${error.message}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Validates command line arguments.
   * This implementation ensures that analysis ID is provided.
   *
   * @param cliOutput - The parsed command line arguments
   * @returns A validation result indicating success or failure
   */
  protected async validate(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;
    const analysisId = options.analysisId || process.env.ANALYSIS_ID;

    if (!analysisId) {
      return {
        success: false,
        errorMessage:
          "No analysis ID provided. Use --analysis-id option or set ANALYSIS_ID environment variable.",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    return { success: true };
  }
}
