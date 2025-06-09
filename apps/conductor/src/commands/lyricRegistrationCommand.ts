// src/commands/lyricRegistrationCommand.ts
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { LyricRegistrationService } from "../services/lyric/LyricRegistrationService"; // Fixed import
import { DictionaryRegistrationParams } from "../services/lyric/types";

/**
 * Command for registering a dictionary with the Lyric service
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
      // Extract configuration - much cleaner now
      const registrationParams = this.extractRegistrationParams(options);
      const serviceConfig = this.extractServiceConfig(options);

      // Create service instance using new pattern - fixed variable name
      const lyricService = new LyricRegistrationService(serviceConfig);

      // Check service health first
      const healthResult = await lyricService.checkHealth();
      if (!healthResult.healthy) {
        throw new ConductorError(
          `Lyric service is not healthy: ${
            healthResult.message || "Unknown error"
          }`,
          ErrorCodes.CONNECTION_ERROR,
          { healthResult }
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

      // Register dictionary - much simpler now!
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
        throw new ConductorError(
          `${param.name} is required. Use --${param.key
            .replace(/([A-Z])/g, "-$1")
            .toLowerCase()} or set ${param.envVar} environment variable.`,
          ErrorCodes.INVALID_ARGS
        );
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
      Logger.info("Validating centric entity against Lectern dictionary...");

      // This is a simplified version - you'd import and use LecternService here
      // For now, just showing the pattern
      const entities = await this.fetchDictionaryEntities(
        lecternUrl,
        dictionaryName,
        dictionaryVersion
      );

      if (!entities.includes(centricEntity)) {
        throw new ConductorError(
          `Entity '${centricEntity}' does not exist in dictionary '${dictionaryName}'`,
          ErrorCodes.VALIDATION_FAILED,
          {
            availableEntities: entities,
            suggestion: `Available entities: ${entities.join(", ")}`,
          }
        );
      }

      Logger.info(`✓ Entity '${centricEntity}' validated against dictionary`);
    } catch (error) {
      if (error instanceof ConductorError) {
        throw error;
      }

      Logger.warn(
        `Could not validate centric entity: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      Logger.warn("Proceeding without validation...");
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
    Logger.info(`${chalk.bold.cyan("Registering Dictionary:")}`);
    Logger.info(`URL: ${url}/dictionary/register`);
    Logger.info(`Category: ${params.categoryName}`);
    Logger.info(`Dictionary: ${params.dictionaryName}`);
    Logger.info(`Version: ${params.dictionaryVersion}`);
    Logger.info(`Centric Entity: ${params.defaultCentricEntity}`);
  }

  /**
   * Log successful registration
   */
  private logSuccess(params: DictionaryRegistrationParams): void {
    Logger.success("Dictionary registered successfully");
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
    if (error instanceof ConductorError) {
      // Handle specific error types with helpful messages
      if (
        error.code === ErrorCodes.VALIDATION_FAILED &&
        error.details?.availableEntities
      ) {
        Logger.info(
          `\nAvailable entities: ${error.details.availableEntities.join(", ")}`
        );
      }

      if (error.details?.suggestion) {
        Logger.tip(error.details.suggestion);
      }

      return {
        success: false,
        errorMessage: error.message,
        errorCode: error.code,
        details: error.details,
      };
    }

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      errorMessage: `Dictionary registration failed: ${errorMessage}`,
      errorCode: ErrorCodes.CONNECTION_ERROR,
      details: { originalError: error },
    };
  }
}
