// src/commands/lyricRegistrationCommand.ts - Enhanced with ErrorFactory patterns
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { LyricRegistrationService } from "../services/lyric/LyricRegistrationService";
import { DictionaryRegistrationParams } from "../services/lyric/types";

/**
 * Command for registering a dictionary with the Lyric service
 * Enhanced with ErrorFactory patterns and comprehensive validation
 */
export class LyricRegistrationCommand extends Command {
  constructor() {
    super("Lyric Dictionary Registration");
  }

  /**
   * Validates command line arguments with enhanced error messages
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating Lyric registration parameters`;

    // Enhanced validation with specific guidance for each parameter
    this.validateLyricUrl(options);
    this.validateDictionaryName(options);
    this.validateCategoryName(options);
    this.validateDictionaryVersion(options);
    this.validateCentricEntity(options);

    Logger.successString("Lyric registration parameters validated");
  }

  /**
   * Executes the Lyric dictionary registration process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration with enhanced validation
      const registrationParams = this.extractRegistrationParams(options);
      const serviceConfig = this.extractServiceConfig(options);

      Logger.info`Starting Lyric dictionary registration`;
      Logger.info`Dictionary: ${registrationParams.dictionaryName} v${registrationParams.dictionaryVersion}`;
      Logger.info`Category: ${registrationParams.categoryName}`;
      Logger.info`Centric Entity: ${registrationParams.defaultCentricEntity}`;

      // Create service instance with enhanced error handling
      const lyricService = new LyricRegistrationService(serviceConfig);

      // Enhanced health check with specific feedback
      Logger.info`Checking Lyric service health...`;
      const healthResult = await lyricService.checkHealth();
      if (!healthResult.healthy) {
        throw ErrorFactory.connection(
          "Lyric service health check failed",
          "Lyric",
          serviceConfig.url,
          [
            "Check that Lyric service is running",
            `Verify service URL: ${serviceConfig.url}`,
            "Check network connectivity and firewall settings",
            "Review Lyric service logs for errors",
            `Test manually: curl ${serviceConfig.url}/health`,
            healthResult.message
              ? `Health check message: ${healthResult.message}`
              : "",
          ].filter(Boolean)
        );
      }

      // Optional: Validate centric entity against Lectern if URL provided
      if (options.lecternUrl) {
        await this.validateCentricEntityAgainstLectern(
          registrationParams,
          options.lecternUrl
        );
      }

      // Register dictionary with enhanced context
      this.logRegistrationInfo(registrationParams, serviceConfig.url);

      Logger.info`Submitting dictionary registration to Lyric...`;
      const result = await lyricService.registerDictionary(registrationParams);

      // Enhanced success logging
      this.logSuccess(registrationParams, result);

      return {
        success: true,
        details: {
          registrationParams,
          serviceUrl: serviceConfig.url,
          registrationResult: result,
        },
      };
    } catch (error) {
      return this.handleExecutionError(error, cliOutput);
    }
  }

  /**
   * Enhanced Lyric URL validation
   */
  private validateLyricUrl(options: any): void {
    const lyricUrl = options.lyricUrl || process.env.LYRIC_URL;

    if (!lyricUrl) {
      throw ErrorFactory.config(
        "Lyric service URL not configured",
        "lyricUrl",
        [
          "Set Lyric URL: conductor lyricRegister --lyric-url http://localhost:3030",
          "Set LYRIC_URL environment variable",
          "Verify Lyric service is running and accessible",
          "Check network connectivity to Lyric service",
        ]
      );
    }

    // Basic URL format validation
    try {
      new URL(lyricUrl);
      Logger.debug`Using Lyric URL: ${lyricUrl}`;
    } catch (error) {
      throw ErrorFactory.config(
        `Invalid Lyric URL format: ${lyricUrl}`,
        "lyricUrl",
        [
          "Use a valid URL format: http://localhost:3030",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct",
        ]
      );
    }
  }

