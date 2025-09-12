// src/cli/options.ts
/**
 * CLI Options Module - Updated with Unified Upload Command
 *
 * This module configures the command-line options for the Conductor CLI.
 * Updated to include the new unified upload command that combines PostgreSQL and Elasticsearch functionality.
 * Enhanced with error factory pattern for consistent error handling.
 */

import { Command } from "commander";
import { CLIOutput, Config } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

/**
 * Configures the command-line options for the Conductor CLI
 * Updated with unified upload command and suppressed Commander help
 * @param program - The Commander.js program instance
 */
export function configureCommandOptions(program: Command): void {
  // Check if help was requested before parsing
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    Logger.showReferenceCommands();
    process.exit(0);
  }

  // Suppress Commander's built-in help and error output
  program.configureOutput({
    writeOut: () => {}, // Suppress help output
    writeErr: () => {}, // Suppress error output
  });

  // Global options
  program
    .version("1.0.0")
    .description("Conductor: Data Processing Pipeline")
    .option("--debug", "Enable debug mode")
    .helpOption(false) // Disable automatic help option
    .exitOverride(); // Prevent Commander from calling process.exit()

  // Unified Upload command - combines PostgreSQL and Elasticsearch functionality
  program
    .command("upload")
    .alias("UPLOAD") // uppercase alias
    .description("Upload data to PostgreSQL and/or Elasticsearch")
    .option("-f, --file <files...>", "Input files to process")
    .option("-t, --table <tableName>", "PostgreSQL table name")
    .option("-i, --index <indexName>", "Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for uploads", "1000")
    .option("--delimiter <char>", "CSV delimiter character", ",")
    .option("-o, --output <path>", "Output directory for generated files")
    .option("--force", "Force overwrite of existing files")
    // PostgreSQL options
    .option("--host <host>", "PostgreSQL host", "localhost")
    .option("--port <port>", "PostgreSQL port", "5435")
    .option("--database <database>", "PostgreSQL database name", "postgres")
    .option("--user <username>", "PostgreSQL username", "admin")
    .option("--password <password>", "PostgreSQL password", "admin123")
    .option("--connection-string <url>", "PostgreSQL connection string")
    .option("--ssl", "Use SSL connection")
    .option("--max-connections <number>", "Maximum pool connections", "20")
    // Elasticsearch options
    .option("--url <url>", "Elasticsearch URL", "http://localhost:9200")
    .option("--es-user <username>", "Elasticsearch username", "elastic")
    .option(
      "--es-password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .action(() => {
      /* Handled by main.ts */
    });

  // Elasticsearch Upload command (specialized - kept for backward compatibility)
  program
    .command("esUpload")
    .alias("esupload") // lowercase alias
    .alias("ESUPLOAD") // uppercase alias
    .description("Upload data to Elasticsearch (specialized command)")
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

  // PostgreSQL upload command (specialized - kept for backward compatibility)
  program
    .command("postgresUpload")
    .alias("postgresupload") // lowercase alias
    .alias("POSTGRESUPLOAD") // uppercase alias
    .description("Upload data to PostgreSQL database (specialized command)")
    .option("-f, --file <files...>", "Input files to process")
    .option("-t, --table <n>", "PostgreSQL table name")
    .option("-b, --batch-size <size>", "Batch size for uploads", "1000")
    .option("--delimiter <char>", "CSV delimiter character", ",")
    .option("-o, --output <path>", "Output directory for generated files")
    .option("--force", "Force overwrite of existing files")
    .option("--host <host>", "PostgreSQL host", "localhost")
    .option("--port <port>", "PostgreSQL port", "5435")
    .option("--database <database>", "PostgreSQL database name", "postgres")
    .option("--user <username>", "PostgreSQL username", "admin")
    .option("--password <password>", "PostgreSQL password", "admin123")
    .option("--connection-string <url>", "PostgreSQL connection string")
    .option("--ssl", "Use SSL connection")
    .option("--max-connections <number>", "Maximum pool connections", "20")
    .action(() => {
      /* Handled by main.ts */
    });

  // PostgreSQL to Elasticsearch index command
  program
    .command("index")
    .alias("INDEX") // uppercase alias
    .description("Index data from PostgreSQL table to Elasticsearch")
    .option("-t, --table <n>", "Source PostgreSQL table name")
    .option("-i, --index <n>", "Target Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for indexing", "1000")
    .option("--host <host>", "PostgreSQL host", "localhost")
    .option("--port <port>", "PostgreSQL port", "5435")
    .option("--database <database>", "PostgreSQL database name", "postgres")
    .option("--user <username>", "PostgreSQL username", "admin")
    .option("--password <password>", "PostgreSQL password", "admin123")
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
    .option("-c, --category-name <n>", "Category name")
    .option("--dict-name <n>", "Dictionary name")
    .option("-v, --dictionary-version <version>", "Dictionary version")
    .option("-e, --default-centric-entity <entity>", "Default centric entity")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });

  // Maestro indexing command
  program
    .command("maestroIndex")
    .alias("maestroindex") // lowercase alias
    .alias("MAESTROINDEX") // uppercase alias
    .description("Index a repository using Maestro")
    .option("--repository-code <code>", "Repository code to index")
    .option(
      "--index-url <url>",
      "Indexing service URL",
      process.env.MAESTRO_URL || "http://localhost:11235"
    )
    .option("--organization <n>", "Filter to specific organization")
    .option("--id <id>", "Index only specific document ID")
    .option("-o, --output <path>", "Output directory for logs")
    .option("--force", "Skip confirmation prompts")
    .action(() => {
      /* Handled by main.ts */
    });

  // SONG schema upload command
  program
    .command("songUploadSchema")
    .alias("songuploadschema") // lowercase alias
    .alias("SONGUPLOADSCHEMA") // uppercase alias
    .description("Upload schema to SONG server")
    .option("-f, --file <path>", "Schema JSON file to upload")
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
 * Parses command line arguments into a standardized CLIOutput format
 * Updated to handle unified upload command
 * @param args - Raw command line arguments
 * @returns CLIOutput object with parsed configuration
 */
