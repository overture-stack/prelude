import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { LyricService } from "../services/lyric/lyricService";

/**
 * Interface for Lectern schema response
 */
interface LecternSchema {
  name: string;
  description?: string;
  fields?: any[];
  meta?: any;
}

/**
 * Interface for Lectern dictionary response
 */
interface LecternDictionary {
  _id: string;
  name: string;
  version: string;
  schemas: LecternSchema[];
}

/**
 * Command for registering a dictionary with the Lyric service
 */
export class LyricRegistrationCommand extends Command {
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor() {
    super("Lyric Dictionary Registration");
  }

  /**
   * Fetches dictionary schema from Lectern to validate centric entity
   * @param lecternUrl Lectern server URL
   * @param dictionaryName Dictionary name
   * @param dictionaryVersion Dictionary version
   * @returns Promise resolving to array of schema names
   */
  private async fetchDictionarySchemas(
    lecternUrl: string,
    dictionaryName: string,
    dictionaryVersion: string
  ): Promise<string[]> {
    try {
      // Normalize URL
      const baseUrl = lecternUrl.endsWith("/")
        ? lecternUrl.slice(0, -1)
        : lecternUrl;

      // First, get all dictionaries to find the ID
      Logger.debug(`Fetching dictionaries from ${baseUrl}/dictionaries`);
      const dictionariesResponse = await axios.get(`${baseUrl}/dictionaries`);

      if (
        !dictionariesResponse.data ||
        !Array.isArray(dictionariesResponse.data)
      ) {
        throw new Error("Invalid response from Lectern");
      }

      // Find the specific dictionary by name and version
      const dictionary = dictionariesResponse.data.find(
        (dict: any) =>
          dict.name === dictionaryName && dict.version === dictionaryVersion
      );

      if (!dictionary || !dictionary._id) {
        throw new Error(
          `Dictionary '${dictionaryName}' version '${dictionaryVersion}' not found in Lectern`
        );
      }

      const dictId = dictionary._id;

      // Now fetch the dictionary details with schemas
      Logger.debug(
        `Fetching dictionary schema from ${baseUrl}/dictionaries/${dictId}`
      );
      const response = await axios.get(`${baseUrl}/dictionaries/${dictId}`);

      if (!response.data) {
        throw new Error("Invalid dictionary schema response: empty data");
      }

      // Ensure we have a properly typed response with schemas
      const dictionary_data = response.data as LecternDictionary;

      if (!dictionary_data.schemas || !Array.isArray(dictionary_data.schemas)) {
        throw new Error(
          "Invalid dictionary schema response: missing or invalid schemas array"
        );
      }

      // Extract schema names
      const schemaNames = dictionary_data.schemas.map((schema) => schema.name);
      Logger.debug(
        `Available schemas in dictionary: ${schemaNames.join(", ")}`
      );

      return schemaNames;
    } catch (error) {
      Logger.debug(
        `Error fetching schema information: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
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
      const lecternUrl =
        options.lecternUrl ||
        process.env.LECTERN_URL ||
        "http://localhost:3031";
      const categoryName = options.categoryName || process.env.CATEGORY_NAME;
      const dictionaryName = options.dictName || process.env.DICTIONARY_NAME;
      const dictionaryVersion =
        options.dictionaryVersion || process.env.DICTIONARY_VERSION;
      const defaultCentricEntity =
        options.defaultCentricEntity || process.env.DEFAULT_CENTRIC_ENTITY;

      // Check if required parameters are provided
      if (!lyricUrl || !categoryName || !dictionaryName || !dictionaryVersion) {
        throw new ConductorError(
          "Missing required parameters. Ensure all required parameters are provided.",
          ErrorCodes.INVALID_ARGS
        );
      }

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

      // Warn that centric entity is required by the API even though Swagger marks it as optional
      if (!defaultCentricEntity) {
        // Try to fetch entities to suggest valid options
        try {
          const entities = await this.fetchDictionarySchemas(
            lecternUrl,
            dictionaryName,
            dictionaryVersion
          );

          if (entities.length > 0) {
            throw new ConductorError(
              "The Lyric API requires a defaultCentricEntity parameter.\n Use -e or --default-centric-entity to specify a valid entity from the dictionary.\n ",
              ErrorCodes.INVALID_ARGS,
              {
                availableEntities: entities,
                suggestion: `Available entities are: ${entities.join(", ")}`,
              }
            );
          }
        } catch (error) {
          // If we couldn't fetch schemas, use a simpler error
          if (!(error instanceof ConductorError)) {
            Logger.error(
              `Could not fetch available entities: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            throw new ConductorError(
              "The Lyric API requires a defaultCentricEntity parameter.",
              ErrorCodes.INVALID_ARGS,
              {
                suggestion: `Use -e or --default-centric-entity to specify a valid entity from the dictionary`,
              }
            );
          }
          throw error;
        }
      }

