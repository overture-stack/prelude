/**
 * CLI Options Module
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

  // Upload command
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
    .option("-c, --category-name <name>", "Category name")
    .option("--dict-name <name>", "Dictionary name")
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

  // SONG schema upload command
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

  // SONG study creation command
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

  // SONG analysis submission command
  program
    .command("songSubmitAnalysis")
    .description("Submit analysis to SONG server")
    .option("-a, --analysis-file <path>", "Analysis JSON file to submit")
    .option(
      "-u, --song-url <url>",
      "SONG server URL",
      process.env.SONG_URL || "http://localhost:8080"
    )
    .option("-i, --study-id <id>", "Study ID", process.env.STUDY_ID || "demo")
    .option("--allow-duplicates", "Allow duplicate analysis submissions", false)
    .option(
      "-t, --auth-token <token>",
      "Authentication token",
      process.env.AUTH_TOKEN || "123"
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

  // Score manifest upload command
  program
    .command("scoreManifestUpload")
    .description("Generate manifest and upload files with Score")
    .option("-a, --analysis-id <id>", "Analysis ID from Song submission")
    .option(
      "-d, --data-dir <path>",
      "Directory containing data files",
      process.env.DATA_DIR || "./data"
    )
    .option(
      "-o, --output-dir <path>",
      "Directory for manifest file output",
      process.env.OUTPUT_DIR || "./output"
    )
    .option(
      "-m, --manifest-file <path>",
      "Path for manifest file",
      process.env.MANIFEST_FILE
    )
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
    .option(
      "-t, --auth-token <token>",
      "Authentication token",
      process.env.AUTH_TOKEN || "123"
    )
    .action(() => {
      /* Handled by main.ts */
    });

  // Add this to the configureCommandOptions function, after the other commands

  // Repository indexing command
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

  // Song publish analysis command
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
    .action(() => {
      /* Handled by main.ts */
    });

  // Combined SONG/SCORE submission command
  program
    .command("songScoreSubmit")
    .description(
      "End-to-end workflow: Submit analysis to SONG, upload to SCORE, and publish"
    )
    .option(
      "-p, --analysis-path <path>",
      "Path to analysis JSON file",
      process.env.ANALYSIS_PATH || "./analysis.json"
    )
    .option("-i, --study-id <id>", "Study ID", process.env.STUDY_ID || "demo")
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
    .option(
      "-d, --data-dir <path>",
      "Directory containing data files",
      process.env.DATA_DIR || "./data/fileData"
    )
    .option(
      "-o, --output-dir <path>",
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

  // Add schema file to filePaths if present for Lectern or SONG upload
  if (options.schemaFile && !filePaths.includes(options.schemaFile)) {
    filePaths.push(options.schemaFile);
  }

  // Add analysis file to filePaths if present for SONG analysis submission
  if (options.analysisFile && !filePaths.includes(options.analysisFile)) {
    filePaths.push(options.analysisFile);
  }

  // Add analysis path to filePaths if present for songScoreSubmit command
  if (options.analysisPath && !filePaths.includes(options.analysisPath)) {
    filePaths.push(options.analysisPath);
  }

  Logger.debug(`Parsed profile: ${profile}`);
  Logger.debug(`Parsed file paths: ${filePaths.join(", ")}`);

  // Create config object with support for all services
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
      analysisPath: options.analysisPath || process.env.ANALYSIS_PATH,
      allowDuplicates:
        options.allowDuplicates ||
        process.env.ALLOW_DUPLICATES === "true" ||
        false,
      ignoreUndefinedMd5:
        options.ignoreUndefinedMd5 ||
        process.env.IGNORE_UNDEFINED_MD5 === "true" ||
        false,
    },
    score: {
      url: options.scoreUrl || process.env.SCORE_URL || "http://localhost:8087",
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
      analysisId: options.analysisId || process.env.ANALYSIS_ID,
      dataDir: options.dataDir || process.env.DATA_DIR || "./data",
      outputDir: options.outputDir || process.env.OUTPUT_DIR || "./output",
      manifestFile: options.manifestFile || process.env.MANIFEST_FILE,
    },
    batchSize: options.batchSize ? parseInt(options.batchSize, 10) : 1000,
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
      scoreUrl: config.score.url,
    },
  };
}
