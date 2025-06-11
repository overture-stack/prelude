// src/commands/songPublishAnalysisCommand.ts - Enhanced with ErrorFactory patterns
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongPublishParams } from "../services/song-score/types";

/**
 * Command for publishing analyses in SONG service
 * Enhanced with ErrorFactory patterns for better user feedback
 */
export class SongPublishAnalysisCommand extends Command {
  constructor() {
    super("SONG Analysis Publication");
  }

  /**
   * Enhanced validation with ErrorFactory patterns
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating SONG analysis publication parameters`;

    // Enhanced analysis ID validation
    const analysisId = this.getAnalysisId(options);
    this.validateAnalysisId(analysisId);

    // Enhanced SONG URL validation
    const songUrl = this.getSongUrl(options);
    this.validateSongUrl(songUrl);

    // Enhanced study ID validation
    const studyId = this.getStudyId(options);
    this.validateStudyId(studyId);

    // Validate optional parameters
    this.validateOptionalParameters(options);

    Logger.successString("SONG analysis publication parameters validated");
  }

  /**
   * Executes the SONG analysis publication process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration with enhanced validation
      const publishParams = this.extractPublishParams(options);
      const serviceConfig = this.extractServiceConfig(options);

      // Create service instance
      const songService = new SongService(serviceConfig);

      // Enhanced health check with specific feedback
      Logger.info`Checking SONG service health...`;
      const healthResult = await songService.checkHealth();
      if (!healthResult.healthy) {
        throw ErrorFactory.connection(
          "SONG service health check failed",
          "SONG",
          serviceConfig.url,
          [
            "Check that SONG service is running and accessible",
            `Verify service URL: ${serviceConfig.url}`,
            "Check network connectivity and firewall settings",
            "Review SONG service logs for errors",
            `Test manually: curl ${serviceConfig.url}/isAlive`,
            "Ensure SONG is properly configured and started",
            healthResult.message
              ? `Health check message: ${healthResult.message}`
              : "",
          ].filter(Boolean)
        );
      }

      // Log publication info with enhanced context
      this.logPublicationInfo(publishParams, serviceConfig.url);

      // Publish analysis with enhanced error handling
      Logger.info`Publishing analysis in SONG...`;
      const result = await songService.publishAnalysis(publishParams);

      // Enhanced success logging
      this.logSuccess(result);

      return {
        success: true,
        details: {
          publishParams,
          serviceUrl: serviceConfig.url,
          publicationResult: result,
        },
      };
    } catch (error) {
      return this.handleExecutionError(error, cliOutput);
    }
  }

  /**
   * Enhanced analysis ID validation
   */
  private validateAnalysisId(analysisId: string | undefined): void {
    if (!analysisId) {
      throw ErrorFactory.args(
        "Analysis ID not specified for publication",
        "songPublishAnalysis",
        [
          "Provide analysis ID: conductor songPublishAnalysis --analysis-id analysis-123",
          "Set ANALYSIS_ID environment variable",
          "Analysis ID should be from a previously submitted analysis",
          "Use the ID returned from analysis submission",
        ]
      );
    }

    if (typeof analysisId !== "string" || analysisId.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid analysis ID format",
        { analysisId, type: typeof analysisId },
        [
          "Analysis ID must be a non-empty string",
          "Use the exact ID returned from analysis submission",
          "Check for typos or extra whitespace",
          "Ensure the analysis exists in SONG",
        ]
      );
    }

    // Basic format validation
    if (!/^[a-zA-Z0-9_-]+$/.test(analysisId)) {
      throw ErrorFactory.validation(
        `Analysis ID contains invalid characters: ${analysisId}`,
        { analysisId },
        [
          "Analysis IDs typically contain only letters, numbers, hyphens, and underscores",
          "Check that the ID was copied correctly from submission response",
          "Verify the ID format matches SONG requirements",
        ]
      );
    }

