// src/cli/commandOptions.ts - PostgreSQL support and suppressed Commander help
import { Command, Option } from "commander";
import { Profile, Profiles } from "../types";
import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";
import {
  CLIOutput,
  ElasticsearchConfig,
  DictionaryConfig,
  SongConfig,
} from "../types";
import { PostgresConfig } from "../types/postgres";

// Profile descriptions including PostgreSQL
const PROFILE_DESCRIPTIONS = new Map([
  [Profiles.GENERATE_SONG_SCHEMA, "Generate Song schema from JSON metadata"],
  [
    Profiles.GENERATE_LECTERN_DICTIONARY,
    "Generate Lectern dictionary from CSV files",
  ],
  [
    Profiles.GENERATE_ELASTICSEARCH_MAPPING,
    "Generate Elasticsearch mapping from CSV or JSON",
  ],
  [
    Profiles.GENERATE_ARRANGER_CONFIGS,
    "Generate Arranger configs from Elasticsearch mapping",
  ],
  [
    Profiles.GENERATE_POSTGRES_TABLE,
    "Generate PostgreSQL CREATE TABLE from CSV file",
  ],
]);

/**
 * Configure CLI command options with PostgreSQL support - suppresses Commander help
 */
export function configureCommandOptions(program: Command): Command {
  Logger.debug`Configuring command options`;

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

  return (
    program
      .name("composer")
      .description(
        "Generate Dictionary, Song Schema, Elasticsearch, or PostgreSQL configurations"
      )
      .option("--debug", "Enable debug logging")
      .addOption(
        new Option("-p, --profile <profile>", "Execution profile")
          .choices(Object.values(Profiles))
          .default(Profiles.GENERATE_SONG_SCHEMA)
          .argParser((value) => {
            if (!Object.values(Profiles).includes(value as Profile)) {
              const suggestions = Array.from(
                PROFILE_DESCRIPTIONS.entries()
              ).map(([profile, desc]) => `  ${profile}: ${desc}`);

              throw ErrorFactory.args(`Invalid profile: ${value}`, [
                "Valid profiles are:",
                ...suggestions,
              ]);
            }
            return value as Profile;
          })
      )
      .requiredOption(
        "-f, --files <paths...>",
        "Input file paths (CSV or JSON, space separated)"
      )
      .option("-i, --index <n>", "Elasticsearch index name", "data")
      .option("--shards <number>", "Number of Elasticsearch shards", "1")
      .option("--replicas <number>", "Number of Elasticsearch replicas", "1")
      .option(
        "-o, --output <path>",
        "Output file path for generated schemas or mapping"
      )
      .option("--arranger-doc-type <type>", "Arranger document type", "file")
      .option("-n, --name <n>", "Dictionary/Schema name")
      .option(
        "-d, --description <text>",
        "Dictionary description",
        "Generated dictionary from CSV files"
      )
      .option("-v, --version <version>", "Dictionary version", "1.0.0")
      .option("--file-types <types...>", "Allowed file types for Song schema")
      .option("--delimiter <char>", "CSV delimiter", ",")
      .option(
        "--ignore-fields <fields...>",
        "Field names to exclude from Elasticsearch mapping"
      )
      .option(
        "--skip-metadata",
        "Skip adding submission metadata to Elasticsearch mapping"
      )
      // PostgreSQL options
      .option("--table-name <n>", "PostgreSQL table name")
      .option("--schema <n>", "PostgreSQL schema name")
      .option("--include-constraints", "Include primary key constraints")
      .option("--include-indexes", "Include database indexes")
      .option("--force", "Force overwrite of existing files without prompting")
      .helpOption(false) // Disable automatic help option
      .exitOverride() // Prevent Commander from calling process.exit()
      .hook("preAction", (thisCommand) => {
        const opts = thisCommand.opts();
        if (opts.debug) {
          Logger.enableDebug();
          Logger.debug`Full command options: ${JSON.stringify(opts, null, 2)}`;
        }
      })
  );
}

/**
 * Parse command line arguments into structured CLIOutput with PostgreSQL support
 */
export function parseOptions(opts: any): CLIOutput {
  Logger.debug`Parsing command line arguments`;

  // Build elasticsearch config
  const elasticsearchConfig: ElasticsearchConfig = {
    index: opts.index || "data",
    shards: parseInt(opts.shards || "1", 10),
    replicas: parseInt(opts.replicas || "1", 10),
    ignoredFields: opts.ignoreFields || [],
    skipMetadata: opts.skipMetadata || false,
  };

  // Build dictionary config if needed
  const dictionaryConfig: DictionaryConfig | undefined =
    opts.name || opts.description || opts.version
      ? {
          name: opts.name || "lectern_dictionary",
          description:
            opts.description || "Generated dictionary from CSV files",
          version: opts.version || "1.0.0",
        }
      : undefined;

  // Build song config if needed
  const songConfig: SongConfig | undefined =
    opts.name || opts.fileTypes
      ? {
          name: opts.name,
          fileTypes: opts.fileTypes,
        }
      : undefined;

  // Build postgres config if needed
  const postgresConfig: PostgresConfig | undefined =
    opts.tableName ||
    opts.schema ||
    opts.includeConstraints ||
    opts.includeIndexes
      ? {
          tableName: opts.tableName || "generated_table",
          schema: opts.schema,
          includeConstraints: opts.includeConstraints || false,
          includeIndexes: opts.includeIndexes || false,
        }
      : undefined;

  const output: CLIOutput = {
    profile: opts.profile,
    debug: opts.debug || false,
    filePaths: opts.files || [],
    outputPath: opts.output,
    force: opts.force || false,
    elasticsearchConfig,
    csvDelimiter: opts.delimiter || ",",
    envConfig: {}, // Will be populated by environment loader
    dictionaryConfig,
    songConfig,
    postgresConfig,
    arrangerConfig: opts.arrangerDocType
      ? {
          documentType: opts.arrangerDocType,
        }
      : undefined,
  };

  if (opts.debug) {
    Logger.debug`Parsed CLI output: ${JSON.stringify(output, null, 2)}`;
  }

  return output;
}
