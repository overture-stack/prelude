// src/commands/lyricRegistrationCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { LyricRegistrationService } from "../services/lyric/LyricRegistrationService";
import { DictionaryRegistrationParams } from "../services/lyric/types";

/**
 * Command for registering a dictionary with the Lyric service
 * Updated to use error factory pattern for consistent error handling
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
      const serviceConfig = this.extractServiceConfig(options);

      // Create service instance
      const lyricService = new LyricRegistrationService(serviceConfig);

      // Check service health first
      const healthResult = await lyricService.checkHealth();
      if (!healthResult.healthy) {
        throw ErrorFactory.connection(
          "Lyric service is not healthy",
          {
            healthResult,
            serviceUrl: serviceConfig.url,
          },
          [
            "Check that Lyric service is running",
            `Verify the service URL: ${serviceConfig.url}`,
            "Check network connectivity",
            "Review service logs for errors",
          ]
        );
      }

      // Optional: Validate centric entity against Lectern
      if (options.lecternUrl) {
        await this.validateCentricEntity(
          registrationParams.defaultCentricEntity,
          registrationParams.dictionaryName,
          registrationParams.dictionaryVersion,
          options.lecternUrl
        );
      }

      // Register dictionary
      this.logRegistrationInfo(registrationParams, serviceConfig.url);

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
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Validate required parameters exist
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
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN,
    };
  }

  /**
   * Validate centric entity against Lectern dictionary
   */
  private async validateCentricEntity(
    centricEntity: string,
    dictionaryName: string,
    dictionaryVersion: string,
    lecternUrl: string
  ): Promise<void> {
    try {
      Logger.info`Validating centric entity against Lectern dictionary...`;

      // This is a simplified version - you'd import and use LecternService here
      // For now, just showing the pattern
      const entities = await this.fetchDictionaryEntities(
        lecternUrl,
        dictionaryName,
        dictionaryVersion
      );

      if (!entities.includes(centricEntity)) {
        throw ErrorFactory.validation(
          `Entity '${centricEntity}' does not exist in dictionary '${dictionaryName}'`,
          {
            availableEntities: entities,
            centricEntity,
            dictionaryName,
          },
          [
            `Available entities: ${entities.join(", ")}`,
            "Choose a valid entity from the dictionary",
            "Check the dictionary schema for correct entity names",
          ]
        );
      }

      Logger.success`Entity '${centricEntity}' validated against dictionary`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      Logger.warnString(
        `Could not validate centric entity: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      Logger.warnString("Proceeding without validation...");
    }
  }

  /**
   * Fetch available entities from Lectern dictionary
   * TODO: Replace with LecternService when refactored
   */
  private async fetchDictionaryEntities(
    lecternUrl: string,
    dictionaryName: string,
    dictionaryVersion: string
  ): Promise<string[]> {
    // Placeholder - would use LecternService here
    // This is just to show the pattern for validation
    return ["donor", "specimen", "sample"]; // Example entities
  }

  /**
   * Log registration information
   */
  private logRegistrationInfo(
    params: DictionaryRegistrationParams,
    url: string
  ): void {
    Logger.info`${chalk.bold.cyan("Registering Dictionary:")}`;
    Logger.infoString(`URL: ${url}/dictionary/register`);
    Logger.infoString(`Category: ${params.categoryName}`);
    Logger.infoString(`Dictionary: ${params.dictionaryName}`);
    Logger.infoString(`Version: ${params.dictionaryVersion}`);
    Logger.infoString(`Centric Entity: ${params.defaultCentricEntity}`);
  }

  /**
   * Log successful registration
   */
  private logSuccess(params: DictionaryRegistrationParams): void {
    Logger.successString("Dictionary registered successfully");
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
        "Failed to connect to Lyric service",
        { originalError: error },
        [
          "Check that Lyric service is running",
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
        "Authentication failed with Lyric service",
        { originalError: error },
        [
          "Check your authentication credentials",
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

    // Generic fallback
    const genericError = ErrorFactory.connection(
      "Dictionary registration failed",
      { originalError: error },
      [
        "Check the service logs for more details",
        "Verify your registration parameters",
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
