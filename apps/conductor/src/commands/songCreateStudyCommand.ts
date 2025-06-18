// src/commands/songCreateStudyCommand.ts - FIXED: Proper error handling for study creation
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongStudyCreateParams } from "../services/song-score/types";

/**
 * Command for creating studies in SONG service
 * FIXED: Enhanced error handling for study conflicts and validation
 */
export class SongCreateStudyCommand extends Command {
  constructor() {
    super("SONG Study Creation");
  }

  /**
   * Executes the SONG study creation process
   * FIXED: Better error detection and logging
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
      Logger.debug`Checking SONG service health at ${serviceConfig.url}`;
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

      Logger.debug`SONG service health check passed`;

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
   * SIMPLIFIED: Only study ID is required, name is optional
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Validate required parameters - only study ID and basic service info
    const requiredParams = [
      { key: "songUrl", name: "SONG URL", envVar: "SONG_URL" },
      { key: "studyId", name: "Study ID", envVar: "STUDY_ID" },
      { key: "organization", name: "Organization", envVar: "ORGANIZATION" },
    ];

    for (const param of requiredParams) {
      const value = options[param.key] || process.env[param.envVar];
      if (!value) {
        throw ErrorFactory.args(`${param.name} is required`, [
          `Use --${param.key.replace(/([A-Z])/g, "-$1").toLowerCase()} option`,
          `Set ${param.envVar} environment variable`,
          "Example: --study-id my-study --organization MyOrg",
        ]);
      }
    }
  }

  /**
   * Extract study parameters from options
   * SIMPLIFIED: Study ID is required with no defaults, name defaults to study ID if not provided
   */
  private extractStudyParams(options: any): SongStudyCreateParams {
    const studyId = options.studyId || process.env.STUDY_ID;

    // Study ID is required - no default value
    if (!studyId) {
      throw ErrorFactory.args("Study ID is required", [
        "Use -i or --study-id to specify the study identifier",
        "Set STUDY_ID environment variable",
        "Example: -i my-study",
      ]);
    }

    const studyName = options.name || studyId; // Use study ID as default name

    return {
      studyId: studyId,
      name: studyName,
      organization: options.organization || process.env.ORGANIZATION || "OICR",
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
   * SIMPLIFIED: Show study ID as primary identifier
   */
  private logCreationInfo(params: SongStudyCreateParams, url: string): void {
    Logger.generic("");
    Logger.info`Creating Study: ${params.studyId}`;
    Logger.debug`URL: ${url}/studies/${params.studyId}/`;
    Logger.debug`Study ID: ${params.studyId}`;
    Logger.debug`Display Name: ${params.name}`;
    Logger.debug`Organization: ${params.organization}`;

    // Only log if custom name was provided
    if (params.studyId !== params.name) {
      Logger.debug`Custom display name provided: ${params.name}`;
    }
  }

  /**
   * Log successful creation
   * SIMPLIFIED: Focus on study ID as primary identifier
   */
  private logSuccess(result: any): void {
    Logger.successString(`Study "${result.studyId}" created successfully`);
    Logger.generic(chalk.gray(`    - Study ID: ${result.studyId}`));
    Logger.generic(chalk.gray(`    - Display Name: ${result.name}`));
    Logger.generic(chalk.gray(`    - Organization: ${result.organization}`));
  }

  /**
   * Handle execution errors with helpful user feedback
   * FIXED: Enhanced error detection and logging
   */
  private handleExecutionError(error: unknown): CommandResult {
    // If it's already a ConductorError, preserve it and ensure it gets logged
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;

      Logger.debug`ConductorError detected - Message: ${conductorError.message}`;
      Logger.debug`ConductorError code: ${conductorError.code}`;

      // Log the error using Logger
      Logger.errorString(conductorError.message);

      // Display suggestions if available
      if (conductorError.suggestions && conductorError.suggestions.length > 0) {
        Logger.suggestion("Suggestions");
        conductorError.suggestions.forEach((suggestion: string) => {
          Logger.tipString(suggestion);
        });
      }

      return {
        success: false,
        errorMessage: conductorError.message,
        errorCode: conductorError.code,
        details: conductorError.details,
      };
    }

    // Handle unexpected errors with categorization
    const errorMessage = error instanceof Error ? error.message : String(error);

    Logger.debug`Handling unexpected error: ${errorMessage}`;

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

      // Log the error
      Logger.errorString(connectionError.message);
      if (connectionError.suggestions) {
        Logger.suggestion("Suggestions");
        connectionError.suggestions.forEach((suggestion: string) => {
          Logger.tipString(suggestion);
        });
      }

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

      // Log the error
      Logger.errorString(authError.message);
      if (authError.suggestions) {
        Logger.suggestion("Suggestions");
        authError.suggestions.forEach((suggestion: string) => {
          Logger.tipString(suggestion);
        });
      }

      return {
        success: false,
        errorMessage: authError.message,
        errorCode: authError.code,
        details: authError.details,
      };
    }

    if (
      errorMessage.includes("409") ||
      errorMessage.includes("conflict") ||
      errorMessage.includes("already.exists")
    ) {
      const conflictError = ErrorFactory.validation(
        "Study already exists",
        { originalError: error },
        [
          "Use --force flag to overwrite existing study",
          "Choose a different study ID",
          "Check if study creation is actually needed",
        ]
      );

      // Log the error
      Logger.errorString(conflictError.message);
      if (conflictError.suggestions) {
        Logger.suggestion("Suggestions");
        conflictError.suggestions.forEach((suggestion: string) => {
          Logger.tipString(suggestion);
        });
      }

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

    // Log the error
    Logger.errorString(genericError.message);
    if (genericError.suggestions) {
      Logger.suggestion("Suggestions");
      genericError.suggestions.forEach((suggestion: string) => {
        Logger.tipString(suggestion);
      });
    }

    return {
      success: false,
      errorMessage: genericError.message,
      errorCode: genericError.code,
      details: genericError.details,
    };
  }
}
