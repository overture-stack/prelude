import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorCodes } from "../utils/errors";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);

/**
 * Command for submitting analysis to SONG, generating a manifest, and uploading files to SCORE in one operation
 */
export class SongScoreSubmitCommand extends Command {
  private readonly SONG_EXEC_TIMEOUT = 60000; // 60 seconds
  private readonly SCORE_EXEC_TIMEOUT = 300000; // 5 minutes for larger uploads
  private readonly TIMEOUT = 10000; // 10 seconds

  constructor() {
    super("SONG/SCORE Analysis Submission");
    this.defaultOutputFileName = "manifest.txt";
    this.defaultOutputPath = "./output";
  }

  /**
   * Executes the combined SONG/SCORE submission process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, options } = cliOutput;

    try {
      // Extract configuration
      const analysisPath =
        options.analysisPath ||
        config.song?.analysisPath ||
        process?.env?.ANALYSIS_PATH ||
        "./analysis.json";

      const studyId =
        options.studyId ||
        config.song?.studyId ||
        process?.env?.STUDY_ID ||
        "demo";

      const songUrl =
        options.songUrl ||
        config.song?.url ||
        process?.env?.SONG_URL ||
        "http://localhost:8080";

      const scoreUrl =
        options.scoreUrl ||
        config.score?.url ||
        process?.env?.SCORE_URL ||
        "http://localhost:8087";

      const dataDir =
        options.dataDir ||
        config.score?.dataDir ||
        process?.env?.DATA_DIR ||
        "./data/fileData";

      const outputDir =
        options.outputDir ||
        config.score?.outputDir ||
        process?.env?.OUTPUT_DIR ||
        "./output";

      const manifestFile =
        options.manifestFile ||
        config.score?.manifestFile ||
        process?.env?.MANIFEST_FILE ||
        path.join(outputDir, "manifest.txt");

      const authToken =
        options.authToken ||
        config.score?.authToken ||
        config.song?.authToken ||
        process?.env?.AUTH_TOKEN ||
        "123";

      // Validate required parameters
      if (!fs.existsSync(analysisPath)) {
        throw new ConductorError(
          `Analysis file not found at: ${analysisPath}`,
          ErrorCodes.FILE_NOT_FOUND
        );
      }

      // Create output directory if it doesn't exist
      this.createDirectoryIfNotExists(path.dirname(manifestFile));

      // Log the configuration
      Logger.info(`\x1b[1;36mSONG/SCORE Submission Configuration:\x1b[0m`);
      Logger.info(`Analysis File: ${analysisPath}`);
      Logger.info(`Study ID: ${studyId}`);
      Logger.info(`Song URL: ${songUrl}`);
      Logger.info(`Score URL: ${scoreUrl}`);
      Logger.info(`Data Directory: ${dataDir}`);
      Logger.info(`Output Directory: ${outputDir}`);
      Logger.info(`Manifest File: ${manifestFile}`);

      // STEP 1: Submit analysis to SONG and get analysis ID
      Logger.info(`\x1b[1;36mSubmitting Analysis to SONG:\x1b[0m`);
      const analysisId = await this.submitAnalysisToSong(
        analysisPath,
        studyId,
        songUrl,
        authToken
      );
      Logger.success(`Successfully submitted analysis with ID: ${analysisId}`);

      // Check if Docker containers are available
      const useSongDocker = await this.checkIfDockerContainerRunning(
        "song-client"
      );
      const useScoreDocker = await this.checkIfDockerContainerRunning(
        "score-client"
      );

      // STEP 2: Generate manifest file
      Logger.info(`\x1b[1;36mGenerating Manifest:\x1b[0m`);
      if (useSongDocker) {
        Logger.info(`Using Song Docker client to generate manifest`);
        await this.generateManifestWithSongClient(
          analysisId,
          manifestFile,
          dataDir,
          authToken,
          songUrl
        );
      } else {
        Logger.info(`Using direct manifest generation approach`);
        await this.generateManifestDirect(
          analysisId,
          manifestFile,
          dataDir,
          authToken,
          songUrl
        );
      }
      Logger.success(`Successfully generated manifest at ${manifestFile}`);

      // STEP 3: Upload files using the manifest
      Logger.info(`\x1b[1;36mUploading Files with Score:\x1b[0m`);
      if (useScoreDocker) {
        Logger.info(`Using Score Docker client to upload files`);
        await this.uploadWithScoreClient(manifestFile, authToken, scoreUrl);
      } else {
        Logger.warn(
          `Direct file upload without Score client is not recommended.`
        );
        Logger.info(
          `Please install and run the score-client Docker container for reliable uploads.`
        );
        throw new ConductorError(
          "Direct file upload requires Score client. Please ensure score-client Docker container is running.",
          ErrorCodes.INVALID_ARGS
        );
      }
      Logger.success(`Successfully uploaded files with Score`);

      // STEP 4: Publish the analysis
      Logger.info(`\x1b[1;36mPublishing Analysis:\x1b[0m`);
      await this.publishAnalysis(studyId, analysisId, songUrl, authToken);
      Logger.success(`Successfully published analysis ${analysisId}`);

      // Log success details
      Logger.generic(" ");
      Logger.generic(`    - Analysis ID: ${analysisId}`);
      Logger.generic(`    - Study ID: ${studyId}`);
      Logger.generic(`    - Manifest file: ${manifestFile}`);
      Logger.generic(" ");

      return {
        success: true,
        details: {
          analysisId,
          studyId,
          manifestFile,
        },
      };
    } catch (error) {
      // Handle and log errors
      if (error instanceof ConductorError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      Logger.error(`SONG/SCORE submission failed: ${errorMessage}`);

      throw new ConductorError(
        `SONG/SCORE submission failed: ${errorMessage}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Submit analysis to SONG and get the analysis ID
   */
  private async submitAnalysisToSong(
    analysisPath: string,
    studyId: string,
    songUrl: string,
    authToken: string
  ): Promise<string> {
    try {
      // Read analysis file
      const analysisData = JSON.parse(fs.readFileSync(analysisPath, "utf8"));

      // Normalize URL
      const baseUrl = songUrl.endsWith("/") ? songUrl.slice(0, -1) : songUrl;
      const submitUrl = `${baseUrl}/submit/${studyId}`;

      Logger.info(`Submitting analysis to: ${submitUrl}`);

      // Make the request
      const response = await axios.post(submitUrl, analysisData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken.startsWith("Bearer ")
            ? authToken
            : `Bearer ${authToken}`,
        },
      });

