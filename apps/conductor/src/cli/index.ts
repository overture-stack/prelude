// src/cli/index.ts - Simplified CLI setup using new configuration system
// Updated to use error factory pattern for consistent error handling

import { Command } from "commander";
import { Config, CLIOutput } from "../types/cli";
import { parseCommandLineArgs } from "./options";
import { configureCommandOptions } from "./options";
import { ServiceConfigManager } from "../config/serviceConfigManager";
import { validateEnvironment } from "../validations/environment";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

/**
 * Type definition for supported CLI profiles.
 * This should match the CommandRegistry command names exactly.
 */
type CLIprofile =
  | "upload"
  | "lecternUpload"
  | "lyricRegister"
  | "lyricUpload"
  | "maestroIndex"
  | "songUploadSchema"
  | "songCreateStudy"
  | "songSubmitAnalysis"
  | "songPublishAnalysis";

/**
 * Standardized output from the CLI parsing process.
 */
interface CLIOutputInternal {
  /** Configuration settings for the command */
  config: Config;

  /** List of input file paths specified by the user */
  filePaths: string[];

  /** The selected profile/command to execute */
  profile: CLIprofile;

  /** Optional output directory path */
  outputPath?: string;

  /** Environment configuration */
  envConfig: any;

  /** Raw command options for command-specific handling */
  options: any;
}

/**
 * Sets up the CLI environment and parses command-line arguments.
 * Now uses the simplified configuration system with enhanced error handling.
 */
export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    Logger.debug`Conductor CLI`;

    // Configure command options
    configureCommandOptions(program);

    Logger.debug`Raw arguments: ${process.argv.join(" ")}`;
    program.parse(process.argv);

    // Get the command
    const commandName = program.args[0];

    if (!commandName) {
      throw ErrorFactory.args("No command specified", [
        "Specify a command to run",
        "Use 'conductor --help' to see available commands",
        "Example: conductor upload -f data.csv",
      ]);
    }

    // Get the specific command
    const command = program.commands.find((cmd) => cmd.name() === commandName);

    if (!command) {
      throw ErrorFactory.args(`Unknown command: ${commandName}`, [
        "Use 'conductor --help' to see available commands",
        "Check the command spelling",
        "Ensure you're using the correct command name",
      ]);
    }

    // Extract options for the specific command
    const options = command.opts();

    Logger.debug`Parsed options: ${JSON.stringify(options, null, 2)}`;
    Logger.debug`Remaining arguments: ${program.args.join(", ")}`;

    // Determine the profile based on the command name
    let profile: CLIprofile = "upload"; // Default to upload
    switch (commandName) {
      case "upload":
        profile = "upload";
        break;
      case "lecternUpload":
        profile = "lecternUpload";
        break;
      case "lyricRegister":
        profile = "lyricRegister";
        break;
      case "lyricUpload":
        profile = "lyricUpload";
        break;
      case "maestroIndex":
        profile = "maestroIndex";
        break;
      case "songUploadSchema":
        profile = "songUploadSchema";
        break;
      case "songCreateStudy":
        profile = "songCreateStudy";
        break;
      case "songSubmitAnalysis":
        profile = "songSubmitAnalysis";
        break;
      case "songPublishAnalysis":
        profile = "songPublishAnalysis";
        break;
      default:
        throw ErrorFactory.args(`Unsupported command: ${commandName}`, [
          "This command is not yet implemented",
          "Use 'conductor --help' to see available commands",
          "Check for typos in the command name",
        ]);
    }

    // Validate environment for services that need it
    // Skip validation for services that don't use Elasticsearch
    const skipElasticsearchValidation: CLIprofile[] = [
      "lecternUpload",
      "lyricRegister",
      "lyricUpload",
      "songUploadSchema",
      "songCreateStudy",
      "songSubmitAnalysis",
      "songPublishAnalysis",
    ];

    if (!skipElasticsearchValidation.includes(profile)) {
      try {
        const esConfig = ServiceConfigManager.createElasticsearchConfig({
          url: options.url || "http://localhost:9200", // Ensure default URL
        });
        await validateEnvironment({
          elasticsearchUrl: esConfig.url,
        });
      } catch (error) {
        throw ErrorFactory.environment(
          "Environment validation failed",
          { profile, originalError: error },
          [
            "Check Elasticsearch configuration",
            "Verify service URLs are accessible",
            "Use --debug for detailed error information",
          ]
        );
      }
    }

    // Create simplified configuration using new system
    const config = createSimplifiedConfig(options);

    // Parse command-line arguments into CLIOutput
    const cliOutput = parseCommandLineArgs({
      ...options,
      profile,
      // Ensure schema file is added to filePaths for relevant uploads
      ...(options.schemaFile ? { file: options.schemaFile } : {}),
      // Ensure analysis file is added to filePaths for SONG analysis submission
      ...(options.analysisFile ? { file: options.analysisFile } : {}),
    });

    // Override with simplified config
    cliOutput.config = config;

    Logger.debug`CLI setup completed successfully`;
    return cliOutput;
  } catch (error) {
    // If it's already a ConductorError, rethrow it
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Wrap unexpected errors
    throw ErrorFactory.args("CLI setup failed", [
      "Check command line arguments",
      "Use --help for usage information",
      "Use --debug for detailed error information",
    ]);
  }
}

