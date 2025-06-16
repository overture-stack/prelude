/**
 * SONG Publish Analysis Command
 *
 * Command for publishing analysis in the SONG service.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { Command } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score/songService";
import { ServiceConfig } from "../services/base/types";

/**
 * Command for publishing analysis in SONG service
 * Enhanced with comprehensive validation and error handling
 */
export class SongPublishAnalysisCommand extends Command {
  constructor() {
    super("SONG Publish Analysis");
  }

  /**
   * Enhanced validation with specific error messages for each parameter
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating SONG analysis publication parameters`;

    // Enhanced validation for each required parameter
    this.validateSongUrl(options);
    this.validateStudyId(options);
    this.validateOptionalParameters(options);

    Logger.successString("SONG analysis publication parameters validated");
  }

  /**
   * Enhanced execution with detailed logging and error handling
   */
  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Extract validated configuration
    const serviceConfig = this.extractServiceConfig(options);
    const studyId = options.studyId || process.env.STUDY_ID;

    Logger.info`Starting SONG analysis publication`;
    Logger.info`Study ID: ${studyId}`;
    Logger.info`SONG URL: ${serviceConfig.url}`;

    // Create service instance with enhanced error handling
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
          "Check that SONG service is running",
          `Verify service URL: ${serviceConfig.url}`,
          "Check network connectivity and firewall settings",
          "Review SONG service logs for errors",
          `Test manually: curl ${serviceConfig.url}/health`,
          healthResult.message
            ? `Health check message: ${healthResult.message}`
            : "",
        ]
      );
    }

    Logger.success`SONG service is healthy`;

    // Publish analysis with enhanced error handling
    Logger.info`Publishing analysis in SONG...`;
    const publishResult = await songService.publishAnalysis(studyId);

    // Enhanced success logging
    this.logPublishSuccess(publishResult, studyId);

    // Command completed successfully
  }

  /**
   * Enhanced SONG URL validation
   */
  private validateSongUrl(options: any): void {
    const songUrl = options.songUrl || process.env.SONG_URL;

    if (!songUrl) {
      throw ErrorFactory.config("SONG service URL not configured", "songUrl", [
        "Set SONG URL: conductor songPublishAnalysis --song-url http://localhost:8080",
        "Set SONG_URL environment variable",
        "Verify SONG service is running and accessible",
        "Check network connectivity to SONG service",
        "Default SONG port is usually 8080",
      ]);
    }

    try {
      const url = new URL(songUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw ErrorFactory.validation(
          `Invalid protocol in SONG URL: ${url.protocol}`,
          { songUrl, protocol: url.protocol },
          [
            "Protocol must be http or https",
            "Use format: http://localhost:8080 or https://song.example.com",
            "Check for typos in the URL",
            "Verify the correct protocol with your administrator",
          ]
        );
      }
      Logger.debug`Using SONG URL: ${songUrl}`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error; // Re-throw enhanced errors
      }

      throw ErrorFactory.config(
        `Invalid SONG URL format: ${songUrl}`,
        "songUrl",
        [
          "Use a valid URL format: http://localhost:8080",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 8080 for SONG)",
          "Ensure proper URL encoding for special characters",
        ]
      );
    }
  }

  /**
   * Enhanced study ID validation
   */
  private validateStudyId(options: any): void {
    const studyId = options.studyId || process.env.STUDY_ID;

    if (!studyId) {
      throw ErrorFactory.args(
        "Study ID not specified for analysis publication",
        "songPublishAnalysis",
        [
          "Provide study ID: conductor songPublishAnalysis --study-id my-study",
          "Set STUDY_ID environment variable",
          "Study ID should match the study containing the analysis",
          "Ensure the study exists in SONG",
          "Use the same study ID from when the analysis was submitted",
        ]
      );
    }

    if (typeof studyId !== "string" || studyId.trim() === "") {
      throw ErrorFactory.validation("Invalid study ID format", { studyId }, [
        "Study ID must be a non-empty string",
        "Use the exact study ID from SONG",
        "Check for typos or extra whitespace",
        "Verify the study exists before publishing analysis",
      ]);
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
      Logger.warn`Empty auth token provided - using default authentication`;
    }

    // Validate analysis ID if provided
    const analysisId = options.analysisId || process.env.ANALYSIS_ID;
    if (
      analysisId &&
      (typeof analysisId !== "string" || analysisId.trim() === "")
    ) {
      throw ErrorFactory.validation(
        "Invalid analysis ID format",
        { analysisId },
        [
          "Analysis ID must be a non-empty string if provided",
          "Use the exact analysis ID from SONG",
          "Check for typos or extra whitespace",
          "Leave empty to publish all unpublished analyses in the study",
        ]
      );
    }

    Logger.debug`Optional parameters validated`;
  }

  /**
   * Extract service configuration from options
   */
  private extractServiceConfig(options: any): ServiceConfig {
    const songUrl = options.songUrl || process.env.SONG_URL;
    const authToken = options.authToken || process.env.AUTH_TOKEN || "123";

    return {
      url: songUrl,
      authToken,
      timeout: 60000, // 60 second timeout for publish operations
      retries: 3,
    };
  }

  /**
   * Enhanced success logging with publication details
   */
  private logPublishSuccess(publishResult: any, studyId: string): void {
    Logger.success`Analysis published successfully in SONG`;

    // Log publication details if available
    if (publishResult) {
      if (publishResult.analysisId) {
        Logger.info`Analysis ID: ${publishResult.analysisId}`;
      }

      if (publishResult.publishedCount !== undefined) {
        Logger.info`Analyses published: ${publishResult.publishedCount}`;
      }

      if (publishResult.status) {
        Logger.info`Publication status: ${publishResult.status}`;
      }

      if (publishResult.publishedAt) {
        Logger.info`Published at: ${publishResult.publishedAt}`;
      }
    }

    // Summary information
    Logger.section("Publication Summary");
    Logger.info`Study ID: ${studyId}`;
    Logger.info`Publication timestamp: ${new Date().toISOString()}`;

    Logger.tipString("Analysis is now publicly accessible in SONG");
    Logger.tipString(
      "Published analyses cannot be modified - create new analysis for updates"
    );
    Logger.tipString("Check SONG web interface to verify publication status");
  }
}
