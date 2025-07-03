/**
 * CLI Options Module - Fixed for Case Insensitive Commands
 *
 * This module configures the command-line options for the Conductor CLI.
 * Updated to reflect the refactored SONG/Score services and removed commands.
 * Enhanced with error factory pattern for consistent error handling.
 * Updated with esUpload rename and case-insensitive command aliases.
 */

import { Command } from "commander";
import { Profiles } from "../types/constants";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

/**
 * Configures the command-line options for the Conductor CLI
 * Updated with esUpload rename and case-insensitive aliases
 * @param program - The Commander.js program instance
 */
export function configureCommandOptions(program: Command): void {
  // Global options
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

  // Elasticsearch Upload command (renamed from "upload" to "esUpload")
  // Added aliases for case-insensitive matching
  program
    .command("esUpload")
    .alias("esupload") // lowercase alias
    .alias("ESUPLOAD") // uppercase alias
    .description("Upload data to Elasticsearch")
    .option("-f, --file <files...>", "Input files to process")
    .option("-i, --index <n>", "Elasticsearch index name")
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

  // PostgreSQL upload command (updated defaults)
  program
    .command("postgresUpload")
    .alias("postgresupload") // lowercase alias
    .alias("POSTGRESUPLOAD") // uppercase alias
    .description("Upload data to PostgreSQL database")
    .option("-f, --file <files...>", "Input files to process")
    .option("-t, --table <n>", "PostgreSQL table name")
    .option("-b, --batch-size <size>", "Batch size for uploads", "1000")
    .option("--delimiter <char>", "CSV delimiter character", ",")
    .option("-o, --output <path>", "Output directory for generated files")
    .option("--force", "Force overwrite of existing files")
    .option("--host <host>", "PostgreSQL host", "localhost")
    .option("--port <port>", "PostgreSQL port", "5435") // Updated default
    .option("--database <database>", "PostgreSQL database name", "postgres")
    .option("--user <username>", "PostgreSQL username", "admin") // Updated default
    .option("--password <password>", "PostgreSQL password", "admin123") // Updated default
    .option("--connection-string <url>", "PostgreSQL connection string")
    .option("--ssl", "Use SSL connection")
    .option("--max-connections <number>", "Maximum pool connections", "20")
    .option("--add-metadata", "Add submission metadata to records")
    .action(() => {
      /* Handled by main.ts */
    });

  // PostgreSQL to Elasticsearch index command (updated defaults)
  program
    .command("postgresIndex")
    .alias("postgresindex") // lowercase alias
    .alias("POSTGRESINDEX") // uppercase alias
    .description("Index data from PostgreSQL table to Elasticsearch")
    .option("-t, --table <n>", "Source PostgreSQL table name")
    .option("-i, --index <n>", "Target Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for indexing", "1000")
    .option("--host <host>", "PostgreSQL host", "localhost")
    .option("--port <port>", "PostgreSQL port", "5435") // Updated default
    .option("--database <database>", "PostgreSQL database name", "postgres")
    .option("--user <username>", "PostgreSQL username", "admin") // Updated default
    .option("--password <password>", "PostgreSQL password", "admin123") // Updated default
    .option("--connection-string <url>", "PostgreSQL connection string")
    .option("--ssl", "Use SSL connection")
    .option("--url <url>", "Elasticsearch URL", "http://localhost:9200")
    .option("--es-user <username>", "Elasticsearch username", "elastic")
    .option(
      "--es-password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .option("-o, --output <path>", "Output directory for logs")
    .action(() => {
      /* Handled by main.ts */
    });

  // Lectern schema upload command
  program
    .command("lecternUpload")
    .alias("lecternupload") // lowercase alias
    .alias("LECTERNUPLOAD") // uppercase alias
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
    .alias("lyricregister") // lowercase alias
    .alias("LYRICREGISTER") // uppercase alias
    .description("Register a dictionary with Lyric service")
    .option(
      "-u, --lyric-url <url>",
      "Lyric server URL",
      process.env.LYRIC_URL || "http://localhost:3030"
    )
    .option("-c, --category-name <n>", "Category name")
    .option("--dict-name <n>", "Dictionary name")
    .option("-v, --dictionary-version <version>", "Dictionary version")
    .option("-e, --default-centric-entity <entity>", "Default centric entity")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });

  // Lyric data loading command
  program
    .command("lyricUpload")
    .alias("lyricupload") // lowercase alias
    .alias("LYRICUPLOAD") // uppercase alias
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
      "-g, --organization <n>",
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

  // Repository indexing command
  program
    .command("maestroIndex")
    .alias("maestroindex") // lowercase alias
    .alias("MAESTROINDEX") // uppercase alias
    .description("Index a repository with optional filtering")
    .option(
      "--index-url <url>",
      "Indexing service URL",
      process.env.MAESTRO_URL || "http://localhost:8080"
    )
    .option(
      "--repo-url <url>",
      "Repository URL to index",
      process.env.REPOSITORY_URL
    )
    .option(
      "--repo-name <name>",
      "Repository name",
      process.env.REPOSITORY_NAME
    )
    .option("--analysis-id <id>", "Analysis ID to index")
    .option("-b, --batch-size <size>", "Batch size for indexing", "1000")
    .option("-o, --output <path>", "Output directory for logs")
    .option(
      "--exclude-analysis-types <types>",
      "Comma-separated list of analysis types to exclude"
    )
    .option(
      "--include-analysis-types <types>",
      "Comma-separated list of analysis types to include"
    )
    .action(() => {
      /* Handled by main.ts */
    });

  // SONG schema upload command
  program
    .command("songUploadSchema")
    .alias("songuploadschema") // lowercase alias
    .alias("SONGUPLOADSCHEMA") // uppercase alias
    .description("Upload analysis schema to SONG server")
    .option("-s, --schema-file <path>", "Schema JSON file to upload")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option("-t, --auth-token <token>", "Authentication token", "")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });

  // SONG study creation command
  program
    .command("songCreateStudy")
    .alias("songcreatestudy") // lowercase alias
    .alias("SONGCREATESTUDY") // uppercase alias
    .description("Create a study in SONG server")
    .option("-f, --file <path>", "Study JSON file to upload")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option("-t, --auth-token <token>", "Authentication token", "")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });

  // SONG analysis submission command
  program
    .command("songSubmitAnalysis")
    .alias("songsubmitanalysis") // lowercase alias
    .alias("SONGSUBMITANALYSIS") // uppercase alias
    .description("Submit analysis to SONG server")
    .option("-f, --file <path>", "Analysis JSON file to submit")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option("-t, --auth-token <token>", "Authentication token", "")
    .option("-s, --study-id <id>", "Study ID for the analysis")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });

  // SONG analysis publishing command
  program
    .command("songPublishAnalysis")
    .alias("songpublishanalysis") // lowercase alias
    .alias("SONGPUBLISHANALYSIS") // uppercase alias
    .description("Publish analysis in SONG server")
    .option("-a, --analysis-id <id>", "Analysis ID to publish")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option("-t, --auth-token <token>", "Authentication token", "")
    .option("-s, --study-id <id>", "Study ID for the analysis")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Parses command-line arguments into a standardized CLIOutput object
 * Updated to handle the combined SONG/Score workflow with enhanced error handling
 * Updated with esUpload rename and PostgreSQL defaults
 *
 * @param options - Parsed command-line options
 * @returns A CLIOutput object for command execution
 */
