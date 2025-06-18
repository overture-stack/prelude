// src/commands/lyricRegistrationCommand.ts

import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { LyricRegistrationService } from "../services/lyric/LyricRegistrationService";
import { LecternService } from "../services/lectern";
import { ServiceConfigManager } from "../config/serviceConfigManager";
import { DictionaryRegistrationParams } from "../services/lyric/types";

/**
 * Command for registering a dictionary with the Lyric service
 * Lectern URL is optional with default value
 */
export class LyricRegistrationCommand extends Command {
  constructor() {
    super("Lyric Dictionary Registration");
  }

  /**
   * Executes the Lyric dictionary registration process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration
      const registrationParams = this.extractRegistrationParams(options);
      const lyricServiceConfig = this.extractServiceConfig(options);
      const lecternServiceConfig = this.extractLecternServiceConfig(options);

      // Create service instances
      const lyricService = new LyricRegistrationService(lyricServiceConfig);
      const lecternService = new LecternService(lecternServiceConfig);

      // Check Lyric service health first
      const healthResult = await lyricService.checkHealth();
      if (!healthResult.healthy) {
        throw ErrorFactory.connection(
          "Lyric service is not healthy",
          {
            healthResult,
            serviceUrl: lyricServiceConfig.url,
          },
          [
            "Check that Lyric service is running",
            `Verify the service URL: ${lyricServiceConfig.url}`,
            "Check network connectivity",
            "Review service logs for errors",
          ]
        );
      }

      // Check Lectern service health
      const lecternHealthResult = await lecternService.checkHealth();
      if (!lecternHealthResult.healthy) {
        throw ErrorFactory.connection(
          "Lectern service is not healthy",
          {
            healthResult: lecternHealthResult,
            serviceUrl: lecternServiceConfig.url,
          },
          [
            "Check that Lectern service is running",
            `Verify the service URL: ${lecternServiceConfig.url}`,
            "Lectern is required to validate dictionary before registration",
            "Check network connectivity",
          ]
        );
      }

      // Validate dictionary exists in Lectern and entity is valid
      Logger.debug`Validating dictionary '${registrationParams.dictionaryName}' v${registrationParams.dictionaryVersion} in Lectern`;

      try {
        await this.validateDictionaryAndEntity(
          registrationParams,
          lecternService
        );
      } catch (validationError) {
        // EXPLICIT ERROR LOGGING: Ensure validation errors are properly logged
        if (
          validationError instanceof Error &&
          validationError.name === "ConductorError"
        ) {
          const conductorError = validationError as any;

          // Log the error immediately
          Logger.errorString(conductorError.message);

          // Use Logger.generic for clean formatting of available options OUTSIDE suggestions
          if (conductorError.details?.availableDictionaries?.length > 0) {
            Logger.generic("");
            Logger.generic(chalk.bold.cyan("🔍 Available dictionaries:"));
            conductorError.details.availableDictionaries.forEach(
              (dict: string) => {
                Logger.generic(`   ▸ ${dict}`);
              }
            );
          }

          if (conductorError.details?.availableEntities?.length > 0) {
            Logger.generic("");
            Logger.generic(chalk.bold.cyan("🔍 Available entities:"));
            conductorError.details.availableEntities.forEach(
              (entity: string) => {
                Logger.generic(`   ▸ ${entity}`);
              }
            );
          }

          // Display filtered suggestions (excluding the available lists)
          if (
            conductorError.suggestions &&
            conductorError.suggestions.length > 0
          ) {
            const filteredSuggestions = conductorError.suggestions.filter(
              (suggestion: string) =>
                !suggestion.includes("Available dictionaries:") &&
                !suggestion.includes("Available entities:") &&
                suggestion.trim() !== "" &&
                !suggestion.startsWith("    ")
            );

            if (filteredSuggestions.length > 0) {
              Logger.suggestion("Suggestions");
              filteredSuggestions.forEach((suggestion: string) => {
                Logger.tipString(suggestion);
              });
            }
          }
        }

        // Re-throw to be handled by the base command error flow
        throw validationError;
      }

      // Register dictionary
      this.logRegistrationInfo(registrationParams, lyricServiceConfig.url);

      const result = await lyricService.registerDictionary(registrationParams);

      // Log success
      this.logSuccess(registrationParams);

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
   * FIXED: Lectern URL is optional - use default if not provided
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Validate required parameters exist (lecternUrl is NOT required - has default)
    const requiredParams = [
      { key: "lyricUrl", name: "Lyric URL", envVar: "LYRIC_URL" },
      { key: "dictName", name: "Dictionary name", envVar: "DICTIONARY_NAME" },
      { key: "categoryName", name: "Category name", envVar: "CATEGORY_NAME" },
      {
        key: "dictionaryVersion",
        name: "Dictionary version",
        envVar: "DICTIONARY_VERSION",
      },
      {
        key: "defaultCentricEntity",
        name: "Default centric entity",
        envVar: "DEFAULT_CENTRIC_ENTITY",
      },
    ];

    for (const param of requiredParams) {
      const value = options[param.key] || process.env[param.envVar];
      if (!value) {
        throw ErrorFactory.args(`${param.name} is required`, [
          `Use --${param.key.replace(/([A-Z])/g, "-$1").toLowerCase()} option`,
          `Set ${param.envVar} environment variable`,
          "Example: --dict-name 'My Dictionary' --category-name 'research'",
        ]);
      }
    }

    // OPTIONAL: Check Lectern URL is valid if provided (don't require it)
    const lecternUrl = this.getLecternUrl(options);
    if (lecternUrl) {
      try {
        new URL(lecternUrl);
      } catch (error) {
        throw ErrorFactory.validation(
          "Invalid Lectern URL format",
          { url: lecternUrl },
          [
            "Ensure URL includes protocol (http:// or https://)",
            "Example: --lectern-url http://localhost:3031",
            "Check URL format and spelling",
          ]
        );
      }
    }
  }

  /**
   * Get Lectern URL with default value
   */
  private getLecternUrl(options: any): string {
    return (
      options.lecternUrl || process.env.LECTERN_URL || "http://localhost:3031" // Default value
    );
  }