export function parseCommandLineArgs(args: any): CLIOutput {
  try {
    // Handle file paths - support both single files and arrays
    let filePaths: string[] = [];
    if (args.file) {
      filePaths = Array.isArray(args.file) ? args.file : [args.file];
    } else if (args.files) {
      filePaths = Array.isArray(args.files) ? args.files : [args.files];
    } else if (args.schemaFile) {
      filePaths = [args.schemaFile];
    } else if (args.analysisFile) {
      filePaths = [args.analysisFile];
    }

    // Create the CLIOutput object with proper Config structure
    const cliOutput: CLIOutput = {
      profile: args.profile,
      filePaths: filePaths,
      config: {
        elasticsearch: {
          url: args.url || "http://localhost:9200",
          user: args.esUser || args.user || "elastic",
          password: args.esPassword || args.password || "myelasticpassword",
          index: args.index || "",
        },
        postgresql: args.table
          ? {
              host: args.host || "localhost",
              port: parseInt(args.port) || 5435,
              database: args.database || "postgres",
              user: args.user || "admin",
              password: args.password || "admin123",
              table: args.table,
              connectionString: args.connectionString,
              ssl: args.ssl || false,
              maxConnections: parseInt(args.maxConnections) || 20,
              addMetadata: args.addMetadata || false,
            }
          : undefined,
        batchSize: args.batchSize ? parseInt(args.batchSize) : 1000,
        delimiter: args.delimiter || ",",
      },
      debug: args.debug || false,
      envConfig: {}, // Required by CLIOutput interface
      options: args, // Keep raw options for command-specific handling
    };

    Logger.debug`Parsed CLI output: ${JSON.stringify(cliOutput, null, 2)}`;
    return cliOutput;
  } catch (error) {
    throw ErrorFactory.args("Failed to parse command line arguments", [
      "Check command syntax",
      "Use --help for usage information",
      "Verify all required parameters are provided",
    ]);
  }
}
