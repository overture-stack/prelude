/**
 * SONG Create Study Command
 *
 * Command for creating studies in the SONG service.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { Command } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score/songService";
import { ServiceConfig } from "../services/base/types";

/**
 * Command for creating studies in SONG service
 * Enhanced with comprehensive validation and error handling
 */
export class SongCreateStudyCommand extends Command {
  constructor() {
    super("SONG Create Study");
  }

  /**
   * Enhanced validation with specific error messages for each parameter
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating SONG study creation parameters`;

    // Enhanced validation for each required parameter
    this.validateSongUrl(options);
    this.validateStudyId(options);
    this.validateStudyName(options);
    this.validateOrganization(options);
    this.validateOptionalParameters(options);

    Logger.successString("SONG study creation parameters validated");
  }

  /**
   * Enhanced execution with detailed logging and error handling
   */
  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Extract validated configuration
    const serviceConfig = this.extractServiceConfig(options);
    const studyParams = this.extractStudyParams(options);

    Logger.info`Starting SONG study creation`;
    Logger.info`Study ID: ${studyParams.studyId}`;
    Logger.info`Study Name: ${studyParams.studyName}`;
    Logger.info`Organization: ${studyParams.organization}`;
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

    // Create study with enhanced error handling
    Logger.info`Creating study in SONG...`;
    const createResult = await songService.createStudy(studyParams);

    // Enhanced success logging
    this.logCreateSuccess(createResult, studyParams);

    // Command completed successfully
  }

  /**
   * Enhanced SONG URL validation
   */
  private validateSongUrl(options: any): void {
    const songUrl = options.songUrl || process.env.SONG_URL;

    if (!songUrl) {
      throw ErrorFactory.config("SONG service URL not configured", "songUrl", [
        "Set SONG URL: conductor songCreateStudy --song-url http://localhost:8080",
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
      throw ErrorFactory.args("Study ID not specified", "songCreateStudy", [
        "Provide study ID: conductor songCreateStudy --study-id my-study",
        "Set STUDY_ID environment variable",
        "Use a unique identifier for the study",
        "Study IDs should be descriptive and meaningful",
        "Example: 'cancer-genomics-2024' or 'clinical-trial-001'",
      ]);
    }

    if (typeof studyId !== "string" || studyId.trim() === "") {
      throw ErrorFactory.validation("Invalid study ID format", { studyId }, [
        "Study ID must be a non-empty string",
        "Use descriptive IDs like 'cancer-genomics-2024' or 'clinical-trial-001'",
        "Avoid spaces and special characters",
        "Use lowercase with hyphens or underscores",
      ]);
    }

    // Validate study ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(studyId)) {
      throw ErrorFactory.validation(
        `Study ID contains invalid characters: ${studyId}`,
        { studyId },
        [
          "Use only letters, numbers, hyphens, and underscores",
          "Avoid spaces and special characters",
          "Example: 'genomic-study-2024' or 'clinical_trial_phase1'",
          "Keep IDs concise but descriptive",
        ]
      );
    }

    // Check for reserved study IDs
    const reservedIds = [
      "test",
      "demo",
      "admin",
      "system",
      "null",
      "undefined",
    ];
    if (reservedIds.includes(studyId.toLowerCase())) {
      Logger.warn`Study ID '${studyId}' is a commonly used name - consider using a more specific identifier`;
    }

    Logger.debug`Study ID validated: ${studyId}`;
  }

  /**
   * Enhanced study name validation
   */
  private validateStudyName(options: any): void {
    const studyName = options.studyName || process.env.STUDY_NAME;

    if (!studyName) {
      throw ErrorFactory.args("Study name not specified", "songCreateStudy", [
        "Provide study name: conductor songCreateStudy --study-name 'My Research Study'",
        "Set STUDY_NAME environment variable",
        "Study name should be descriptive and human-readable",
        "Use quotes for names with spaces",
        "Example: 'Cancer Genomics Research 2024'",
      ]);
    }

    if (typeof studyName !== "string" || studyName.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid study name format",
        { studyName },
        [
          "Study name must be a non-empty string",
          "Use descriptive names that explain the study purpose",
          "Avoid very long names (keep under 100 characters)",
          "Include key details like disease, data type, or year",
        ]
      );
    }

    // Length validation
    if (studyName.length > 200) {
      throw ErrorFactory.validation(
        `Study name is too long: ${studyName.length} characters`,
        { studyName, length: studyName.length },
        [
          "Keep study names under 200 characters",
          "Use concise but descriptive names",
          "Move detailed information to the description field",
          "Focus on the key aspects of the study",
        ]
      );
    }

    Logger.debug`Study name validated: ${studyName}`;
  }

  /**
   * Enhanced organization validation
   */
  private validateOrganization(options: any): void {
    const organization = options.organization || process.env.ORGANIZATION;

    if (!organization) {
      throw ErrorFactory.args("Organization not specified", "songCreateStudy", [
        "Provide organization: conductor songCreateStudy --organization 'My University'",
        "Set ORGANIZATION environment variable",
        "Organization identifies the institution conducting the study",
        "Use your institution's official name",
        "Example: 'University of Toronto' or 'OICR'",
      ]);
    }

    if (typeof organization !== "string" || organization.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid organization format",
        { organization },
        [
          "Organization must be a non-empty string",
          "Use your institution's official name",
          "Avoid abbreviations unless commonly recognized",
          "Include department if relevant",
        ]
      );
    }

    Logger.debug`Organization validated: ${organization}`;
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

    // Validate description if provided
    const description = options.description || process.env.DESCRIPTION;
    if (description && description.length > 1000) {
      Logger.warn`Study description is very long (${description.length} characters) - consider shortening`;
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
      timeout: 30000, // 30 second timeout
      retries: 3,
    };
  }

  /**
   * Extract study parameters from options
   */
  private extractStudyParams(options: any): any {
    return {
      studyId: options.studyId || process.env.STUDY_ID,
      studyName: options.studyName || process.env.STUDY_NAME,
      organization: options.organization || process.env.ORGANIZATION,
      description:
        options.description ||
        process.env.DESCRIPTION ||
        `Study created via Conductor CLI at ${new Date().toISOString()}`,
    };
  }

  /**
   * Enhanced success logging with study details
   */
  private logCreateSuccess(createResult: any, studyParams: any): void {
    Logger.success`Study created successfully in SONG`;

    // Log study details
    Logger.section("Study Details");
    Logger.info`Study ID: ${studyParams.studyId}`;
    Logger.info`Study Name: ${studyParams.studyName}`;
    Logger.info`Organization: ${studyParams.organization}`;

    if (studyParams.description) {
      Logger.info`Description: ${studyParams.description}`;
    }

    // Log creation result details if available
    if (createResult) {
      if (createResult.createdAt) {
        Logger.info`Created at: ${createResult.createdAt}`;
      }

      if (createResult.studyUrl) {
        Logger.info`Study URL: ${createResult.studyUrl}`;
      }

      if (createResult.status) {
        Logger.info`Status: ${createResult.status}`;
      }
    }

    // Summary and next steps
    Logger.section("Next Steps");
    Logger.tipString(
      "Study is now ready for schema uploads and analysis submissions"
    );
    Logger.tipString("Use 'songUploadSchema' command to add data schemas");
    Logger.tipString(
      "Use 'songSubmitAnalysis' command to submit analysis data"
    );
    Logger.tipString("Check SONG web interface to manage study settings");
  }
}
