// src/cli/index.ts

import { Command } from "commander";
import { Config, CLIOutput } from "../types/cli";
import { parseCommandLineArgs } from "./options";
import { configureCommandOptions } from "./options";
import { validateEnvironment } from "../validations/environment";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

/**
 * Type definition for supported CLI profiles.
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
  config: Config;
  filePaths: string[];
  profile: CLIprofile;
  outputPath?: string;
  envConfig: any;
  options: any;
}

/**
 * Sets up the CLI environment and parses command-line arguments.
 * Fixed to apply defaults BEFORE validation.
 */
export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    Logger.debugString("Conductor CLI setup starting");

    // Configure command options
    configureCommandOptions(program);
    program.parse(process.argv);

    const commandName = program.args[0];
    if (!commandName) {
      throw ErrorFactory.args("No command specified", undefined, [
        "Provide a command to execute",
        "Use 'conductor --help' to see available commands",
        "Example: conductor upload -f data.csv",
      ]);
    }

    const command = program.commands.find((cmd) => cmd.name() === commandName);
    if (!command) {
      throw ErrorFactory.args(
        `Command '${commandName}' not found`,
        commandName,
        [
          "Check command spelling and case",
          "Use 'conductor --help' for available commands",
        ]
      );
    }

    const options = command.opts();
    const profile = determineProfile(commandName);

    Logger.debug`Parsed options: ${JSON.stringify(options)}`;

    // Create configuration with proper defaults FIRST
    const config = createConfigWithDefaults(options);

    // Then validate environment with defaults applied
    await validateEnvironmentForProfile(profile, config);

    // Parse CLI output with the proper config
    const cliOutput = parseCommandLineArgs({
      ...options,
      profile,
      ...(options.schemaFile ? { file: options.schemaFile } : {}),
      ...(options.analysisFile ? { file: options.analysisFile } : {}),
    });

    // Override with the config that has defaults properly applied
    cliOutput.config = config;

    Logger.debugString("CLI setup completed successfully");
    return cliOutput;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.validation(
      "CLI setup failed",
      {
        error: error instanceof Error ? error.message : String(error),
        args: process.argv,
      },
      [
        "Check command syntax and parameters",
        "Verify all required services are configured",
        "Use --debug flag for detailed error information",
        "Try 'conductor --help' for usage information",
      ]
    );
  }
}

function determineProfile(commandName: string): CLIprofile {
  const profileMap: Record<string, CLIprofile> = {
    upload: "upload",
    lecternUpload: "lecternUpload",
    lyricRegister: "lyricRegister",
    lyricUpload: "lyricUpload",
    maestroIndex: "maestroIndex",
    songUploadSchema: "songUploadSchema",
    songCreateStudy: "songCreateStudy",
    songSubmitAnalysis: "songSubmitAnalysis",
    songPublishAnalysis: "songPublishAnalysis",
  };

  const profile = profileMap[commandName];
  if (!profile) {
    const availableProfiles = Object.keys(profileMap).join(", ");
    throw ErrorFactory.args(
      `Unknown command profile: ${commandName}`,
      commandName,
      [`Available commands: ${availableProfiles}`]
    );
  }

  return profile;
}

/**
 * Create configuration with proper defaults applied
 */