    Logger.debug`Analysis ID validated: ${analysisId}`;
  }

  /**
   * Enhanced SONG URL validation
   */
  private validateSongUrl(songUrl: string | undefined): void {
    if (!songUrl) {
      throw ErrorFactory.config("SONG service URL not configured", "songUrl", [
        "Set SONG URL: conductor songPublishAnalysis --song-url http://localhost:8080",
        "Set SONG_URL environment variable",
        "Verify SONG service is running and accessible",
        "Check network connectivity to SONG service",
      ]);
    }

    // Basic URL format validation
    try {
      const url = new URL(songUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Protocol must be http or https");
      }
      Logger.debug`Using SONG URL: ${songUrl}`;
    } catch (error) {
      throw ErrorFactory.config(
        `Invalid SONG URL format: ${songUrl}`,
        "songUrl",
        [
          "Use a valid URL format: http://localhost:8080",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 8080 for SONG)",
        ]
      );
    }
  }

  /**
   * Enhanced study ID validation
   */
  private validateStudyId(studyId: string): void {
    if (!studyId || typeof studyId !== "string" || studyId.trim() === "") {
      throw ErrorFactory.args(
        "Study ID not specified for analysis publication",
        "songPublishAnalysis",
        [
          "Provide study ID: conductor songPublishAnalysis --study-id my-study",
          "Set STUDY_ID environment variable",
          "Study ID should match the study containing the analysis",
          "Ensure the study exists in SONG",
        ]
      );
    }

    // Basic format validation
    if (!/^[a-zA-Z0-9_-]+$/.test(studyId)) {
      throw ErrorFactory.validation(
        `Study ID contains invalid characters: ${studyId}`,
        { studyId },
        [
          "Study ID must contain only letters, numbers, hyphens, and underscores",
          "Match the study ID used when creating the study",
          "Check for typos or extra characters",
          "Ensure the study exists in SONG",
        ]
      );
    }

    Logger.debug`Study ID validated: ${studyId}`;
  }

  /**
   * Validate optional parameters
   */
  private validateOptionalParameters(options: any): void {
    // Validate auth token if provided
    const authToken = options.authToken || process.env.AUTH_TOKEN;
    if (authToken && typeof authToken === "string" && authToken.trim() === "") {
      Logger.warn`Empty auth token provided - using empty token`;
    }

    // Validate ignore undefined MD5 flag
    if (
      options.ignoreUndefinedMd5 !== undefined &&
      typeof options.ignoreUndefinedMd5 !== "boolean"
    ) {
      Logger.warn`Invalid ignoreUndefinedMd5 value, using false`;
    }

    if (options.ignoreUndefinedMd5) {
      Logger.debug`Publishing with ignoreUndefinedMd5 = true`;
      Logger.tipString(
        "Files with undefined MD5 checksums will be ignored during publication"
      );
    }

    Logger.debug`Optional parameters validated`;
  }

  /**
   * Extract publish parameters from options
   */
  private extractPublishParams(options: any): SongPublishParams {
    return {
      analysisId: this.getAnalysisId(options)!,
      studyId: this.getStudyId(options),
      ignoreUndefinedMd5: options.ignoreUndefinedMd5 || false,
    };
  }

  /**
   * Extract service configuration from options
   */
  private extractServiceConfig(options: any) {
    return {
      url: this.getSongUrl(options)!,
      timeout: 15000, // Longer timeout for publication operations
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Get analysis ID from various sources
   */
  private getAnalysisId(options: any): string | undefined {
    return options.analysisId || process.env.ANALYSIS_ID;
  }

  /**
   * Get SONG URL from various sources
   */
  private getSongUrl(options: any): string | undefined {
    return options.songUrl || process.env.SONG_URL;
  }

  /**
   * Get study ID from various sources
   */
  private getStudyId(options: any): string {
    return options.studyId || process.env.STUDY_ID || "demo";
  }

  /**
   * Enhanced publication information logging
   */
  private logPublicationInfo(
    params: SongPublishParams,
    serviceUrl: string
  ): void {
    Logger.info`${chalk.bold.cyan("SONG Analysis Publication Details:")}`;
    Logger.generic(
      `  Service: ${serviceUrl}/studies/${params.studyId}/analysis/publish/${params.analysisId}`
    );
    Logger.generic(`  Analysis ID: ${params.analysisId}`);
    Logger.generic(`  Study ID: ${params.studyId}`);

    if (params.ignoreUndefinedMd5) {
      Logger.generic(`  Ignore Undefined MD5: ${chalk.yellow("Yes")}`);
    } else {
      Logger.generic(`  Ignore Undefined MD5: No`);
    }
  }

  /**
   * Enhanced success logging with detailed information
   */
  private logSuccess(result: any): void {
    Logger.success`Analysis published successfully in SONG`;
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    ✓ Analysis ID: ${result.analysisId}`));
    Logger.generic(chalk.gray(`    ✓ Study ID: ${result.studyId}`));
    Logger.generic(chalk.gray(`    ✓ Status: ${result.status}`));

    if (result.message) {
      Logger.generic(chalk.gray(`    ✓ Message: ${result.message}`));
    }

    Logger.generic(" ");
    Logger.tipString("Analysis is now published and available for data access");
  }

  /**
   * Enhanced execution error handling with context-specific guidance
   */
  private handleExecutionError(
    error: unknown,
    cliOutput: CLIOutput
  ): CommandResult {
    const options = cliOutput.options;
    const analysisId = this.getAnalysisId(options) || "unknown";
    const studyId = this.getStudyId(options);
    const serviceUrl = this.getSongUrl(options);

    if (error instanceof Error && error.name === "ConductorError") {
      // Add publication context to existing errors
      return {
        success: false,
        errorMessage: error.message,
        errorCode: (error as any).code,
        details: {
          ...(error as any).details,
          analysisId,
          studyId,
          command: "songPublishAnalysis",
          serviceUrl,
        },
      };
    }

    // Handle service-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    let suggestions = [
      "Check SONG service connectivity and availability",
      "Verify analysis exists and is in unpublished state",
      "Ensure study contains the specified analysis",
      "Review SONG service logs for additional details",
      "Use --debug flag for detailed error information",
    ];

    // Add specific suggestions based on error content
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      suggestions.unshift("Analysis or study not found in SONG");
      suggestions.unshift("Verify analysis ID and study ID are correct");
      suggestions.unshift("Check that analysis was successfully submitted");
    } else if (
      errorMessage.includes("409") ||
      errorMessage.includes("conflict")
    ) {
      suggestions.unshift("Analysis may already be published");
      suggestions.unshift("Check analysis status in SONG");
      suggestions.unshift("Published analyses cannot be republished");
    } else if (
      errorMessage.includes("400") ||
      errorMessage.includes("validation")
    ) {
      suggestions.unshift("Publication validation failed");
      suggestions.unshift("Check that all required files are uploaded");
      suggestions.unshift("Verify analysis passed validation checks");
    } else if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("401")
    ) {
      suggestions.unshift("Check authentication token if required");
      suggestions.unshift("Verify API credentials and permissions");
    } else if (
      errorMessage.includes("403") ||
      errorMessage.includes("forbidden")
    ) {
      suggestions.unshift("You may not have permission to publish analyses");
      suggestions.unshift(
        "Check with SONG administrator for publish permissions"
      );
    }

    return {
      success: false,
      errorMessage: `SONG analysis publication failed: ${errorMessage}`,
      errorCode: "CONNECTION_ERROR",
      details: {
        originalError: error,
        analysisId,
        studyId,
        suggestions,
        command: "songPublishAnalysis",
        serviceUrl,
      },
    };
  }
}