export function parseCommandLineArgs(options: any): CLIOutput {
  try {
    // Log raw options for debugging
    Logger.debug`Raw options: ${JSON.stringify(options)}`;
    Logger.debug`Process argv: ${process.argv.join(" ")}`;

    // Determine the profile from options
    let profile = options.profile || Profiles.ES_UPLOAD; // Updated to use ES_UPLOAD

    // Special handling for lyricData command to ensure data directory is captured
    if (profile === Profiles.LYRIC_DATA) {
      // Check for a positional argument that might be the data directory
      const positionalArgs = process.argv
        .slice(3)
        .filter((arg) => !arg.startsWith("-"));

      if (positionalArgs.length > 0 && !options.dataDirectory) {
        options.dataDirectory = positionalArgs[0];
        Logger.debug`Captured data directory from positional argument: ${options.dataDirectory}`;
      }
    }

    // Parse file paths with better error handling
    let filePaths: string[] = [];

    if (Array.isArray(options.file)) {
      filePaths = options.file;
    } else if (options.file) {
      filePaths = [options.file];
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

    Logger.debug`Parsed profile: ${profile}`;
    Logger.debug`Parsed file paths: ${filePaths.join(", ")}`;

    // Validate numeric options
    const batchSize = options.batchSize
      ? parseInt(options.batchSize, 10)
      : 1000;
    const maxRetries = options.maxRetries ? parseInt(options.maxRetries) : 10;
    const retryDelay = options.retryDelay
      ? parseInt(options.retryDelay)
      : 20000;

    if (isNaN(batchSize) || batchSize <= 0) {
      throw ErrorFactory.validation(
        "Invalid batch size",
        { batchSize: options.batchSize },
        ["Batch size must be a positive number", "Example: --batch-size 1000"]
      );
    }

    if (isNaN(maxRetries) || maxRetries < 0) {
      throw ErrorFactory.validation(
        "Invalid max retries",
        { maxRetries: options.maxRetries },
        [
          "Max retries must be a non-negative number",
          "Example: --max-retries 3",
        ]
      );
    }

    if (isNaN(retryDelay) || retryDelay < 0) {
      throw ErrorFactory.validation(
        "Invalid retry delay",
        { retryDelay: options.retryDelay },
        [
          "Retry delay must be a non-negative number in milliseconds",
          "Example: --retry-delay 1000",
        ]
      );
    }

    // Create config object with support for all services (updated PostgreSQL defaults)
    const config = {
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
      postgresql: {
        connectionString: options.connectionString || process.env.DATABASE_URL,
        host: options.host || process.env.PGHOST || "localhost",
        port: parseInt(options.port || process.env.PGPORT || "5435"), // Updated default
        database: options.database || process.env.PGDATABASE || "postgres",
        user: options.user || process.env.PGUSER || "admin", // Updated default
        password: options.password || process.env.PGPASSWORD || "admin123", // Updated default
        ssl: options.ssl || process.env.PGSSLMODE === "require",
        table: options.table || "data",
        maxConnections: parseInt(options.maxConnections || "20"),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        addMetadata: options.addMetadata || false,
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
        maxRetries,
        retryDelay,
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
      batchSize,
      delimiter: options.delimiter || ",",
    };

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
        songUrl: config.song.url,
        lyricData: config.lyric.dataDirectory,
        categoryId: config.lyric.categoryId,
        organization: config.lyric.organization,
      },
    };
  } catch (error) {
    // If it's already a ConductorError, rethrow it
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Wrap unexpected parsing errors
    throw ErrorFactory.parsing(
      "Failed to parse command line arguments",
      { options, originalError: error },
      [
        "Check command line argument syntax",
        "Use --help for usage information",
        "Verify all required parameters are provided",
      ]
    );
  }
}
