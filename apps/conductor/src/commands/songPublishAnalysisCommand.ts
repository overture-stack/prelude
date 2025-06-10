// src/commands/songPublishAnalysisCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongPublishParams } from "../services/song-score/types";

/**
 * Command for publishing analyses in SONG service
 * Refactored to use the new SongService
 */
export class SongPublishAnalysisCommand extends Command {
  constructor() {
    super("SONG Analysis Publication");
  }

  /**
   * Executes the SONG analysis publication process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration
      const publishParams = this.extractPublishParams(options);
      const serviceConfig = this.extractServiceConfig(options);

      // Create service instance
      const songService = new SongService(serviceConfig);

      // Check service health
      const healthResult = await songService.checkHealth();
      if (!healthResult.healthy) {
        throw new ConductorError(
          `SONG service is not healthy: ${
            healthResult.message || "Unknown error"
          }`,
          ErrorCodes.CONNECTION_ERROR,
          { healthResult }
        );
      }

      // Log publication info
      this.logPublicationInfo(publishParams, serviceConfig.url);

      // Publish analysis
      const result = await songService.publishAnalysis(publishParams);

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
   * Validates command line arguments
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Validate analysis ID
    const analysisId = this.getAnalysisId(options);
    if (!analysisId) {
      throw new ConductorError(
        "Analysis ID not specified. Use --analysis-id or set ANALYSIS_ID environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate SONG URL
    const songUrl = this.getSongUrl(options);
    if (!songUrl) {
      throw new ConductorError(
        "SONG URL not specified. Use --song-url or set SONG_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }

  /**
   * Extract publish parameters from options
   */
  private extractPublishParams(options: any): SongPublishParams {
    return {
      analysisId: this.getAnalysisId(options)!,
      studyId: options.studyId || process.env.STUDY_ID || "demo",
      ignoreUndefinedMd5: options.ignoreUndefinedMd5 || false,
    };
  }

  /**
   * Extract service configuration from options
   */
  private extractServiceConfig(options: any) {
    return {
      url: this.getSongUrl(options)!,
      timeout: 10000,
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  private getAnalysisId(options: any): string | undefined {
    return options.analysisId || process.env.ANALYSIS_ID;
  }

  private getSongUrl(options: any): string | undefined {
    return options.songUrl || process.env.SONG_URL;
  }

  /**
   * Log publication information
   */
  private logPublicationInfo(params: SongPublishParams, url: string): void {
    Logger.info(`${chalk.bold.cyan("Publishing Analysis in SONG:")}`);
    Logger.info(
      `URL: ${url}/studies/${params.studyId}/analysis/publish/${params.analysisId}`
    );
    Logger.info(`Analysis ID: ${params.analysisId}`);
    Logger.info(`Study ID: ${params.studyId}`);
  }

  /**
   * Log successful publication
   */
  private logSuccess(result: any): void {
    Logger.success("Analysis published successfully");
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    - Analysis ID: ${result.analysisId}`));
    Logger.generic(chalk.gray(`    - Study ID: ${result.studyId}`));
    Logger.generic(chalk.gray(`    - Status: ${result.status}`));
    Logger.generic(" ");
  }

  /**
   * Handle execution errors with helpful user feedback
   */
  private handleExecutionError(error: unknown): CommandResult {
    if (error instanceof ConductorError) {
      // Add context-specific help for common errors
      if (error.code === ErrorCodes.FILE_NOT_FOUND) {
        Logger.tip(
          "Make sure the analysis ID exists and belongs to the specified study"
        );
      } else if (error.code === ErrorCodes.CONNECTION_ERROR) {
        Logger.info("\nConnection error. Check SONG service availability.");
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
      errorMessage: `Analysis publication failed: ${errorMessage}`,
      errorCode: ErrorCodes.CONNECTION_ERROR,
      details: { originalError: error },
    };
  }
}
