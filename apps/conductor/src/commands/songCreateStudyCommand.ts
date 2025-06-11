// src/commands/songCreateStudyCommand.ts - Enhanced with ErrorFactory patterns
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongStudyCreateParams } from "../services/song-score/types";

/**
 * Command for creating studies in SONG service
 * Enhanced with ErrorFactory patterns and comprehensive validation
 */
export class SongCreateStudyCommand extends Command {
  constructor() {
    super("SONG Study Creation");
  }

  /**
   * Validates command line arguments with enhanced error messages
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating SONG study creation parameters`;

    // Enhanced validation with specific guidance for each parameter
    this.validateSongUrl(options);
    this.validateStudyId(options);
    this.validateStudyName(options);
    this.validateOrganization(options);
    this.validateOptionalParameters(options);

    Logger.successString("SONG study parameters validated");
  }

  /**
   * Executes the SONG study creation process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration with enhanced validation
      const studyParams = this.extractStudyParams(options);
      const serviceConfig = this.extractServiceConfig(options);

      Logger.info`Starting SONG study creation`;
      Logger.info`Study ID: ${studyParams.studyId}`;
      Logger.info`Study Name: ${studyParams.name}`;
      Logger.info`Organization: ${studyParams.organization}`;

      if (studyParams.description && studyParams.description !== "string") {
        Logger.info`Description: ${studyParams.description}`;
      }

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
            `Test manually: curl ${serviceConfig.url}/isAlive`,
            healthResult.message
              ? `Health check message: ${healthResult.message}`
              : "",
          ].filter(Boolean)
        );
      }

      // Log creation info with enhanced context
      this.logCreationInfo(studyParams, serviceConfig.url);

      // Create study with enhanced error context
      Logger.info`Creating study in SONG service...`;
      const result = await songService.createStudy(studyParams);

      // Enhanced success logging based on result status
      this.logSuccess(result, studyParams);

      return {
        success: true,
        details: {
          studyParams,
          serviceUrl: serviceConfig.url,
          creationResult: result,
          wasExisting: result.status === "EXISTING",
        },
      };
    } catch (error) {
      return this.handleExecutionError(error, cliOutput);
    }
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
  private validateStudyId(options: any): void {
    const studyId = options.studyId || process.env.STUDY_ID;

    if (!studyId) {
      throw ErrorFactory.args("Study ID not specified", "songCreateStudy", [
        "Provide study ID: conductor songCreateStudy --study-id my-study",
        "Set STUDY_ID environment variable",
        "Use a unique identifier for the study",
        "Study IDs should be descriptive and meaningful",
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
      Logger.warn`Study ID '${studyId}' is a common reserved word`;
      Logger.tipString("Consider using a more specific study identifier");
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
        "Use a descriptive name for the study",
        "Study names can contain spaces and be more descriptive than IDs",
      ]);
    }

    if (typeof studyName !== "string" || studyName.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid study name format",
        { studyName },
        [
          "Study name must be a non-empty string",
          "Use descriptive names like 'Cancer Genomics Study 2024'",
          "Names can contain spaces and special characters",
          "Keep names informative and professional",
        ]
      );
    }

    if (studyName.length > 200) {
      throw ErrorFactory.validation(
        `Study name too long: ${studyName.length} characters (max 200)`,
        { studyName, length: studyName.length },
        [
          "Keep study names under 200 characters",
          "Use concise but descriptive names",
          "Consider abbreviating if necessary",
          "Focus on key identifying information",
        ]
      );
    }

    // Check for placeholder values
    const placeholders = ["string", "test", "example", "sample"];
    if (placeholders.includes(studyName.toLowerCase())) {
      Logger.warn`Study name '${studyName}' appears to be a placeholder`;
      Logger.tipString("Consider using a more descriptive study name");
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
        "Use your institution or organization name",
        "This helps identify data ownership and access",
      ]);
    }

    if (typeof organization !== "string" || organization.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid organization format",
        { organization },
        [
          "Organization must be a non-empty string",
          "Use your institution's full name",
          "Examples: 'University of Toronto', 'OICR', 'NIH'",
          "Use official organization names when possible",
        ]
      );
    }

    if (organization.length > 100) {
      throw ErrorFactory.validation(
        `Organization name too long: ${organization.length} characters (max 100)`,
        { organization, length: organization.length },
        [
          "Keep organization names under 100 characters",
          "Use standard abbreviations if necessary",
          "Focus on the primary institution name",
        ]
      );
    }

    // Check for placeholder values
    const placeholders = ["string", "test", "example", "org"];
    if (placeholders.includes(organization.toLowerCase())) {
      Logger.warn`Organization '${organization}' appears to be a placeholder`;
      Logger.tipString("Use your actual organization or institution name");
    }

    Logger.debug`Organization validated: ${organization}`;
  }

  /**
   * Validate optional parameters
   */
  private validateOptionalParameters(options: any): void {
    const description = options.description;

    if (
      description &&
      typeof description === "string" &&
      description.length > 1000
    ) {
      throw ErrorFactory.validation(
        `Study description too long: ${description.length} characters (max 1000)`,
        {
          description: description.substring(0, 100) + "...",
          length: description.length,
        },
        [
          "Keep study descriptions under 1000 characters",
          "Focus on key study objectives and scope",
          "Use concise, informative language",
          "Consider using external documentation for detailed information",
        ]
      );
    }

    // Validate auth token if provided
    const authToken = options.authToken || process.env.AUTH_TOKEN;
    if (authToken && typeof authToken === "string" && authToken.trim() === "") {
      Logger.warn`Empty auth token provided - using empty token`;
    }

    Logger.debug`Optional parameters validated`;
  }

