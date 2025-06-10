// src/commands/songCreateStudyCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongStudyCreateParams } from "../services/song-score/types";

/**
 * Command for creating studies in SONG service
 * Refactored to use the new SongService
 */
export class SongCreateStudyCommand extends Command {
  constructor() {
    super("SONG Study Creation");
  }

  /**
   * Executes the SONG study creation process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration
      const studyParams = this.extractStudyParams(options);
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

      // Log creation info
      this.logCreationInfo(studyParams, serviceConfig.url);

      // Create study
      const result = await songService.createStudy(studyParams);

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

    // Validate required parameters
    const requiredParams = [
      { key: "songUrl", name: "SONG URL", envVar: "SONG_URL" },
      { key: "studyId", name: "Study ID", envVar: "STUDY_ID" },
      { key: "studyName", name: "Study name", envVar: "STUDY_NAME" },
      { key: "organization", name: "Organization", envVar: "ORGANIZATION" },
    ];

    for (const param of requiredParams) {
      const value = options[param.key] || process.env[param.envVar];
      if (!value) {
        throw new ConductorError(
          `${param.name} is required. Use --${param.key
            .replace(/([A-Z])/g, "-$1")
            .toLowerCase()} or set ${param.envVar} environment variable.`,
          ErrorCodes.INVALID_ARGS
        );
      }
    }
  }

  /**
   * Extract study parameters from options
   */
  private extractStudyParams(options: any): SongStudyCreateParams {
    return {
      studyId: options.studyId || process.env.STUDY_ID || "demo",
      name: options.studyName || process.env.STUDY_NAME || "string",
      organization:
        options.organization || process.env.ORGANIZATION || "string",
      description: options.description || process.env.DESCRIPTION || "string",
      force: options.force || false,
    };
  }

  /**
   * Extract service configuration from options
   */
  private extractServiceConfig(options: any) {
    return {
      url: options.songUrl || process.env.SONG_URL || "http://localhost:8080",
      timeout: 10000,
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Log creation information
   */
  private logCreationInfo(params: SongStudyCreateParams, url: string): void {
    Logger.info(`${chalk.bold.cyan("Creating Study in SONG:")}`);
    Logger.info(`URL: ${url}/studies/${params.studyId}/`);
    Logger.info(`Study ID: ${params.studyId}`);
    Logger.info(`Study Name: ${params.name}`);
    Logger.info(`Organization: ${params.organization}`);
  }

  /**
   * Log successful creation
   */
  private logSuccess(result: any): void {
    Logger.success("Study created successfully");
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    - Study ID: ${result.studyId}`));
    Logger.generic(chalk.gray(`    - Study Name: ${result.name}`));
    Logger.generic(chalk.gray(`    - Organization: ${result.organization}`));
    Logger.generic(chalk.gray(`    - Status: ${result.status}`));
    Logger.generic(" ");
  }

  /**
   * Handle execution errors with helpful user feedback
   */
  private handleExecutionError(error: unknown): CommandResult {
    if (error instanceof ConductorError) {
      // Add context-specific help for common errors
      if (error.code === ErrorCodes.CONNECTION_ERROR) {
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
      errorMessage: `Study creation failed: ${errorMessage}`,
      errorCode: ErrorCodes.CONNECTION_ERROR,
      details: { originalError: error },
    };
  }
}
