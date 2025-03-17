import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { LyricService } from "../services/lyric/lyricService";

/**
 * Command for registering a dictionary with the Lyric service
 */
export class LyricRegistrationCommand extends Command {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor() {
    super("Lyric Dictionary Registration");
  }

  /**
   * Executes the Lyric dictionary registration process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration from options or environment
      const lyricUrl = options.lyricUrl || process.env.LYRIC_URL;
      const categoryName = options.categoryName || process.env.CATEGORY_NAME;
      const dictionaryName = options.dictName || process.env.DICTIONARY_NAME;
      const dictionaryVersion =
        options.dictionaryVersion || process.env.DICTIONARY_VERSION;
      const defaultCentricEntity =
        options.defaultCentricEntity || process.env.DEFAULT_CENTRIC_ENTITY;

      // Create Lyric service
      const lyricService = new LyricService(lyricUrl);

      // Check Lyric service health
      const isHealthy = await lyricService.checkHealth();
      if (!isHealthy) {
        throw new ConductorError(
          "Unable to establish connection with Lyric service",
          ErrorCodes.CONNECTION_ERROR,
          {
            url: lyricUrl,
            suggestion:
              "Verify the Lyric service is running and accessible at the provided URL",
          }
        );
      }

      // Print registration information
      Logger.info(`\x1b[1;36mRegistering Dictionary:\x1b[0m`);
      Logger.info(`URL: ${lyricService.getUrl()}/dictionary/register`);
      Logger.info(`Category: ${categoryName}`);
      Logger.info(`Dictionary: ${dictionaryName}`);
      Logger.info(`Version: ${dictionaryVersion}`);
      Logger.info(`Centric Entity: ${defaultCentricEntity}`);

      // Register dictionary with retries
      let result;
      let attempt = 0;
      let lastError;

      while (attempt < this.MAX_RETRIES) {
        attempt++;
        try {
          // Register dictionary
          result = await lyricService.registerDictionary({
            categoryName,
            dictionaryName,
            dictionaryVersion,
            defaultCentricEntity,
          });

          // Registration successful
          break;
        } catch (error) {
          lastError = error;

          // If it's a bad request (invalid parameters), don't retry
          if (
            error instanceof ConductorError &&
            error.details &&
            typeof error.details === "object" &&
            error.details.status === 400
          ) {
            throw error;
          }

          if (attempt < this.MAX_RETRIES) {
            Logger.warn(
              `Registration attempt ${attempt} failed, retrying in ${
                this.RETRY_DELAY / 1000
              }s...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, this.RETRY_DELAY)
            );
          }
        }
      }

      // Check if registration succeeded
      if (!result) {
        throw (
          lastError ||
          new ConductorError(
            "Failed to register dictionary after multiple attempts",
            ErrorCodes.CONNECTION_ERROR,
            {
              attempts: this.MAX_RETRIES,
              suggestion: "Check network connectivity and Lyric service status",
            }
          )
        );
      }

      // Log success message
      Logger.success(`Dictionary registered successfully`);
      Logger.generic(" ");
      Logger.generic(chalk.gray(`    - Category: ${categoryName}`));
      Logger.generic(chalk.gray(`    - Dictionary: ${dictionaryName}`));
      Logger.generic(chalk.gray(`    - Version: ${dictionaryVersion}`));
      Logger.generic(" ");

      return {
        success: true,
        details: result,
      };
    } catch (error) {
      // Special handling for common API errors to make them more user-friendly
      if (
        error instanceof ConductorError &&
        error.details &&
        typeof error.details === "object"
      ) {
        const details = error.details;

        // For Bad Request where dictionary already exists
        if (
          details.status === 400 &&
          ((details.message &&
            details.message.toString().includes("already exists")) ||
            error.message.includes("already exists"))
        ) {
          Logger.info(
            "\nThis dictionary may already exist in the Lyric service."
          );
          Logger.info(
            "Try with different parameters or check if it was previously registered."
          );

          // Add additional context for debugging
          if (details.params) {
            Logger.debug("Registration parameters:");
            Object.entries(details.params).forEach(([key, value]) => {
              Logger.debug(`  ${key}: ${value}`);
            });
          }
        }

        // Add suggestions for other error types when in debug mode
        if (details.suggestion && options.debug) {
          Logger.info(`\nSuggestion: ${details.suggestion}`);
        }
      }

      // Handle errors and return failure result
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof ConductorError
          ? error.code
          : ErrorCodes.CONNECTION_ERROR;

      // Extract additional details if available
      const errorDetails =
        error instanceof ConductorError ? error.details : undefined;

      return {
        success: false,
        errorMessage,
        errorCode,
        details: errorDetails,
      };
    }
  }

  /**
   * Validates command line arguments.
   * This implementation ensures that Lyric URL is provided.
   *
   * @param cliOutput - The parsed command line arguments
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Validate Lyric URL
    const lyricUrl = options.lyricUrl || process.env.LYRIC_URL;
    if (!lyricUrl) {
      throw new ConductorError(
        "Lyric URL not specified. Use --lyric-url option or set LYRIC_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate dictionary name
    const dictionaryName = options.dictName || process.env.DICTIONARY_NAME;
    if (!dictionaryName) {
      throw new ConductorError(
        "Dictionary name not specified. Use --dict-name option or set DICTIONARY_NAME environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate category name
    const categoryName = options.categoryName || process.env.CATEGORY_NAME;
    if (!categoryName) {
      throw new ConductorError(
        "Category name not specified. Use -c or --category-name option or set CATEGORY_NAME environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate dictionary version
    const dictionaryVersion =
      options.dictionaryVersion || process.env.DICTIONARY_VERSION;
    if (!dictionaryVersion) {
      throw new ConductorError(
        "Dictionary version not specified. Use -v or --dictionary-version option or set DICTIONARY_VERSION environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }
}