  /**
   * Extract registration parameters from options
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
   * Extract service configuration from options
   */
  private extractServiceConfig(options: any) {
    return {
      url: options.lyricUrl || process.env.LYRIC_URL!,
      timeout: 10000,
      retries: 1,
      authToken: options.authToken || process.env.AUTH_TOKEN,
    };
  }

  /**
   * FIXED: Extract Lectern service configuration with default URL
   */
  private extractLecternServiceConfig(options: any) {
    return ServiceConfigManager.createLecternConfig({
      url: this.getLecternUrl(options), // Uses default if not provided
      authToken: options.authToken || process.env.AUTH_TOKEN,
    });
  }

  /**
   * Mandatory validation that dictionary exists in Lectern and entity is valid
   */
  private async validateDictionaryAndEntity(
    params: DictionaryRegistrationParams,
    lecternService: LecternService
  ): Promise<void> {
    try {
      // Step 1: Check if dictionary exists in Lectern
      const dictionary = await lecternService.findDictionary(
        params.dictionaryName,
        params.dictionaryVersion
      );

      if (!dictionary) {
        // Get available dictionaries for helpful suggestions
        let availableDictionaries: any[] = [];
        let dictNames: string[] = [];

        try {
          availableDictionaries = await lecternService.getDictionaries();
          dictNames = availableDictionaries.map(
            (d) => `${d.name} (v${d.version})`
          );
        } catch (getDictError) {
          Logger.debugString(
            `Could not fetch available dictionaries: ${getDictError}`
          );
          // Continue with validation error even if we can't get the list
        }

        // Only include actionable suggestions, NOT the available lists
        const suggestions = [
          "Check dictionary name spelling and version",
          "Upload the dictionary to Lectern first using: conductor lecternUpload",
          "Verify Lectern service contains the required dictionary",
        ];

        if (dictNames.length === 0) {
          suggestions.push("No dictionaries found in Lectern");
        }

        throw ErrorFactory.validation(
          `Dictionary '${params.dictionaryName}' version '${params.dictionaryVersion}' not found in Lectern`,
          {
            requestedDictionary: params.dictionaryName,
            requestedVersion: params.dictionaryVersion,
            availableDictionaries: dictNames,
          },
          suggestions
        );
      }

      Logger.debug`Dictionary '${params.dictionaryName}' v${params.dictionaryVersion} found in Lectern`;

      // Step 2: Validate that the centric entity exists in the dictionary
      const validationResult = await lecternService.validateCentricEntity(
        params.dictionaryName,
        params.dictionaryVersion,
        params.defaultCentricEntity
      );

      if (!validationResult.exists) {
        // Only include actionable suggestions, NOT the available lists
        const suggestions = [
          "Check entity name spelling",
          "Choose a valid entity from the dictionary schema",
          "Verify the entity exists in the dictionary definition",
        ];

        if (validationResult.entities.length === 0) {
          suggestions.push("No entities found in dictionary");
        }

        throw ErrorFactory.validation(
          `Entity '${params.defaultCentricEntity}' does not exist in dictionary '${params.dictionaryName}' v${params.dictionaryVersion}`,
          {
            requestedEntity: params.defaultCentricEntity,
            dictionaryName: params.dictionaryName,
            dictionaryVersion: params.dictionaryVersion,
            availableEntities: validationResult.entities,
          },
          suggestions
        );
      }

      Logger.success`Entity '${params.defaultCentricEntity}' validated in dictionary`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Wrap unexpected validation errors
      throw ErrorFactory.connection(
        "Failed to validate dictionary against Lectern",
        {
          dictionaryName: params.dictionaryName,
          dictionaryVersion: params.dictionaryVersion,
          originalError: error,
        },
        [
          "Check Lectern service is accessible",
          "Verify Lectern contains the required dictionary",
          "Check network connectivity to Lectern",
          "Use --debug for detailed error information",
        ]
      );
    }
  }

