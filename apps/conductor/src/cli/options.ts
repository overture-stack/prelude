/**
 * CLI Options Module - Updated with Lyric Data Loading
 *
 * This module configures the command-line options for the Conductor CLI.
 * It sets up the available commands, their options, and handles parsing arguments.
 */

import { Command } from "commander";
import { Profiles } from "../types/constants";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";

/**
 * Configures the command-line options for the Conductor CLI
 *
 * @param program - The Commander.js program instance
 */
export function configureCommandOptions(program: Command): void {
  // Global options
  program
    .version("1.0.0")
    .description("Conductor: Data Processing Pipeline")
    .option("-d, --debug", "Enable debug mode")
    // Add a custom action for the help option
    .addHelpCommand("help [command]", "Display help for a specific command")
    .on("--help", () => {
      // Call the reference commands after the default help
      Logger.showReferenceCommands();
    });

  // Upload command
  program
    .command("upload")
    .description("Upload data to Elasticsearch")
    .option("-f, --file <files...>", "Input files to process")
    .option("-i, --index <name>", "Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for uploads")
    .option("-d, --delimiter <char>", "CSV delimiter character")
    .option("-o, --output <path>", "Output directory for generated files")
    .option("--force", "Force overwrite of existing files")
    .option("--url <url>", "Elasticsearch URL")
    .option("--user <username>", "Elasticsearch username", "elastic")
    .option(
      "--password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .action(() => {
      /* Handled by main.ts */
    });

  // Setup indices command
  program
    .command("indexManagement")
    .description("Set up Elasticsearch indices and templates")
    .option("-t, --template-file <path>", "Template JSON file")
    .option("-n, --template-name <name>", "Template name")
    .option("-i, --index-name <name>", "Index name")
    .option("-a, --alias-name <name>", "Alias name")
    .option("-o, --output <path>", "Output directory for generated files")
    .option("--force", "Force overwrite of existing files")
    .option("--url <url>", "Elasticsearch URL")
    .option("--user <username>", "Elasticsearch username", "elastic")
    .option(
      "--password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .action(() => {
      /* Handled by main.ts */
    });

  // Lectern schema upload command
  program
    .command("lecternUpload")
    .description("Upload schema to Lectern server")
    .option("-s, --schema-file <path>", "Schema JSON file to upload")
    .option(
      "-u, --lectern-url <url>",
      "Lectern server URL",
      process.env.LECTERN_URL || "http://localhost:3031"
    )
    .option("-t, --auth-token <token>", "Authentication token", "")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });

  // Lyric dictionary registration command
  program
    .command("lyricRegister")
    .description("Register a dictionary with Lyric service")
    .option(
      "-u, --lyric-url <url>",
      "Lyric server URL",
      process.env.LYRIC_URL || "http://localhost:3030"
    )
    .option(
      "-c, --category-name <name>",
      "Category name",
      process.env.CATEGORY_NAME || "clinical"
    )
    .option(
      "-d, --dictionary-name <name>",
      "Dictionary name",
      process.env.DICTIONARY_NAME || "clinical_data_dictionary"
    )
    .option(
      "-v, --dictionary-version <version>",
      "Dictionary version",
      process.env.DICTIONARY_VERSION || "1.0"
    )
    .option(
      "-e, --default-centric-entity <entity>",
      "Default centric entity",
      process.env.DEFAULT_CENTRIC_ENTITY || "clinical_data"
    )
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });

  // Lyric data loading command
  program
    .command("lyricData")
    .description("Load data into Lyric service")
    .option(
      "-u, --lyric-url <url>",
      "Lyric server URL",
      process.env.LYRIC_URL || "http://localhost:3030"
    )
    .option(
      "-l, --lectern-url <url>",
      "Lectern server URL",
      process.env.LECTERN_URL || "http://localhost:3031"
    )
    .option(
      "-d, --data-directory <path>",
      "Directory containing CSV data files",
      process.env.LYRIC_DATA
    )
    .option(
      "-c, --category-id <id>",
      "Category ID",
      process.env.CATEGORY_ID || "1"
    )
    .option(
      "-g, --organization <name>",
      "Organization name",
      process.env.ORGANIZATION || "OICR"
    )
    .option(
      "-m, --max-retries <number>",
      "Maximum number of retry attempts",
      process.env.MAX_RETRIES || "10"
    )
    .option(
      "-r, --retry-delay <milliseconds>",
      "Delay between retry attempts in milliseconds",
      process.env.RETRY_DELAY || "20000"
    )
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Parses command-line arguments into a standardized CLIOutput object
 *
 * @param options - Parsed command-line options
 * @returns A CLIOutput object for command execution
 */
