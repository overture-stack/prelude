// src/commands/songCreateStudyCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongStudyCreateParams } from "../services/song-score/types";

/**
 * Command for creating studies in SONG service
 * Refactored to use the new SongService with error factory pattern
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
        throw ErrorFactory.args(`${param.name} is required`, [
          `Use --${param.key.replace(/([A-Z])/g, "-$1").toLowerCase()} option`,
          `Set ${param.envVar} environment variable`,
          "Example: --study-id my-study --study-name 'My Study'",
        ]);
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
      retries: 1,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Log creation information
   */
  private logCreationInfo(params: SongStudyCreateParams, url: string): void {
    Logger.info`${chalk.bold.cyan("Creating Study in SONG:")}`;
    Logger.infoString(`URL: ${url}/studies/${params.studyId}/`);
    Logger.infoString(`Study ID: ${params.studyId}`);
    Logger.infoString(`Study Name: ${params.name}`);
    Logger.infoString(`Organization: ${params.organization}`);
  }

  /**
   * Log successful creation
   */
  private logSuccess(result: any): void {
    Logger.successString("Study created successfully");
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

    if (errorMessage.includes("409") || errorMessage.includes("conflict")) {
      const conflictError = ErrorFactory.validation(
        "Study already exists",
        { originalError: error },
        [
          "Use --force flag to overwrite existing study",
          "Choose a different study ID",
          "Check if study creation is actually needed",
        ]
      );

      return {
        success: false,
        errorMessage: conflictError.message,
        errorCode: conflictError.code,
        details: conflictError.details,
      };
    }

    // Generic fallback
    const genericError = ErrorFactory.connection(
      "Study creation failed",
      { originalError: error },
      [
        "Check SONG service availability",
        "Verify study parameters are valid",
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
