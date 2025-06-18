// src/commands/songPublishAnalysisCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongPublishParams } from "../services/song-score/types";

/**
 * Command for publishing analyses in SONG service
 * Refactored to use the new SongService with error factory pattern
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
        throw ErrorFactory.connection(
          "SONG service is not healthy",
          {
            healthResult,
            serviceUrl: serviceConfig.url,
          },
          [
            "Check that SONG service is running",
            `Verify the service URL: ${serviceConfig.url}`,
            "Check network connectivity",
            "Review service logs for errors",
          ]
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
      throw ErrorFactory.args("Analysis ID not specified", [
        "Use --analysis-id option to specify analysis ID",
        "Set ANALYSIS_ID environment variable",
        "Example: --analysis-id AN123456",
      ]);
    }

    // Validate SONG URL
    const songUrl = this.getSongUrl(options);
    if (!songUrl) {
      throw ErrorFactory.args("SONG URL not specified", [
        "Use --song-url option to specify SONG server URL",
        "Set SONG_URL environment variable",
        "Example: --song-url http://localhost:8080",
      ]);
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
      retries: 1,
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
    Logger.info`${chalk.bold.cyan("Publishing Analysis in SONG:")}`;
    Logger.infoString(
      `URL: ${url}/studies/${params.studyId}/analysis/publish/${params.analysisId}`
    );
    Logger.infoString(`Analysis ID: ${params.analysisId}`);
    Logger.infoString(`Study ID: ${params.studyId}`);
  }

  /**
   * Log successful publication
   */
  private logSuccess(result: any): void {
    Logger.successString("Analysis published successfully");
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
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;
      return {
        success: false,
        errorMessage: conductorError.message,
        errorCode: conductorError.code,
        details: conductorError.details,
      };
    }

    // Handle unexpected errors with categorization
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      const connectionError = ErrorFactory.connection(
        "Failed to connect to SONG service",
        { originalError: error },
        [
          "Check that SONG service is running",
          "Verify the service URL and port",
          "Check network connectivity",
          "Review firewall settings",
        ]
      );

      return {
        success: false,
        errorMessage: connectionError.message,
        errorCode: connectionError.code,
        details: connectionError.details,
      };
    }

    if (errorMessage.includes("401") || errorMessage.includes("403")) {
      const authError = ErrorFactory.auth(
        "Authentication failed with SONG service",
        { originalError: error },
        [
          "Check authentication credentials",
          "Verify API token is valid",
          "Contact administrator for access",
        ]
      );

      return {
        success: false,
        errorMessage: authError.message,
        errorCode: authError.code,
        details: authError.details,
      };
    }

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      const notFoundError = ErrorFactory.validation(
        "Analysis not found",
        { originalError: error },
        [
          "Verify the analysis ID is correct",
          "Check that the analysis exists in the specified study",
          "Ensure the analysis was submitted successfully",
        ]
      );

      return {
        success: false,
        errorMessage: notFoundError.message,
        errorCode: notFoundError.code,
        details: notFoundError.details,
      };
    }

    if (errorMessage.includes("400") || errorMessage.includes("validation")) {
      const validationError = ErrorFactory.validation(
        "Analysis publication validation failed",
        { originalError: error },
        [
          "Check that all files were uploaded successfully",
          "Verify the analysis is in a publishable state",
          "Review analysis validation requirements",
        ]
      );

      return {
        success: false,
        errorMessage: validationError.message,
        errorCode: validationError.code,
        details: validationError.details,
      };
    }

    // Generic fallback
    const genericError = ErrorFactory.connection(
      "Analysis publication failed",
      { originalError: error },
      [
        "Check SONG service availability",
        "Verify analysis and study parameters",
        "Use --debug for detailed error information",
      ]
    );

    return {
      success: false,
      errorMessage: genericError.message,
      errorCode: genericError.code,
      details: genericError.details,
    };
  }
}