  /**
   * Log registration information
   */
  private logRegistrationInfo(
    params: DictionaryRegistrationParams,
    url: string
  ): void {
    Logger.info`${chalk.bold.cyan("Registering Dictionary with Lyric:")}`;
    Logger.debug`URL: ${url}/dictionary/register`;
    Logger.debug`Category: ${params.categoryName}`;
    Logger.debug`Dictionary: ${params.dictionaryName}`;
    Logger.debug`Version: ${params.dictionaryVersion}`;
    Logger.debug`Centric Entity: ${params.defaultCentricEntity}`;
  }

  /**
   * Log successful registration
   */
  private logSuccess(params: DictionaryRegistrationParams): void {
    Logger.successString("Dictionary registered successfully with Lyric");
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    - Category: ${params.categoryName}`));
    Logger.generic(chalk.gray(`    - Dictionary: ${params.dictionaryName}`));
    Logger.generic(chalk.gray(`    - Version: ${params.dictionaryVersion}`));
    Logger.generic(
      chalk.gray(`    - Centric Entity: ${params.defaultCentricEntity}`)
    );
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

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Categorize based on error content
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      const connectionError = ErrorFactory.connection(
        "Failed to connect to services",
        { originalError: error },
        [
          "Check that Lyric and Lectern services are running",
          "Verify the service URLs and ports",
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
        "Authentication failed with services",
        { originalError: error },
        [
          "Check your authentication credentials",
          "Verify API tokens are valid",
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

    // Generic fallback
    const genericError = ErrorFactory.connection(
      "Dictionary registration failed",
      { originalError: error },
      [
        "Check the service logs for more details",
        "Verify your registration parameters",
        "Ensure dictionary exists in Lectern first",
        "Try the registration again after a few moments",
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