export function parseCommandLineArgs(options: any): CLIOutput {
  // Log raw options for debugging
  Logger.debug(`Raw options: ${JSON.stringify(options)}`);
  Logger.debug(`Process argv: ${process.argv.join(" ")}`);

  // Determine the profile from options
  let profile = options.profile || Profiles.UPLOAD;

  // Special handling for lyricData command to ensure data directory is captured
  if (profile === Profiles.LYRIC_DATA) {
    // Check for a positional argument that might be the data directory
    const positionalArgs = process.argv
      .slice(3)
      .filter((arg) => !arg.startsWith("-"));

    if (positionalArgs.length > 0 && !options.dataDirectory) {
      options.dataDirectory = positionalArgs[0];
      Logger.debug(
        `Captured data directory from positional argument: ${options.dataDirectory}`
      );
    }
  }

  // Parse file paths
  const filePaths = Array.isArray(options.file)
    ? options.file
    : options.file
    ? [options.file]
    : [];

  // Add template file to filePaths if present
  if (options.templateFile && !filePaths.includes(options.templateFile)) {
    filePaths.push(options.templateFile);
  }

  // Add schema file to filePaths if present for Lectern upload
  if (options.schemaFile && !filePaths.includes(options.schemaFile)) {
    filePaths.push(options.schemaFile);
  }

  Logger.debug(`Parsed profile: ${profile}`);
  Logger.debug(`Parsed file paths: ${filePaths.join(", ")}`);

  // Create config object with support for Lectern and Lyric specific configurations
  const config = {
    elasticsearch: {
      url:
        options.url || process.env.ELASTICSEARCH_URL || "http://localhost:9200",
      user: options.user || process.env.ELASTICSEARCH_USER,
      password: options.password || process.env.ELASTICSEARCH_PASSWORD,
      index: options.index || options.indexName || "conductor-data",
      templateFile: options.templateFile,
      templateName: options.templateName,
      alias: options.aliasName,
    },
    lectern: {
      url:
        options.lecternUrl ||
        process.env.LECTERN_URL ||
        "http://localhost:3031",
      authToken: options.authToken || process.env.LECTERN_AUTH_TOKEN || "",
    },
    lyric: {
      url: options.lyricUrl || process.env.LYRIC_URL || "http://localhost:3030",
      categoryName:
        options.categoryName || process.env.CATEGORY_NAME || "clinical",
      dictionaryName:
        options.dictionaryName ||
        process.env.DICTIONARY_NAME ||
        "clinical_data_dictionary",
      dictionaryVersion:
        options.dictionaryVersion || process.env.DICTIONARY_VERSION || "1.0",
      defaultCentricEntity:
        options.defaultCentricEntity ||
        process.env.DEFAULT_CENTRIC_ENTITY ||
        "clinical_data",
      // Data loading specific options
      dataDirectory: options.dataDirectory || process.env.LYRIC_DATA,
      categoryId: options.categoryId || process.env.CATEGORY_ID || "1",
      organization: options.organization || process.env.ORGANIZATION || "OICR",
      maxRetries: options.maxRetries
        ? parseInt(options.maxRetries)
        : process.env.MAX_RETRIES
        ? parseInt(process.env.MAX_RETRIES)
        : 10,
      retryDelay: options.retryDelay
        ? parseInt(options.retryDelay)
        : process.env.RETRY_DELAY
        ? parseInt(process.env.RETRY_DELAY)
        : 20000,
    },
    batchSize: options.batchSize ? parseInt(options.batchSize, 10) : 1000,
    delimiter: options.delimiter || ",",
  };

  // Additional logging for Lyric data directory
  if (profile === Profiles.LYRIC_DATA) {
    Logger.debug(`Final data directory: ${config.lyric.dataDirectory}`);
  }

  // Build the standardized CLI output
  return {
    profile,
    filePaths,
    outputPath: options.output,
    config,
    options,
    envConfig: {
      elasticsearchUrl: config.elasticsearch.url,
      esUser: config.elasticsearch.user,
      esPassword: config.elasticsearch.password,
      indexName: config.elasticsearch.index,
      lecternUrl: config.lectern.url,
      lyricUrl: config.lyric.url,
    },
  };
}
