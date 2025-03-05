import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorCodes } from "../utils/errors";

const execPromise = promisify(exec);

/**
 * Simplified Score Manifest Upload Command
 * Uses Docker Score client for file uploads and SONG client for manifest generation
 */
export class ScoreManifestUploadCommand extends Command {
  constructor() {
    super("Score Manifest Upload");
    this.defaultOutputFileName = "manifest.txt";
    this.defaultOutputPath = "./output";
  }

  /**
   * Executes the Score manifest upload process using score-client and song-client
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, options } = cliOutput;

    try {
      // Validate config sections exist
      if (!config?.score) {
        throw new ConductorError(
          "Score configuration is missing.",
          ErrorCodes.INVALID_ARGS
        );
      }

      // Extract configuration
      const analysisId = config.score.analysisId;
      const outputDir = config.score.outputDir || "./output";
      const dataDir = config.score.dataDir || "./data"; // Add this line
      const manifestFile = path.join(outputDir, "manifest.txt");

      // Validate required parameters
      if (!analysisId) {
        throw new ConductorError(
          "Analysis ID not specified. Use --analysis-id or set ANALYSIS_ID environment variable.",
          ErrorCodes.INVALID_ARGS
        );
      }

      // Create output directory if it doesn't exist
      this.createDirectoryIfNotExists(outputDir);

      // Step 1: Generate manifest file using SONG client
      Logger.info(`\x1b[1;36mGenerating Manifest with SONG Client:\x1b[0m`);
      await this.generateManifestWithSongClient(
        analysisId,
        manifestFile,
        dataDir
      ); // Pass dataDir here
      Logger.success(`Successfully generated manifest`);

      // Step 2: Upload using score-client in Docker
      Logger.info(`\x1b[1;36mUploading Files with Score Client:\x1b[0m`);
      await this.uploadWithScoreClient(manifestFile);

      // Log success details
      Logger.success(`Successfully uploaded files`);
      Logger.generic(" ");
      Logger.generic(`    - Analysis ID: ${analysisId}`);
      Logger.generic(`    - Manifest file: ${manifestFile}`);
      Logger.generic(" ");

      return {
        success: true,
        details: {
          analysisId,
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

      Logger.error(`Score Manifest Upload failed: ${errorMessage}`);

      throw new ConductorError(
        `Score Manifest Upload failed: ${errorMessage}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Generate manifest file using SONG client via Docker
   */
  private async generateManifestWithSongClient(
    analysisId: string,
    manifestFile: string,
    dataDir: string
  ): Promise<void> {
    try {
      // Construct Docker song-client manifest command
      const command = [
        "docker exec",
        "song-client",
        "sh -c",
        `"sing manifest -a ${analysisId} -f ${manifestFile} -d ${dataDir}"`,
      ].join(" ");

      Logger.info(`Executing: ${command}`);

      // Execute the command
      const { stdout, stderr } = await execPromise(command);

      // Log output
      if (stdout) Logger.info(stdout);
      if (stderr) Logger.warn(stderr);
    } catch (error: any) {
      // Handle execution errors
      Logger.error("SONG client manifest generation failed:");

      if (error.stdout) Logger.error(error.stdout);
      if (error.stderr) Logger.error(error.stderr);

      throw new ConductorError(
        `SONG client manifest generation failed: ${
          error.message || "Unknown error"
        }`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Upload files using score-client via Docker
   */
  private async uploadWithScoreClient(manifestFile: string): Promise<void> {
    try {
      // Construct Docker score-client upload command
      const command = [
        "docker exec",
        "score-client",
        "sh -c",
        `"score-client upload --manifest ${manifestFile}"`,
      ].join(" ");

      Logger.info(`Executing: ${command}`);

      // Execute the command
      const { stdout, stderr } = await execPromise(command);

      // Log output
      if (stdout) Logger.info(stdout);
      if (stderr) Logger.warn(stderr);
    } catch (error: any) {
      // Handle execution errors
      Logger.error("Score client upload failed:");

      if (error.stdout) Logger.error(error.stdout);
      if (error.stderr) Logger.error(error.stderr);

      throw new ConductorError(
        `Score client upload failed: ${error.message || "Unknown error"}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Validates command line arguments
   */
  protected async validate(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;
    const analysisId = options.analysisId || process.env.ANALYSIS_ID;

    if (!analysisId) {
      return {
        success: false,
        errorMessage:
          "No analysis ID provided. Use --analysis-id or set ANALYSIS_ID environment variable.",
        errorCode: ErrorCodes.INVALID_ARGS,
      };
    }

    return { success: true };
  }
}