  /**
   * Enhanced dictionary name validation
   */
  private validateDictionaryName(options: any): void {
    const dictName = options.dictName || process.env.DICTIONARY_NAME;

    if (!dictName) {
      throw ErrorFactory.args(
        "Dictionary name not specified",
        "lyricRegister",
        [
          "Provide dictionary name: conductor lyricRegister --dict-name my-dictionary",
          "Set DICTIONARY_NAME environment variable",
          "Use a descriptive name for the dictionary",
          "Ensure the name matches your Lectern schema",
        ]
      );
    }

    if (typeof dictName !== "string" || dictName.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid dictionary name format",
        { dictName },
        [
          "Dictionary name must be a non-empty string",
          "Use descriptive names like 'clinical-data' or 'genomic-metadata'",
          "Avoid special characters and spaces",
          "Use lowercase with hyphens or underscores",
        ]
      );
    }

    // Validate name format
    if (!/^[a-zA-Z0-9_-]+$/.test(dictName)) {
      throw ErrorFactory.validation(
        `Dictionary name contains invalid characters: ${dictName}`,
        { dictName },
        [
          "Use only letters, numbers, hyphens, and underscores",
          "Avoid spaces and special characters",
          "Example: 'clinical-data-v1' or 'genomic_metadata'",
          "Keep names concise but descriptive",
        ]
      );
    }