  /**
   * Extract study parameters with validation
   */
  private extractStudyParams(options: any): SongStudyCreateParams {
    const description =
      options.description || process.env.DESCRIPTION || "string";

    return {
      studyId: options.studyId || process.env.STUDY_ID || "demo",
      name: options.studyName || process.env.STUDY_NAME || "string",
      organization:
        options.organization || process.env.ORGANIZATION || "string",
      description: description,
      force: options.force || false,
    };
  }

  /**
   * Extract service configuration with enhanced defaults
   */
  private extractServiceConfig(options: any) {
    const url =
      options.songUrl || process.env.SONG_URL || "http://localhost:8080";

    return {
      url,
      timeout: 15000, // Longer timeout for study creation operations
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Enhanced creation information logging
   */
  private logCreationInfo(params: SongStudyCreateParams, url: string): void {
    Logger.info`${chalk.bold.cyan("SONG Study Creation Details:")}`;
    Logger.generic(`  Service: ${url}/studies/${params.studyId}/`);
    Logger.generic(`  Study ID: ${params.studyId}`);
    Logger.generic(`  Study Name: ${params.name}`);
    Logger.generic(`  Organization: ${params.organization}`);

    if (params.description && params.description !== "string") {
      Logger.generic(`  Description: ${params.description}`);
    }

    if (params.force) {
      Logger.generic(
        `  Force Mode: ${chalk.yellow(
          "Enabled"
        )} (will overwrite existing study)`
      );
    }
  }

  /**
   * Enhanced success logging with detailed information
   */
  private logSuccess(result: any, params: SongStudyCreateParams): void {
    if (result.status === "EXISTING") {
      Logger.warn`Study already exists in SONG`;
      Logger.generic(" ");
      Logger.generic(chalk.gray(`    ⚠ Study ID: ${result.studyId}`));
      Logger.generic(chalk.gray(`    ⚠ Status: Already exists`));
      Logger.generic(chalk.gray(`    ⚠ Organization: ${result.organization}`));
      Logger.generic(" ");
      Logger.tipString(
        "Use --force flag to overwrite existing study, or choose a different study ID"
      );
    } else {
      Logger.success`Study created successfully in SONG`;
      Logger.generic(" ");
      Logger.generic(chalk.gray(`    ✓ Study ID: ${result.studyId}`));
      Logger.generic(chalk.gray(`    ✓ Study Name: ${result.name}`));
      Logger.generic(chalk.gray(`    ✓ Organization: ${result.organization}`));
      Logger.generic(chalk.gray(`    ✓ Status: ${result.status}`));

      if (result.created_at) {
        Logger.generic(chalk.gray(`    ✓ Created: ${result.created_at}`));
      }

      Logger.generic(" ");
      Logger.tipString(
        "Study is now available for analysis submission and data management"
      );
    }
  }

  /**
   * Enhanced execution error handling with context-specific guidance
   */
  private handleExecutionError(
    error: unknown,
    cliOutput: CLIOutput
  ): CommandResult {
    const options = cliOutput.options;
    const studyId = options.studyId || process.env.STUDY_ID || "unknown";
    const serviceUrl = options.songUrl || process.env.SONG_URL;

    if (error instanceof Error && error.name === "ConductorError") {
      // Add study creation context to existing errors
      return {
        success: false,
        errorMessage: error.message,
        errorCode: (error as any).code,
        details: {
          ...(error as any).details,
          studyId,
          command: "songCreateStudy",
          serviceUrl,
        },
      };
    }

    // Handle service-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    let suggestions = [
      "Check SONG service connectivity and availability",
      "Verify all study parameters are correct",
      "Ensure you have proper permissions to create studies",
      "Review SONG service logs for additional details",
      "Use --debug flag for detailed error information",
    ];

    // Add specific suggestions based on error content
    if (errorMessage.includes("409") || errorMessage.includes("conflict")) {
      suggestions.unshift("Study ID already exists in SONG");
      suggestions.unshift("Use a different study ID or add --force flag");
      suggestions.unshift("Check existing studies with the same ID");
    } else if (
      errorMessage.includes("400") ||
      errorMessage.includes("validation")
    ) {
      suggestions.unshift("Check study parameters format and values");
      suggestions.unshift("Verify study ID follows naming conventions");
      suggestions.unshift("Ensure organization name is valid");
    } else if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("401")
    ) {
      suggestions.unshift("Check authentication token");
      suggestions.unshift("Verify API access permissions");
      suggestions.unshift("Ensure auth token is valid and not expired");
    } else if (
      errorMessage.includes("403") ||
      errorMessage.includes("forbidden")
    ) {
      suggestions.unshift("You may not have permission to create studies");
      suggestions.unshift("Check with SONG administrator for access");
      suggestions.unshift("Verify organization permissions");
    }

    return {
      success: false,
      errorMessage: `SONG study creation failed: ${errorMessage}`,
      errorCode: "CONNECTION_ERROR",
      details: {
        originalError: error,
        studyId,
        suggestions,
        command: "songCreateStudy",
        serviceUrl,
      },
    };
  }
}
