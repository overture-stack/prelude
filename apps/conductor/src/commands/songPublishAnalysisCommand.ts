import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

/**
 * Command for publishing a Song analysis after file upload
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

      // Publish the analysis
      Logger.info(`\x1b[1;36mPublishing Analysis:\x1b[0m`);
      Logger.info(`Analysis ID: ${analysisId}`);
      Logger.info(`Study ID: ${studyId}`);
      Logger.info(`Song URL: ${songUrl}`);

      let publishResult;
      try {
        // Check if we should use the Docker Song Client or the REST API directly
        const useDocker = await this.checkIfDockerSongClientAvailable();

        if (useDocker) {
          // Use the Song Client via Docker to publish
          publishResult = await this.publishWithSongClient(
            studyId,
            analysisId,
            songUrl,
            authToken,
            ignoreUndefinedMd5
          );
        } else {
          // Use direct REST API call to publish
          publishResult = await this.publishWithRestApi(
            studyId,
            analysisId,
            songUrl,
            authToken,
            ignoreUndefinedMd5
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new ConductorError(
          `Failed to publish analysis: ${errorMessage}`,
          ErrorCodes.CONNECTION_ERROR
        );
      }

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
   * Publishes an analysis using the Song client via Docker
   *
   * @param studyId - Study ID
   * @param analysisId - Analysis ID to publish
   * @param songUrl - Song server URL
   * @param authToken - Authorization token
   * @param ignoreUndefinedMd5 - Whether to ignore undefined MD5 checksums
   * @returns Object with the publish result
   */
  private async publishWithSongClient(
    studyId: string,
    analysisId: string,
    songUrl: string,
    authToken: string,
    ignoreUndefinedMd5: boolean
  ): Promise<{ message: string }> {
    Logger.info("Using Song client to publish analysis");

    const ignoreFlag = ignoreUndefinedMd5 ? " --ignore-undefined-md5" : "";

    const command = `docker exec -e CLIENT_ACCESS_TOKEN=${authToken} -e CLIENT_SERVER_URL=${songUrl} song-client sh -c "sing publish -a ${analysisId}${ignoreFlag}"`;

    Logger.debug(`Executing command: ${command}`);

    try {
      const { stdout, stderr } = await execPromise(command, {
        timeout: this.TIMEOUT,
      });

      if (stderr && stderr.trim() !== "") {
        Logger.warn(`Song client warning: ${stderr}`);
      }

      // Try to parse the JSON response if possible
      try {
        const response = JSON.parse(stdout);
        return { message: response.message || "Successfully published" };
      } catch (e) {
        // If we can't parse it, just return the raw output
        return { message: stdout.trim() };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new ConductorError(
        `Failed to publish with Song client: ${errorMessage}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Publishes an analysis using direct REST API calls
   *
   * @param studyId - Study ID
   * @param analysisId - Analysis ID to publish
   * @param songUrl - Song server URL
   * @param authToken - Authorization token
   * @param ignoreUndefinedMd5 - Whether to ignore undefined MD5 checksums
   * @returns Object with the publish result
   */
  private async publishWithRestApi(
    studyId: string,
    analysisId: string,
    songUrl: string,
    authToken: string,
    ignoreUndefinedMd5: boolean
  ): Promise<{ message: string }> {
    Logger.info("Using REST API to publish analysis");

    // Normalize URL
    const baseUrl = songUrl.endsWith("/") ? songUrl.slice(0, -1) : songUrl;
    const publishUrl = `${baseUrl}/studies/${studyId}/analysis/publish/${analysisId}`;

    const headers = {
      Authorization: authToken.startsWith("Bearer ")
        ? authToken
        : `Bearer ${authToken}`,
      "Content-Type": "application/json",
    };

    const params = ignoreUndefinedMd5 ? { ignoreUndefinedMd5: true } : {};

    Logger.debug(`Making PUT request to: ${publishUrl}`);

    try {
      const response = await axios.put(publishUrl, null, {
        headers,
        params,
        timeout: this.TIMEOUT,
      });

      return {
        message: (response.data as any)?.message || "Successfully published",
      };
    } catch (error: any) {
      // Extract error details from Axios response if available
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        throw new ConductorError(
          `Publishing failed with status ${status}: ${
            data?.message || "Unknown error"
          }`,
          ErrorCodes.CONNECTION_ERROR,
          {
            status,
            responseData: data,
          }
        );
      }

      throw new ConductorError(
        `Failed to publish with REST API: ${error.message}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Checks if the Docker Song client is available
   *
   * @returns Promise<boolean> indicating if the Docker Song client is available
   */
  private async checkIfDockerSongClientAvailable(): Promise<boolean> {
    try {
      // Check if Docker is available
      await execPromise("docker --version");

      // Check if song-client container is running
      await execPromise("docker ps -q -f name=song-client");

      return true;
    } catch (error) {
      Logger.debug("Docker Song client not detected, will use REST API");
      return false;
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
