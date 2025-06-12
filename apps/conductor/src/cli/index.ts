// src/cli/index.ts - Simplified CLI setup using new configuration system

import { Command } from "commander";
import { Config, CLIOutput } from "../types/cli";
import { parseCommandLineArgs } from "./options";
import { configureCommandOptions } from "./options";
import { ServiceConfigManager } from "../config/serviceConfigManager";
import { validateEnvironment } from "../validations/environment";
import { Logger } from "../utils/logger";

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
 * Now uses the simplified configuration system.
 */
export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    Logger.debug("Conductor CLI");

    // Configure command options
    configureCommandOptions(program);

    Logger.debug("Raw arguments:", process.argv);
    program.parse(process.argv);

    // Get the command
    const commandName = program.args[0];

    // Get the specific command
    const command = program.commands.find((cmd) => cmd.name() === commandName);

    // Extract options for the specific command
    const options = command ? command.opts() : {};

    Logger.debug("Parsed options:", options);
    Logger.debug("Remaining arguments:", program.args);

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
      const esConfig = ServiceConfigManager.createElasticsearchConfig({
        url: options.url || undefined,
      });
      await validateEnvironment({
        elasticsearchUrl: esConfig.url,
      });
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

    Logger.debug("CLI setup completed successfully");
    return cliOutput;
  } catch (error) {
    console.error("Error during CLI setup:", error);
    throw error;
  }
}

/**
 * Create simplified configuration using the new configuration system
 */
function createSimplifiedConfig(options: any): Config {
  // Get base configurations from the new system
  const esConfig = ServiceConfigManager.createElasticsearchConfig({
    url: options.url || undefined,
    user: options.user || undefined,
    password: options.password || undefined,
    index: options.index || options.indexName || undefined,
    batchSize: options.batchSize ? parseInt(options.batchSize, 10) : undefined,
    delimiter: options.delimiter || undefined,
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
}
