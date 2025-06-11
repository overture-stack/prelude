/**
 * CLI Options Module - Enhanced with ErrorFactory patterns
 *
 * This module configures the command-line options for the Conductor CLI.
 * Updated to reflect the refactored SONG/Score services and enhanced error handling.
 */

import { Command } from "commander";
import { Profiles } from "../types/constants";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

/**
 * Configures the command-line options for the Conductor CLI
 * Enhanced with ErrorFactory patterns for better error handling
 * @param program - The Commander.js program instance
 */
export function configureCommandOptions(program: Command): void {
  try {
    // Global options with enhanced error handling
    program
      .version("1.0.0")
      .description("Conductor: Data Processing Pipeline")
      .option("--debug", "Enable debug mode")
      // Add a custom action for the help option
      .addHelpCommand("help [command]", "Display help for a specific command")
      .on("--help", () => {
        // Call the reference commands after the default help
        Logger.showReferenceCommands();
      });

    // Enhanced command configuration with validation
    configureUploadCommand(program);
    configureLecternUploadCommand(program);
    configureLyricRegisterCommand(program);
    configureLyricUploadCommand(program);
    configureMaestroIndexCommand(program);
    configureSongUploadSchemaCommand(program);
    configureSongCreateStudyCommand(program);
    configureSongSubmitAnalysisCommand(program);
    configureSongPublishAnalysisCommand(program);

    Logger.debugString("CLI command options configured successfully");
  } catch (error) {
    throw ErrorFactory.validation(
      "Failed to configure CLI command options",
      { error: error instanceof Error ? error.message : String(error) },
      [
        "CLI configuration may be corrupted",
        "Check for conflicting command definitions",
        "Try restarting the application",
        "Contact support if the problem persists",
      ]
    );
  }
}

/**
 * Configure upload command with enhanced validation
 */
function configureUploadCommand(program: Command): void {
  program
    .command("upload")
    .description("Upload data to Elasticsearch")
    .option("-f, --file <files...>", "Input files to process")
    .option("-i, --index <name>", "Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for uploads")
    .option("--delimiter <char>", "CSV delimiter character")
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
}

/**
 * Configure Lectern upload command with enhanced validation
 */
function configureLecternUploadCommand(program: Command): void {
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
}

/**
 * Configure Lyric dictionary registration command with enhanced validation
 */