      // Extract analysis ID from response
      const responseData = response.data as { analysisId?: string };
      let analysisId;

      if (responseData && responseData.analysisId) {
        analysisId = responseData.analysisId;
      } else if (typeof response.data === "string") {
        // Try to extract from string response
        const match = response.data.match(/"analysisId"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          analysisId = match[1];
        }
      }

      if (!analysisId) {
        throw new Error("No analysis ID returned from SONG API");
      }

      return analysisId;
    } catch (error: any) {
      Logger.error(`Analysis submission failed`);

      // More detailed error logging
      if (error.response) {
        // Server responded with a status code outside of 2xx range
        Logger.error(`Status: ${error.response.status}`);
        Logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // Request was made but no response received
        Logger.error(`No response received: ${error.request}`);
      } else {
        // Something happened in setting up the request
        Logger.error(`Error: ${error.message}`);
      }

      throw new ConductorError(
        `Failed to submit analysis: ${
          error.response?.data?.message || error.message || "Unknown error"
        }`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  // For the error at line 143 (6 arguments instead of 5)
  private async generateManifestWithSongClient(
    analysisId: string,
    manifestFile: string,
    dataDir: string,
    authToken: string,
    songUrl: string
  ): Promise<void> {
    try {
      // Convert local paths to container paths
      const containerManifestPath = "/output/manifest.txt";
      const containerDataDir = "/data/fileData";

      // Construct Docker song-client manifest command
      const command = [
        `docker exec`,
        `song-client`,
        `sh -c "sing manifest -a ${analysisId} -f ${containerManifestPath} -d ${containerDataDir}"`,
      ].join(" ");

      Logger.debug(`Executing: ${command}`);

      // Execute the command
      const { stdout, stderr } = await execPromise(command, {
        timeout: this.SONG_EXEC_TIMEOUT,
      });

      // Log output
      if (stdout) Logger.debug(`SONG manifest stdout: ${stdout}`);
      if (stderr) Logger.warn(`SONG manifest stderr: ${stderr}`);

      // Check if manifest file exists after generation
      if (!fs.existsSync(manifestFile)) {
        throw new ConductorError(
          `Manifest file not generated at expected path: ${manifestFile}`,
          ErrorCodes.FILE_NOT_FOUND
        );
      }

      // Log manifest file content
      const manifestContent = fs.readFileSync(manifestFile, "utf8");
      Logger.debug(`Generated manifest content: \n${manifestContent}`);
    } catch (error: any) {
      // Handle execution errors
      Logger.error(`SONG client manifest generation failed`);

      if (error.stdout) Logger.debug(`Stdout: ${error.stdout}`);
      if (error.stderr) Logger.debug(`Stderr: ${error.stderr}`);

      throw new ConductorError(
        `Failed to generate manifest: ${error.message || "Unknown error"}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  // For the error at line 413 (files property not existing)
  private async generateManifestDirect(
    analysisId: string,
    manifestFile: string,
    dataDir: string,
    authToken: string,
    songUrl: string
  ): Promise<void> {
    try {
      // Typed interface for analysis response
      interface AnalysisResponse {
        files?: Array<{
          objectId?: string;
          fileName?: string;
          fileMd5sum?: string;
        }>;
        studyId?: string;
        [key: string]: any;
      }

      // Remove trailing slash from URL if present
      const baseUrl = songUrl.endsWith("/") ? songUrl.slice(0, -1) : songUrl;

      // First, try to get all studies
      const studies = await this.fetchAllStudies(baseUrl, authToken);

      if (!studies || studies.length === 0) {
        throw new ConductorError(
          "No studies found in SONG server",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      let analysis: AnalysisResponse | null = null;
      let studyId: string | null = null;

      for (const study of studies) {
        try {
          Logger.debug(`Checking study ${study} for analysis ${analysisId}`);
          const url = `${baseUrl}/studies/${study}/analysis/${analysisId}`;

          const response = await axios.get<AnalysisResponse>(url, {
            headers: {
              Accept: "application/json",
              Authorization: authToken.startsWith("Bearer ")
                ? authToken
                : `Bearer ${authToken}`,
            },
          });

          if (response.status === 200) {
            analysis = response.data;
            studyId = study;
            break;
          }
        } catch (error) {
          // Continue to next study if analysis not found
          continue;
        }
      }

      if (!analysis || !studyId) {
        throw new ConductorError(
          `Analysis ${analysisId} not found in any study`,
          ErrorCodes.CONNECTION_ERROR
        );
      }

      // 2. Extract file information from the analysis
      const files = analysis.files || [];

      if (files.length === 0) {
        throw new ConductorError(
          `No files found in analysis ${analysisId}`,
          ErrorCodes.VALIDATION_FAILED
        );
      }

      Logger.info(`Found ${files.length} files in analysis ${analysisId}`);

      // 3. Generate manifest content with the correct format
      // First line: analysis ID followed by two tabs
      let manifestContent = `${analysisId}\t\t\n`;

      for (const file of files) {
        // Extract required fields
        const objectId = file.objectId;
        const fileName = file.fileName;
        const fileMd5sum = file.fileMd5sum;

        if (!objectId || !fileName || !fileMd5sum) {
          Logger.warn(
            `Missing required fields for file: ${JSON.stringify(file)}`
          );
          continue;
        }

        // Use absolute path for the file in the data directory
        const filePath = path.join(dataDir, fileName);

        // Add file entry with the correct format
        manifestContent += `${objectId}\t${filePath}\t${fileMd5sum}\n`;
      }

      // 4. Write the manifest to file
      Logger.debug(
        `Writing manifest content to ${manifestFile}:\n${manifestContent}`
      );

      // Create directory if it doesn't exist
      const manifestDir = path.dirname(manifestFile);
      if (!fs.existsSync(manifestDir)) {
        fs.mkdirSync(manifestDir, { recursive: true });
      }

      fs.writeFileSync(manifestFile, manifestContent);

      Logger.info(`Successfully generated manifest at ${manifestFile}`);
    } catch (error: any) {
      // Handle errors
      Logger.error(`Direct manifest generation failed`);

      throw new ConductorError(
        `Failed to generate manifest: ${error.message || "Unknown error"}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Fetch all studies from SONG server
   */
  private async fetchAllStudies(
    baseUrl: string,
    authToken: string
  ): Promise<string[]> {
    const url = `${baseUrl}/studies/all`;

    try {
      const response = await axios.get<string[]>(url, {
        headers: {
          Accept: "application/json",
          Authorization: authToken.startsWith("Bearer ")
            ? authToken
            : `Bearer ${authToken}`,
        },
      });

      if (response.status !== 200) {
        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}`
        );
      }

      // Ensure we always return an array of strings
      return Array.isArray(response.data)
        ? response.data
        : [response.data as string];
    } catch (error: any) {
      throw new ConductorError(
        `Failed to fetch studies: ${error.message || "Unknown error"}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Upload files using score-client via Docker
   */
  private async uploadWithScoreClient(
    manifestFile: string,
    authToken: string,
    scoreUrl: string
  ): Promise<void> {
    try {
      // Convert local path to container path
      const containerManifestPath = "/output/manifest.txt";

      // Construct Docker score-client upload command
      const command = [
        `docker exec`,
        `score-client`,
        `sh -c "score-client upload --manifest ${containerManifestPath}"`,
      ].join(" ");

      Logger.debug(`Executing: ${command}`);

      // Execute the command
      const { stdout, stderr } = await execPromise(command, {
        timeout: this.SCORE_EXEC_TIMEOUT,
      });

      // Log output
      if (stdout) Logger.debug(`SCORE upload stdout: ${stdout}`);
      if (stderr) Logger.warn(`SCORE upload stderr: ${stderr}`);
    } catch (error: any) {
      // Handle execution errors
      Logger.error(`Score client upload failed`);

      if (error.stdout) Logger.debug(`Stdout: ${error.stdout}`);
      if (error.stderr) Logger.debug(`Stderr: ${error.stderr}`);

      throw new ConductorError(
        `Failed to upload with Score: ${error.message || "Unknown error"}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
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
  private async publishAnalysis(
    studyId: string,
    analysisId: string,
    songUrl: string,
    authToken: string
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

    Logger.debug(`Making PUT request to: ${publishUrl}`);
    Logger.debug(`Headers: ${JSON.stringify(headers)}`);

    try {
      // Make the PUT request
      // According to the SONG API Swagger spec, the publish endpoint is a PUT request
      // with no request body, and optional ignoreUndefinedMd5 query parameter
      const response = await axios.put(publishUrl, null, {
        headers,
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
   * Check if a Docker container is running
   */
  private async checkIfDockerContainerRunning(
    containerName: string
  ): Promise<boolean> {
    try {
      const command = `docker ps -q -f name=${containerName}`;
      Logger.debug(`Checking if container is running: ${command}`);

      const { stdout } = await execPromise(command);
      return stdout.trim().length > 0;
    } catch (error) {
      Logger.debug(
        `Docker container check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Validates command line arguments
   */
  protected async validate(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;
    const analysisPath =
      options.analysisPath ||
      cliOutput.config.song?.analysisPath ||
      process?.env?.ANALYSIS_PATH ||
      "./analysis.json";

    const dataDir =
      options.dataDir ||
      cliOutput.config.score?.dataDir ||
      process?.env?.DATA_DIR ||
      "./data/fileData";

    // Verify analysis file exists
    if (!fs.existsSync(analysisPath)) {
      return {
        success: false,
        errorMessage: `Analysis file not found: ${analysisPath}`,
        errorCode: ErrorCodes.FILE_NOT_FOUND,
      };
    }

    // Verify data directory exists
    if (!fs.existsSync(dataDir)) {
      return {
        success: false,
        errorMessage: `Data directory not found: ${dataDir}`,
        errorCode: ErrorCodes.FILE_NOT_FOUND,
      };
    }

    return { success: true };
  }
}
