import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorCodes } from "../utils/errors";

// Use require for Node.js built-in modules to avoid TypeScript import issues
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const util = require("util");
const axios = require("axios");

// Create a promisified version of exec
const execPromise = util.promisify(childProcess.exec);

/**
 * Command for generating manifests and uploading files with Score
 * Uses Docker containers for song-client and score-client if available
 */
export class ScoreManifestUploadCommand extends Command {
  private readonly SONG_EXEC_TIMEOUT = 60000; // 60 seconds
  private readonly SCORE_EXEC_TIMEOUT = 300000; // 5 minutes for larger uploads

  constructor() {
    super("Score Manifest Upload");
    this.defaultOutputFileName = "manifest.txt";
    this.defaultOutputPath = "./output";
  }

  /**
   * Executes the Score manifest upload process using song-client and score-client
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, options } = cliOutput;

    try {
      // Extract configuration
      const analysisId =
        options.analysisId ||
        config.score?.analysisId ||
        (process?.env?.ANALYSIS_ID as string | undefined);
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
        "./data";
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
      if (!analysisId) {
        throw new ConductorError(
          "Analysis ID not specified. Use --analysis-id or set ANALYSIS_ID environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      // Create output directory if it doesn't exist
      this.createDirectoryIfNotExists(path.dirname(manifestFile));

      // Log the configuration
      Logger.info(`\x1b[1;36mScore Manifest Upload Configuration:\x1b[0m`);
      Logger.info(`Analysis ID: ${analysisId}`);
      Logger.info(`Song URL: ${songUrl}`);
      Logger.info(`Score URL: ${scoreUrl}`);
      Logger.info(`Data Directory: ${dataDir}`);
      Logger.info(`Output Directory: ${outputDir}`);
      Logger.info(`Manifest File: ${manifestFile}`);

      // Check if Docker is available and containers are running
      const useSongDocker = await this.checkIfDockerContainerRunning(
        "song-client"
      );
      const useScoreDocker = await this.checkIfDockerContainerRunning(
        "score-client"
      );

      // Step 1: Generate manifest file
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

      // Step 2: Upload files using the manifest
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

      // Verify manifest file contents
      let manifestContent = "";
      try {
        manifestContent = fs.readFileSync(manifestFile, "utf8");
        Logger.debug(`Manifest file content: \n${manifestContent}`);
      } catch (error) {
        Logger.warn(
          `Could not read manifest file: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Log success details
      Logger.success(`Successfully uploaded files with Score`);
      Logger.generic(" ");
      Logger.generic(`    - Analysis ID: ${analysisId}`);
      Logger.generic(`    - Manifest file: ${manifestFile}`);
      Logger.generic(" ");

      return {
        success: true,
        details: {
          analysisId,
          manifestFile,
          manifestContent: manifestContent || "Manifest content not available",
        },
      };
    } catch (error) {
      // Handle and log errors
      if (error instanceof ConductorError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      Logger.error(`Score Manifest Upload failed: ${errorMessage}`);

      throw new ConductorError(
        `Score Manifest Upload failed: ${errorMessage}`,
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
   * Generate manifest file using SONG client via Docker
   */
  /**
   * Generate manifest file using SONG client via Docker
   */
  /**
   * Generate manifest file using SONG client via Docker
   */
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

      // Check if manifest file exists after generation (using local path)
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
   * Generate manifest file directly without using Song client
   * This creates a manifest based on the analysis information retrieved from the SONG API
   */
  /**
   * Generate manifest file directly without using Song client
   * This creates a manifest based on the analysis information retrieved from the SONG API
   */
  private async generateManifestDirect(
    analysisId: string,
    manifestFile: string,
    dataDir: string,
    authToken: string,
    songUrl: string
  ): Promise<void> {
    try {
      // 1. Get analysis details from SONG API
      Logger.info(`Fetching analysis ${analysisId} details from SONG API`);

      // Remove trailing slash from URL if present
      const baseUrl = songUrl.endsWith("/") ? songUrl.slice(0, -1) : songUrl;

      // We need to find the study ID for this analysis (it's required for the SONG API)
      // First, try the studies/all endpoint to get all studies
      const studies = await this.fetchAllStudies(baseUrl, authToken);

      if (!studies || studies.length === 0) {
        throw new ConductorError(
          "No studies found in SONG server",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      Logger.debug(`Found ${studies.length} studies on SONG server`);

      // We need to look through studies to find which one contains our analysis
      let studyId = null;
      let analysis = null;

      for (const study of studies) {
        try {
          // Try to fetch the analysis from this study
          Logger.debug(`Checking study ${study} for analysis ${analysisId}`);
          const url = `${baseUrl}/studies/${study}/analysis/${analysisId}`;

          const response = await axios.get(url, {
            headers: {
              Accept: "application/json",
              Authorization: authToken.startsWith("Bearer ")
                ? authToken
                : `Bearer ${authToken}`,
            },
          });

          if (response.status === 200) {
            studyId = study;
            analysis = response.data;
            Logger.info(`Found analysis ${analysisId} in study ${studyId}`);
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

        // Use absolute path format for the container
        // Convert from local path to container path
        const containerFilePath = `/data/fileData/${fileName}`;

        // Add file entry with the correct format
        manifestContent += `${objectId}\t${containerFilePath}\t${fileMd5sum}\n`;
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
      const response = await axios.get(url, {
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

      return response.data;
    } catch (error: any) {
      throw new ConductorError(
        `Failed to fetch studies: ${error.message || "Unknown error"}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Update the validate method to throw errors directly
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;
    const analysisId =
      options.analysisId ||
      cliOutput.config.score?.analysisId ||
      (process?.env?.ANALYSIS_ID as string | undefined);
    const dataDir =
      options.dataDir ||
      cliOutput.config.score?.dataDir ||
      process?.env?.DATA_DIR ||
      "./data/fileData";

    // Validate analysis ID
    if (!analysisId) {
      throw new ConductorError(
        "No analysis ID provided. Use --analysis-id option or set ANALYSIS_ID environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Verify data directory exists
    if (!fs.existsSync(dataDir)) {
      throw new ConductorError(
        `Data directory not found: ${dataDir}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Check if Docker is available
    try {
      await execPromise("docker --version");
    } catch (error) {
      Logger.warn(
        `Docker not available. This command requires Docker with song-client and score-client containers.`
      );
      Logger.tip(
        `Install Docker and start the required containers before running this command.`
      );
      throw new ConductorError(
        "Docker is required for this command",
        ErrorCodes.INVALID_ARGS,
        {
          suggestion:
            "Install Docker and ensure song-client and score-client containers are running",
        }
      );
    }
  }
}