function configureLyricRegisterCommand(program: Command): void {
  program
    .command("lyricRegister")
    .description("Register a dictionary with Lyric service")
    .option(
      "-u, --lyric-url <url>",
      "Lyric server URL",
      process.env.LYRIC_URL || "http://localhost:3030"
    )
    .option("-c, --category-name <name>", "Category name")
    .option("--dict-name <name>", "Dictionary name")
    .option("-v, --dictionary-version <version>", "Dictionary version")
    .option("-e, --default-centric-entity <entity>", "Default centric entity")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Configure Lyric data loading command with enhanced validation
 */
function configureLyricUploadCommand(program: Command): void {
  program
    .command("lyricUpload")
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
      process.env.RETRY_DELAY || "1000"
    )
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Configure repository indexing command with enhanced validation
 */
function configureMaestroIndexCommand(program: Command): void {
  program
    .command("maestroIndex")
    .description("Index a repository with optional filtering")
    .option(
      "--index-url <url>",
      "Indexing service URL",
      process.env.INDEX_URL || "http://localhost:11235"
    )
    .option(
      "--repository-code <code>",
      "Repository code to index",
      process.env.REPOSITORY_CODE
    )
    .option(
      "--organization <name>",
      "Organization name filter",
      process.env.ORGANIZATION
    )
    .option("--id <id>", "Specific ID to index", process.env.ID)
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Skip confirmation prompts")
    .option("--debug", "Enable detailed debug logging")
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Configure SONG schema upload command with enhanced validation
 */
function configureSongUploadSchemaCommand(program: Command): void {
  program
    .command("songUploadSchema")
    .description("Upload schema to SONG server")
    .option("-s, --schema-file <path>", "Schema JSON file to upload")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option(
      "-t, --auth-token <token>",
      "Authentication token",
      process.env.AUTH_TOKEN || "123"
    )
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Configure SONG study creation command with enhanced validation
 */
function configureSongCreateStudyCommand(program: Command): void {
  program
    .command("songCreateStudy")
    .description("Create study in SONG server")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option("-i, --study-id <id>", "Study ID", process.env.STUDY_ID || "demo")
    .option(
      "-n, --study-name <name>",
      "Study name",
      process.env.STUDY_NAME || "string"
    )
    .option(
      "-g, --organization <name>",
      "Organization name",
      process.env.ORGANIZATION || "string"
    )
    .option(
      "--description <text>",
      "Study description",
      process.env.DESCRIPTION || "string"
    )
    .option(
      "-t, --auth-token <token>",
      "Authentication token",
      process.env.AUTH_TOKEN || "123"
    )
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force creation even if study exists", false)
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Configure SONG analysis submission command with enhanced validation
 */
function configureSongSubmitAnalysisCommand(program: Command): void {
  program
    .command("songSubmitAnalysis")
    .description("Submit analysis to SONG and upload files to Score")
    .option("-a, --analysis-file <path>", "Analysis JSON file to submit")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option(
      "-s, --score-url <url>",
      "Score server URL",
      process.env.SCORE_URL || "http://localhost:8087"
    )
    .option("-i, --study-id <id>", "Study ID", process.env.STUDY_ID || "demo")
    .option("--allow-duplicates", "Allow duplicate analysis submissions", false)
    .option(
      "-d, --data-dir <path>",
      "Directory containing data files",
      process.env.DATA_DIR || "./data"
    )
    .option(
      "--output-dir <path>",
      "Directory for manifest file output",
      process.env.OUTPUT_DIR || "./output"
    )
    .option(
      "-m, --manifest-file <path>",
      "Path for manifest file",
      process.env.MANIFEST_FILE
    )
    .option(
      "-t, --auth-token <token>",
      "Authentication token",
      process.env.AUTH_TOKEN || "123"
    )
    .option(
      "--ignore-undefined-md5",
      "Ignore files with undefined MD5 checksums",
      false
    )
    .option("-o, --output <path>", "Output directory for response logs")
    .option(
      "--force",
      "Force studyId from command line instead of from file",
      false
    )
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Configure SONG publish analysis command with enhanced validation
 */
function configureSongPublishAnalysisCommand(program: Command): void {
  program
    .command("songPublishAnalysis")
    .description("Publish analysis in SONG server")
    .option("-a, --analysis-id <id>", "Analysis ID to publish")
    .option("-i, --study-id <id>", "Study ID", process.env.STUDY_ID || "demo")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option(
      "-t, --auth-token <token>",
      "Authentication token",
      process.env.AUTH_TOKEN || "123"
    )
    .option(
      "--ignore-undefined-md5",
      "Ignore files with undefined MD5 checksums",
      false
    )
    .option("-o, --output <path>", "Output directory for response logs")
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Parses command-line arguments into a standardized CLIOutput object
 * Enhanced with ErrorFactory patterns for better error handling
 *
 * @param options - Parsed command-line options
 * @returns A CLIOutput object for command execution
 */
export function parseCommandLineArgs(options: any): CLIOutput {
  try {
    // Enhanced logging for debugging
    Logger.debugString(`Raw options: ${JSON.stringify(options, null, 2)}`);
    Logger.debugString(`Process argv: ${process.argv.join(" ")}`);

    // Enhanced profile determination with validation
    let profile = options.profile || (Profiles.UPLOAD as any);

    if (!profile || typeof profile !== "string") {
      throw ErrorFactory.args("Invalid or missing command profile", undefined, [
        "Ensure a valid command is specified",
        "Use 'conductor --help' for available commands",
        "Check command spelling and syntax",
      ]);
    }

    // Enhanced file path parsing with validation
    const filePaths = parseFilePaths(options);

    // Enhanced configuration creation with validation
    const config = createConfigFromOptions(options);

    Logger.debugString(`Parsed profile: ${profile}`);
    Logger.debugString(`Parsed file paths: ${filePaths.join(", ")}`);

    // Build the standardized CLI output
    return {
      profile,
      filePaths,
      outputPath: options.output,
      config,
      options,
      envConfig: createEnvConfig(config),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.validation(
      "Failed to parse command line arguments",
      {
        options: Object.keys(options),
        error: error instanceof Error ? error.message : String(error),
      },
      [
        "Check command syntax and parameters",
        "Verify all required arguments are provided",
        "Use --debug flag for detailed error information",
        "Try 'conductor <command> --help' for command-specific help",
      ]
    );
  }
}

/**
 * Enhanced file path parsing with validation
 */
function parseFilePaths(options: any): string[] {
  const filePaths: string[] = [];

  // Parse main file paths
  if (options.file) {
    if (Array.isArray(options.file)) {
      filePaths.push(...options.file);
    } else if (typeof options.file === "string") {
      filePaths.push(options.file);
    } else {
      throw ErrorFactory.args("Invalid file parameter format", undefined, [
        "File parameter must be a string or array of strings",
        "Example: -f data.csv",
        "Example: -f file1.csv file2.csv",
        "Check file parameter syntax",
      ]);
    }
  }

  // Add template file to filePaths if present
  if (options.templateFile && !filePaths.includes(options.templateFile)) {
    filePaths.push(options.templateFile);
  }

  // Add schema file to filePaths if present for Lectern or SONG upload
  if (options.schemaFile && !filePaths.includes(options.schemaFile)) {
    filePaths.push(options.schemaFile);
  }

  // Add analysis file to filePaths if present for SONG analysis submission
  if (options.analysisFile && !filePaths.includes(options.analysisFile)) {
    filePaths.push(options.analysisFile);
  }

  return filePaths;
}

/**
 * Enhanced configuration creation from options with validation
 */
function createConfigFromOptions(options: any) {
  try {
    return {
      elasticsearch: {
        url:
          options.url ||
          process.env.ELASTICSEARCH_URL ||
          "http://localhost:9200",
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
        url:
          options.lyricUrl || process.env.LYRIC_URL || "http://localhost:3030",
        categoryName: options.categoryName || process.env.CATEGORY_NAME,
        dictionaryName: options.dictName || process.env.DICTIONARY_NAME,
        dictionaryVersion:
          options.dictionaryVersion || process.env.DICTIONARY_VERSION,
        defaultCentricEntity:
          options.defaultCentricEntity || process.env.DEFAULT_CENTRIC_ENTITY,
        // Data loading specific options
        dataDirectory: options.dataDirectory || process.env.LYRIC_DATA,
        categoryId: options.categoryId || process.env.CATEGORY_ID,
        organization: options.organization || process.env.ORGANIZATION,
        maxRetries: parseIntegerOption(
          options.maxRetries,
          process.env.MAX_RETRIES,
          10
        ),
        retryDelay: parseIntegerOption(
          options.retryDelay,
          process.env.RETRY_DELAY,
          20000
        ),
      },
      song: {
        url: options.songUrl || process.env.SONG_URL || "http://localhost:8080",
        authToken: options.authToken || process.env.AUTH_TOKEN || "123",
        schemaFile: options.schemaFile || process.env.SONG_SCHEMA,
        studyId: options.studyId || process.env.STUDY_ID || "demo",
        studyName: options.studyName || process.env.STUDY_NAME || "string",
        organization:
          options.organization || process.env.ORGANIZATION || "string",
        description: options.description || process.env.DESCRIPTION || "string",
        analysisFile: options.analysisFile || process.env.ANALYSIS_FILE,
        allowDuplicates:
          options.allowDuplicates ||
          process.env.ALLOW_DUPLICATES === "true" ||
          false,
        ignoreUndefinedMd5:
          options.ignoreUndefinedMd5 ||
          process.env.IGNORE_UNDEFINED_MD5 === "true" ||
          false,
        // Combined Score functionality (now part of song config)
        scoreUrl:
          options.scoreUrl || process.env.SCORE_URL || "http://localhost:8087",
        dataDir: options.dataDir || process.env.DATA_DIR || "./data",
        outputDir: options.outputDir || process.env.OUTPUT_DIR || "./output",
        manifestFile: options.manifestFile || process.env.MANIFEST_FILE,
      },
      maestroIndex: {
        url:
          options.indexUrl || process.env.INDEX_URL || "http://localhost:11235",
        repositoryCode: options.repositoryCode || process.env.REPOSITORY_CODE,
        organization: options.organization || process.env.ORGANIZATION,
        id: options.id || process.env.ID,
      },
      batchSize: parseIntegerOption(options.batchSize, undefined, 1000),
      delimiter: options.delimiter || ",",
    };
  } catch (error) {
    throw ErrorFactory.config(
      "Failed to create configuration from options",
      "config",
      [
        "Check all configuration parameters",
        "Verify environment variables are set correctly",
        "Ensure numeric values are valid integers",
        "Use --debug flag for detailed configuration information",
      ]
    );
  }
}

/**
 * Enhanced integer parsing with validation
 */
function parseIntegerOption(
  optionValue: any,
  envValue: string | undefined,
  defaultValue: number
): number {
  const value = optionValue || envValue;

  if (value === undefined || value === null) {
    return defaultValue;
  }

  const parsed = parseInt(String(value));

  if (isNaN(parsed)) {
    throw ErrorFactory.validation(
      `Invalid integer value: ${value}`,
      { value, type: typeof value },
      [
        "Provide a valid integer number",
        "Check numeric parameters and environment variables",
        "Remove any non-numeric characters",
        `Using default value: ${defaultValue}`,
      ]
    );
  }

  return parsed;
}

/**
 * Create environment configuration object from main config
 */
function createEnvConfig(config: any) {
  return {
    elasticsearchUrl: config.elasticsearch.url,
    esUser: config.elasticsearch.user,
    esPassword: config.elasticsearch.password,
    indexName: config.elasticsearch.index,
    lecternUrl: config.lectern.url,
    lyricUrl: config.lyric.url,
    songUrl: config.song.url,
    lyricData: config.lyric.dataDirectory,
    categoryId: config.lyric.categoryId,
    organization: config.lyric.organization,
  };
}