/**
 * Create simplified configuration using the new configuration system
 */
function createSimplifiedConfig(options: any): Config {
  try {
    // Get base configurations from the new system
    const esConfig = ServiceConfigManager.createElasticsearchConfig({
      url: options.url || "http://localhost:9200", // Ensure default URL
      user: options.user || "elastic",
      password: options.password || "myelasticpassword",
      index: options.index || options.indexName || undefined,
      batchSize: options.batchSize ? parseInt(options.batchSize, 10) : 100,
      delimiter: options.delimiter || `,`,
    });

    const lecternConfig = ServiceConfigManager.createLecternConfig({
      url: options.lecternUrl || undefined,
      authToken: options.authToken || undefined,
    });

    const lyricConfig = ServiceConfigManager.createLyricConfig({
      url: options.lyricUrl || undefined,
      categoryId: options.categoryId || undefined,
      organization: options.organization || undefined,
      maxRetries: options.maxRetries ? parseInt(options.maxRetries) : undefined,
      retryDelay: options.retryDelay ? parseInt(options.retryDelay) : undefined,
    });

    const songConfig = ServiceConfigManager.createSongConfig({
      url: options.songUrl || undefined,
      authToken: options.authToken || undefined,
    });

    const scoreConfig = ServiceConfigManager.createScoreConfig({
      url: options.scoreUrl || undefined,
      authToken: options.authToken || undefined,
    });

    const maestroConfig = ServiceConfigManager.createMaestroConfig({
      url: options.indexUrl || undefined,
    });

    // Build the simplified config object
    return {
      elasticsearch: {
        url: esConfig.url,
        user: esConfig.user,
        password: esConfig.password,
        index: esConfig.index,
        templateFile: options.templateFile,
        templateName: options.templateName,
        alias: options.aliasName,
      },
      lectern: {
        url: lecternConfig.url,
        authToken: lecternConfig.authToken,
      },
      lyric: {
        url: lyricConfig.url,
        categoryName: options.categoryName || "conductor-category",
        dictionaryName: options.dictName,
        dictionaryVersion: options.dictionaryVersion,
        defaultCentricEntity: options.defaultCentricEntity,
        dataDirectory: options.dataDirectory,
        categoryId: lyricConfig.categoryId,
        organization: lyricConfig.organization,
        maxRetries: lyricConfig.maxRetries,
        retryDelay: lyricConfig.retryDelay,
      },
      song: {
        url: songConfig.url,
        authToken: songConfig.authToken,
        schemaFile: options.schemaFile,
        studyId: options.studyId || "demo",
        studyName: options.studyName || "string",
        organization: options.organization || lyricConfig.organization,
        description: options.description || "string",
        analysisFile: options.analysisFile,
        allowDuplicates: options.allowDuplicates || false,
        ignoreUndefinedMd5: options.ignoreUndefinedMd5 || false,
        // Combined Score functionality
        scoreUrl: scoreConfig.url,
        dataDir: options.dataDir || "./data",
        outputDir: options.outputDir || "./output",
        manifestFile: options.manifestFile,
      },
      maestroIndex: {
        url: maestroConfig.url,
        repositoryCode: options.repositoryCode,
        organization: options.organization,
        id: options.id,
      },
      batchSize: esConfig.batchSize,
      delimiter: esConfig.delimiter,
    };
  } catch (error) {
    throw ErrorFactory.validation(
      "Configuration creation failed",
      { options, originalError: error },
      [
        "Check command line arguments",
        "Verify configuration values are valid",
        "Use --help for parameter information",
      ]
    );
  }
}
