/**
 * Index Management Command
 *
 * Command implementation for managing Elasticsearch indices and templates.
 * Handles creation and configuration of templates, indices, and aliases.
 */

import * as fs from "fs";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorCodes } from "../utils/errors";
import {
  createClientFromConfig,
  validateConnection,
  indexExists,
  createIndex,
} from "../services/elasticsearch";
import {
  templateExists,
  createTemplate,
  extractTemplateInfo,
  TemplateInfo,
} from "../services/elasticsearch/templates";
import * as path from "path";

export class IndexManagementCommand extends Command {
  constructor() {
    super("indexManagement");
    this.defaultOutputFileName = "elasticsearch-setup.json";
  }

  /**
   * Validates command line arguments and configuration
   * @param cliOutput The CLI configuration and inputs
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { config, options } = cliOutput;

    // Extract and validate template file
    const templateFile =
      options.templateFile || config.elasticsearch?.templateFile;

    if (!templateFile) {
      throw new ConductorError(
        "Template file not specified. Use --template-file or configure in settings.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Resolve to absolute path and validate file existence
    const resolvedTemplatePath = path.resolve(process.cwd(), templateFile);

    if (!fs.existsSync(resolvedTemplatePath)) {
      throw new ConductorError(
        `Template file not found at ${resolvedTemplatePath}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Validate template file can be parsed
    try {
      const rawContent = fs.readFileSync(resolvedTemplatePath, "utf-8");
      JSON.parse(rawContent);
    } catch (error) {
      throw new ConductorError(
        `Failed to parse template file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.INVALID_FILE,
        error
      );
    }

    // Validate Elasticsearch connection configuration
    const elasticsearchUrl =
      config.elasticsearch?.url || process.env.ELASTICSEARCH_URL;

    if (!elasticsearchUrl) {
      throw new ConductorError(
        "Elasticsearch URL not specified. Use --url or set ELASTICSEARCH_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate username and password
    const username =
      config.elasticsearch?.user || process.env.ELASTICSEARCH_USER;

    const password =
      config.elasticsearch?.password || process.env.ELASTICSEARCH_PASSWORD;

    if (!username || !password) {
      throw new ConductorError(
        "Elasticsearch username or password not specified.",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Optional additional validations
    const templateName =
      options.templateName || config.elasticsearch?.templateName;

    const indexName = options.indexName || config.elasticsearch?.index;

    const aliasName = options.aliasName || config.elasticsearch?.alias;

    // While these are optional, we can add some basic validation
    if (templateName && typeof templateName !== "string") {
      throw new ConductorError(
        "Invalid template name format.",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (indexName && typeof indexName !== "string") {
      throw new ConductorError(
        "Invalid index name format.",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (aliasName && typeof aliasName !== "string") {
      throw new ConductorError(
        "Invalid alias name format.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }

  /**
   * Executes the index management process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, options } = cliOutput;

    try {
      // Extract template file path
      const templateFile =
        options.templateFile || config.elasticsearch?.templateFile;

      // Load template content
      const rawContent = fs.readFileSync(templateFile, "utf-8");
      const templateContent = JSON.parse(rawContent);

      // Extract information from template
      const templateInfo = extractTemplateInfo(templateContent);

      // Set template name, index name, and alias with smart defaults
      const templateName =
        options.templateName ||
        config.elasticsearch?.templateName ||
        `template-${Date.now()}`;

      // Use index name from CLI/config or extract from template, or generate default
      const indexName =
        options.indexName ||
        config.elasticsearch?.index ||
        templateInfo.defaultIndexName ||
        `index-${Date.now()}`;

      // Use alias from CLI/config or extract from template, or use indexName with suffix
      const aliasName =
        options.aliasName ||
        config.elasticsearch?.alias ||
        templateInfo.defaultAliasName ||
        `${indexName}-alias`;

      // Log names
      if (!options.templateName && !config.elasticsearch?.templateName) {
        Logger.info(
          `No template name provided. Using generated name: ${templateName}`
        );
      }

      if (
        !options.indexName &&
        !config.elasticsearch?.index &&
        templateInfo.defaultIndexName
      ) {
        Logger.info(`Using index name from template pattern: ${indexName}`);
      } else if (!options.indexName && !config.elasticsearch?.index) {
        Logger.info(
          `No index name provided. Using generated name: ${indexName}`
        );
      }

      if (templateInfo.defaultAliasName) {
        Logger.info(`Using alias from template: ${aliasName}`);
      }

      // Create Elasticsearch client
      const client = createClientFromConfig(config);

      // Validate Elasticsearch connection
      Logger.info(`Validating Elasticsearch connection...`);
      try {
        await validateConnection(client);
        Logger.info(
          `Connected to Elasticsearch at ${config.elasticsearch.url}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Log more detailed connection failure information
        Logger.error(`Failed to connect to Elasticsearch: ${errorMessage}`);

        // Provide more specific guidance based on the error
        if (errorMessage.includes("ECONNREFUSED")) {
          Logger.error("Connection refused. Is Elasticsearch running?");
        } else if (errorMessage.includes("authentication")) {
          Logger.error(
            "Authentication failed. Check your username and password."
          );
        }

        throw new ConductorError(
          `Elasticsearch connection failed: ${errorMessage}`,
          ErrorCodes.CONNECTION_ERROR,
          error
        );
      }

      // Step 1: Check if template exists
      Logger.info(`Checking if template ${templateName} exists...`);
      const isTemplateExists = await templateExists(client, templateName);

      // Step 2: Create template if it doesn't exist
      if (!isTemplateExists) {
        Logger.info(`Template ${templateName} does not exist, creating...`);
        try {
          await createTemplate(client, templateName, templateContent);
          Logger.info(
            `Elasticsearch ${templateName} template created successfully`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          Logger.error(
            `Failed to create template ${templateName}: ${errorMessage}`
          );
          throw new ConductorError(
            `Failed to create template ${templateName}`,
            ErrorCodes.ES_ERROR,
            error
          );
        }
      } else {
        Logger.info(
          `Template ${templateName} already exists, skipping creation.`
        );
      }

      // Step 3: Check if index exists
      Logger.info(`Checking if index ${indexName} exists...`);
      const isIndexExists = await indexExists(client, indexName);

      // Step 4: Create index with alias if it doesn't exist
      if (!isIndexExists) {
        Logger.info(
          `Index ${indexName} does not exist, creating with alias ${aliasName}...`
        );
        try {
          // Create index with the alias, using settings from template if available
          const indexSettings: Record<string, any> = {
            aliases: {
              [aliasName]: {},
            },
          };

          // Apply settings from template explicitly if available
          if (templateInfo.numberOfShards || templateInfo.numberOfReplicas) {
            indexSettings.settings = {
              number_of_shards: templateInfo.numberOfShards,
              number_of_replicas: templateInfo.numberOfReplicas,
            };
          }

          await createIndex(client, indexName, indexSettings);
          Logger.info(`Created index: ${indexName}`);
          Logger.info(
            `Index ${indexName} with alias ${aliasName} created successfully.`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          Logger.error(
            `Failed to create index ${indexName}. Error: ${errorMessage}`
          );
          throw new ConductorError(
            `Failed to create index ${indexName} with alias ${aliasName}`,
            ErrorCodes.ES_ERROR,
            error
          );
        }
      } else {
        Logger.info(`Index ${indexName} already exists, skipping creation.`);
      }

      Logger.info(`Elasticsearch setup completed successfully.`);

      // Return successful result
      return {
        success: true,
        details: {
          templateName,
          indexName,
          aliasName,
          templateInfo: {
            defaultIndexNameFromPattern: templateInfo.defaultIndexName,
            defaultAliasFromTemplate: templateInfo.defaultAliasName,
            shards: templateInfo.numberOfShards,
            replicas: templateInfo.numberOfReplicas,
          },
        },
      };
    } catch (error) {
      // Handle errors and return failure result
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof ConductorError
          ? error.code
          : ErrorCodes.CONNECTION_ERROR;

      return {
        success: false,
        errorMessage,
        errorCode,
      };
    }
  }
}