      // Validate centric entity against dictionary schemas if provided
      let availableEntities: string[] = [];
      try {
        availableEntities = await this.fetchDictionarySchemas(
          lecternUrl,
          dictionaryName,
          dictionaryVersion
        );

        if (!availableEntities.includes(defaultCentricEntity)) {
          throw new ConductorError(
            `Entity '${defaultCentricEntity}' does not exist in this dictionary`,
            ErrorCodes.VALIDATION_FAILED,
            {
              availableEntities: availableEntities,
              suggestion: `Choose one of the available entities: ${availableEntities.join(
                ", "
              )}`,
            }
          );
        }

        Logger.debug(
          `Confirmed entity '${defaultCentricEntity}' exists in dictionary.`
        );
      } catch (error) {
        // If we can't validate the schema, log a warning but continue
        // This prevents the command from failing if Lectern is unreachable
        Logger.warn(
          `Could not validate centric entity against dictionary schema: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        Logger.warn(`Proceeding with registration without validation...`);
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

          // Special handling for entity not found errors
          if (
            error instanceof ConductorError &&
            error.message.includes("Entity") &&
            error.message.includes("does not exist in this dictionary")
          ) {
            // If we already have the list of available entities, use it
            if (availableEntities.length > 0) {
              throw new ConductorError(
                `Entity '${defaultCentricEntity}' does not exist in this dictionary`,
                ErrorCodes.VALIDATION_FAILED,
                {
                  availableEntities: availableEntities,
                  suggestion: `Available entities are: ${availableEntities.join(
                    ", "
                  )}. Try again with: conductor lyricRegister -c ${categoryName} --dict-name ${dictionaryName} -v ${dictionaryVersion} -e [entity]`,
                }
              );
            } else {
              // Otherwise try to fetch them now for the error message
              try {
                const schemas = await this.fetchDictionarySchemas(
                  lecternUrl,
                  dictionaryName,
                  dictionaryVersion
                );

                throw new ConductorError(
                  `Entity '${defaultCentricEntity}' does not exist in this dictionary`,
                  ErrorCodes.VALIDATION_FAILED,
                  {
                    availableEntities: schemas,
                    suggestion: `Available entities are: ${schemas.join(
                      ", "
                    )}. Try again with: conductor lyricRegister -c ${categoryName} --dict-name ${dictionaryName} -v ${dictionaryVersion} -e [entity]`,
                  }
                );
              } catch (schemaError) {
                // If we can't fetch schemas, just show a generic message
                throw new ConductorError(
                  `Entity '${defaultCentricEntity}' does not exist in this dictionary`,
                  ErrorCodes.VALIDATION_FAILED,
                  {
                    suggestion: `Check the dictionary schema and use a valid entity name with -e parameter`,
                  }
                );
              }
            }
          }

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
      Logger.generic(
        chalk.gray(`    - Centric Entity: ${defaultCentricEntity}`)
      );
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

        // Special handling for entity not found errors
        if (
          error.message.includes("Entity") &&
          error.message.includes("does not exist") &&
          details.availableEntities
        ) {
          Logger.info(
            `\nAvailable entities in this dictionary are: ${details.availableEntities.join(
              ", "
            )}`
          );
          if (details.suggestion) {
            Logger.tip(details.suggestion);
          }
        }

        // Add suggestions for other error types
        if (details.suggestion) {
          Logger.tip(details.suggestion);
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
   *
   * @param cliOutput - The parsed command line arguments
   * @returns A promise that resolves when validation is complete or rejects with an error
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

    // Note about centric entity - technically optional in our interface but required by API
    // We'll validate in execute() and provide helpful errors rather than failing early here

    // Validation passed
    return;
  }
}