function createConfigWithDefaults(options: any): Config {
  // Apply defaults first, then override with provided options
  const defaultConfig = {
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
      user: process.env.ELASTICSEARCH_USER || "elastic",
      password: process.env.ELASTICSEARCH_PASSWORD || "myelasticpassword",
      index: process.env.ELASTICSEARCH_INDEX || "conductor-data",
    },
    lectern: {
      url: process.env.LECTERN_URL || "http://localhost:3031",
      authToken: process.env.LECTERN_AUTH_TOKEN || "",
    },
    lyric: {
      url: process.env.LYRIC_URL || "http://localhost:3030",
      categoryId: process.env.CATEGORY_ID || "1",
      organization: process.env.ORGANIZATION || "OICR",
      maxRetries: parseInt(process.env.MAX_RETRIES || "10"),
      retryDelay: parseInt(process.env.RETRY_DELAY || "20000"),
    },
    song: {
      url: process.env.SONG_URL || "http://localhost:8080",
      authToken: process.env.AUTH_TOKEN || "123",
      studyId: process.env.STUDY_ID || "demo",
      studyName: process.env.STUDY_NAME || "string",
      organization: process.env.ORGANIZATION || "string",
      description: process.env.DESCRIPTION || "string",
      allowDuplicates: process.env.ALLOW_DUPLICATES === "true" || false,
      ignoreUndefinedMd5: process.env.IGNORE_UNDEFINED_MD5 === "true" || false,
      scoreUrl: process.env.SCORE_URL || "http://localhost:8087",
      dataDir: process.env.DATA_DIR || "./data",
      outputDir: process.env.OUTPUT_DIR || "./output",
    },
    maestroIndex: {
      url: process.env.INDEX_URL || "http://localhost:11235",
      repositoryCode: process.env.REPOSITORY_CODE,
      organization: process.env.ORGANIZATION,
      id: process.env.ID,
    },
    batchSize: parseInt(process.env.BATCH_SIZE || "1000"),
    delimiter: process.env.CSV_DELIMITER || ",",
  };

  // Now override with command line options
  return {
    elasticsearch: {
      url: options.url || defaultConfig.elasticsearch.url,
      user: options.user || defaultConfig.elasticsearch.user,
      password: options.password || defaultConfig.elasticsearch.password,
      index:
        options.index || options.indexName || defaultConfig.elasticsearch.index,
      templateFile: options.templateFile,
      templateName: options.templateName,
      alias: options.aliasName,
    },
    lectern: {
      url: options.lecternUrl || defaultConfig.lectern.url,
      authToken: options.authToken || defaultConfig.lectern.authToken,
    },
    lyric: {
      url: options.lyricUrl || defaultConfig.lyric.url,
      categoryName: options.categoryName,
      dictionaryName: options.dictName,
      dictionaryVersion: options.dictionaryVersion,
      defaultCentricEntity: options.defaultCentricEntity,
      dataDirectory: options.dataDirectory,
      categoryId: options.categoryId || defaultConfig.lyric.categoryId,
      organization: options.organization || defaultConfig.lyric.organization,
      maxRetries: options.maxRetries
        ? parseInt(options.maxRetries)
        : defaultConfig.lyric.maxRetries,
      retryDelay: options.retryDelay
        ? parseInt(options.retryDelay)
        : defaultConfig.lyric.retryDelay,
    },
    song: {
      url: options.songUrl || defaultConfig.song.url,
      authToken: options.authToken || defaultConfig.song.authToken,
      schemaFile: options.schemaFile,
      studyId: options.studyId || defaultConfig.song.studyId,
      studyName: options.studyName || defaultConfig.song.studyName,
      organization: options.organization || defaultConfig.song.organization,
      description: options.description || defaultConfig.song.description,
      analysisFile: options.analysisFile,
      allowDuplicates:
        options.allowDuplicates !== undefined
          ? options.allowDuplicates
          : defaultConfig.song.allowDuplicates,
      ignoreUndefinedMd5:
        options.ignoreUndefinedMd5 !== undefined
          ? options.ignoreUndefinedMd5
          : defaultConfig.song.ignoreUndefinedMd5,
      scoreUrl: options.scoreUrl || defaultConfig.song.scoreUrl,
      dataDir: options.dataDir || defaultConfig.song.dataDir,
      outputDir: options.outputDir || defaultConfig.song.outputDir,
      manifestFile: options.manifestFile,
    },
    maestroIndex: {
      url: options.indexUrl || defaultConfig.maestroIndex.url,
      repositoryCode:
        options.repositoryCode || defaultConfig.maestroIndex.repositoryCode,
      organization:
        options.organization || defaultConfig.maestroIndex.organization,
      id: options.id || defaultConfig.maestroIndex.id,
    },
    batchSize: options.batchSize
      ? parseInt(options.batchSize)
      : defaultConfig.batchSize,
    delimiter: options.delimiter || defaultConfig.delimiter,
  };
}

/**
 * Enhanced environment validation for specific profiles
 */
async function validateEnvironmentForProfile(
  profile: CLIprofile,
  config: Config
): Promise<void> {
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
      await validateEnvironment({
        elasticsearchUrl: config.elasticsearch.url,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.config(
        "Environment validation failed for Elasticsearch",
        "elasticsearch",
        [
          "Check Elasticsearch configuration and connectivity",
          "Verify ELASTICSEARCH_URL environment variable",
          "Ensure Elasticsearch service is running",
          "Use --url parameter to specify Elasticsearch URL",
        ]
      );
    }
  }

  Logger.debugString(
    `Environment validation completed for profile: ${profile}`
  );
}