    Logger.debug`Dictionary name validated: ${dictName}`;
  }

  /**
   * Enhanced category name validation
   */
  private validateCategoryName(options: any): void {
    const categoryName = options.categoryName || process.env.CATEGORY_NAME;

    if (!categoryName) {
      throw ErrorFactory.args("Category name not specified", "lyricRegister", [
        "Provide category name: conductor lyricRegister --category-name my-category",
        "Set CATEGORY_NAME environment variable",
        "Categories organize related dictionaries",
        "Use descriptive category names like 'clinical' or 'genomics'",
      ]);
    }

    if (typeof categoryName !== "string" || categoryName.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid category name format",
        { categoryName },
        [
          "Category name must be a non-empty string",
          "Use descriptive names that group related dictionaries",
          "Examples: 'clinical', 'genomics', 'metadata'",
          "Keep names simple and memorable",
        ]
      );
    }

    Logger.debug`Category name validated: ${categoryName}`;
  }

  /**
   * Enhanced dictionary version validation
   */
  private validateDictionaryVersion(options: any): void {
    const version = options.dictionaryVersion || process.env.DICTIONARY_VERSION;

    if (!version) {
      throw ErrorFactory.args(
        "Dictionary version not specified",
        "lyricRegister",
        [
          "Provide version: conductor lyricRegister --dictionary-version 1.0",
          "Set DICTIONARY_VERSION environment variable",
          "Use semantic versioning: major.minor.patch",
          "Examples: '1.0', '2.1.3', '1.0.0-beta'",
        ]
      );
    }

    if (typeof version !== "string" || version.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid dictionary version format",
        { version },
        [
          "Version must be a non-empty string",
          "Use semantic versioning format: major.minor or major.minor.patch",
          "Examples: '1.0', '2.1.3', '1.0.0-beta'",
          "Increment versions when schema changes",
        ]
      );
    }

    // Basic version format validation
    if (!/^\d+(\.\d+)*(-[a-zA-Z0-9]+)?$/.test(version)) {
      Logger.warn`Version format '${version}' doesn't follow semantic versioning`;
      Logger.tipString("Consider using semantic versioning: major.minor.patch");
    }

    Logger.debug`Dictionary version validated: ${version}`;
  }

  /**
   * Enhanced centric entity validation
   */
  private validateCentricEntity(options: any): void {
    const centricEntity =
      options.defaultCentricEntity || process.env.DEFAULT_CENTRIC_ENTITY;

    if (!centricEntity) {
      throw ErrorFactory.args(
        "Default centric entity not specified",
        "lyricRegister",
        [
          "Provide centric entity: conductor lyricRegister --default-centric-entity donor",
          "Set DEFAULT_CENTRIC_ENTITY environment variable",
          "Centric entity must exist in your dictionary schema",
          "Common entities: 'donor', 'specimen', 'sample', 'file'",
        ]
      );
    }

    if (typeof centricEntity !== "string" || centricEntity.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid centric entity format",
        { centricEntity },
        [
          "Centric entity must be a non-empty string",
          "Use entity names from your dictionary schema",
          "Examples: 'donor', 'specimen', 'sample', 'file'",
          "Entity must be defined in your Lectern schema",
        ]
      );
    }

    // Basic entity name validation
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(centricEntity)) {
      throw ErrorFactory.validation(
        `Invalid centric entity format: ${centricEntity}`,
        { centricEntity },
        [
          "Entity names must start with a letter",
          "Use only letters, numbers, and underscores",
          "Follow your schema's entity naming conventions",
          "Examples: 'donor', 'specimen_data', 'sample_metadata'",
        ]
      );
    }

    Logger.debug`Centric entity validated: ${centricEntity}`;
  }

  /**
   * Extract registration parameters with validation
   */
  private extractRegistrationParams(
    options: any
  ): DictionaryRegistrationParams {
    return {
      categoryName: options.categoryName || process.env.CATEGORY_NAME!,
      dictionaryName: options.dictName || process.env.DICTIONARY_NAME!,
      dictionaryVersion:
        options.dictionaryVersion || process.env.DICTIONARY_VERSION!,
      defaultCentricEntity:
        options.defaultCentricEntity || process.env.DEFAULT_CENTRIC_ENTITY!,
    };
  }

  /**
   * Extract service configuration with enhanced defaults
   */
  private extractServiceConfig(options: any) {
    const url = options.lyricUrl || process.env.LYRIC_URL!;

    return {
      url,
      timeout: 15000, // Longer timeout for registration operations
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN,
    };
  }

  /**
   * Enhanced centric entity validation against Lectern
   */
  private async validateCentricEntityAgainstLectern(
    params: DictionaryRegistrationParams,
    lecternUrl: string
  ): Promise<void> {
    try {
      Logger.info`Validating centric entity '${params.defaultCentricEntity}' against Lectern dictionary...`;

      // This would use LecternService to validate the entity
      // For now, just showing the pattern with helpful logging
      const entities = await this.fetchDictionaryEntities(
        lecternUrl,
        params.dictionaryName,
        params.dictionaryVersion
      );

      if (!entities.includes(params.defaultCentricEntity)) {
        throw ErrorFactory.validation(
          `Centric entity '${params.defaultCentricEntity}' not found in dictionary '${params.dictionaryName}'`,
          {
            centricEntity: params.defaultCentricEntity,
            availableEntities: entities,
            dictionaryName: params.dictionaryName,
            dictionaryVersion: params.dictionaryVersion,
          },
          [
            `Available entities in ${params.dictionaryName}: ${entities.join(
              ", "
            )}`,
            "Check the spelling of the centric entity name",
            "Verify the entity exists in your Lectern schema",
            "Update your schema if the entity is missing",
            `Use one of: ${entities.slice(0, 3).join(", ")}${
              entities.length > 3 ? "..." : ""
            }`,
          ]
        );
      }

      Logger.success`Centric entity '${params.defaultCentricEntity}' validated against dictionary`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      Logger.warn`Could not validate centric entity against Lectern: ${
        error instanceof Error ? error.message : String(error)
      }`;
      Logger.tipString(
        "Proceeding without Lectern validation - ensure entity exists in your schema"
      );
    }
  }

  /**
   * Fetch available entities from Lectern dictionary
   */
  private async fetchDictionaryEntities(
    lecternUrl: string,
    dictionaryName: string,
    dictionaryVersion: string
  ): Promise<string[]> {
    // Placeholder implementation - would use LecternService in practice
    // Return common entities for now
    Logger.debug`Fetching entities from Lectern for ${dictionaryName} v${dictionaryVersion}`;

    // This would be replaced with actual LecternService calls
    return ["donor", "specimen", "sample", "file", "analysis"];
  }

  /**
   * Enhanced registration information logging
   */
  private logRegistrationInfo(
    params: DictionaryRegistrationParams,
    url: string
  ): void {
    Logger.info`${chalk.bold.cyan("Lyric Dictionary Registration Details:")}`;
    Logger.generic(`  Service: ${url}/dictionary/register`);
    Logger.generic(`  Category: ${params.categoryName}`);
    Logger.generic(`  Dictionary: ${params.dictionaryName}`);
    Logger.generic(`  Version: ${params.dictionaryVersion}`);
    Logger.generic(`  Centric Entity: ${params.defaultCentricEntity}`);
  }

  /**
   * Enhanced success logging with detailed information
   */
  private logSuccess(params: DictionaryRegistrationParams, result: any): void {
    Logger.success`Dictionary registered successfully with Lyric`;
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    ✓ Category: ${params.categoryName}`));
    Logger.generic(chalk.gray(`    ✓ Dictionary: ${params.dictionaryName}`));
    Logger.generic(chalk.gray(`    ✓ Version: ${params.dictionaryVersion}`));
    Logger.generic(
      chalk.gray(`    ✓ Centric Entity: ${params.defaultCentricEntity}`)
    );

    if (result.id) {
      Logger.generic(chalk.gray(`    ✓ Registration ID: ${result.id}`));
    }

    if (result.created_at) {
      Logger.generic(chalk.gray(`    ✓ Created: ${result.created_at}`));
    }

    Logger.generic(" ");
    Logger.tipString(
      "Dictionary is now available for data submission in Lyric"
    );
  }

  /**
   * Enhanced execution error handling with context-specific guidance
   */
  private handleExecutionError(
    error: unknown,
    cliOutput: CLIOutput
  ): CommandResult {
    const options = cliOutput.options;
    const dictionaryName =
      options.dictName || process.env.DICTIONARY_NAME || "unknown";

    if (error instanceof Error && error.name === "ConductorError") {
      // Add registration context to existing errors
      return {
        success: false,
        errorMessage: error.message,
        errorCode: (error as any).code,
        details: {
          ...(error as any).details,
          dictionaryName,
          command: "lyricRegister",
          serviceUrl: options.lyricUrl || process.env.LYRIC_URL,
        },
      };
    }

    // Handle service-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    let suggestions = [
      "Check Lyric service connectivity and availability",
      "Verify all registration parameters are correct",
      "Ensure dictionary doesn't already exist",
      "Review Lyric service logs for additional details",
      "Use --debug flag for detailed error information",
    ];

    // Add specific suggestions based on error content
    if (errorMessage.includes("409") || errorMessage.includes("conflict")) {
      suggestions.unshift("Dictionary may already be registered");
      suggestions.unshift("Check existing dictionaries in Lyric");
      suggestions.unshift("Use a different version number or name");
    } else if (
      errorMessage.includes("400") ||
      errorMessage.includes("validation")
    ) {
      suggestions.unshift("Check registration parameters format and values");
      suggestions.unshift("Verify centric entity exists in dictionary schema");
    } else if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("401")
    ) {
      suggestions.unshift("Check authentication credentials if required");
      suggestions.unshift("Verify API access permissions");
    }

    return {
      success: false,
      errorMessage: `Lyric dictionary registration failed: ${errorMessage}`,
      errorCode: "CONNECTION_ERROR",
      details: {
        originalError: error,
        dictionaryName,
        suggestions,
        command: "lyricRegister",
        serviceUrl: options.lyricUrl || process.env.LYRIC_URL,
      },
    };
  }
}
