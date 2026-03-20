import { Command } from "commander";
import { Profile } from "../types";
import { Logger } from "../utils/logger";
import {
  CLIOutput,
  ElasticsearchConfig,
  DictionaryConfig,
  SongConfig,
} from "../types";
import { PostgresConfig } from "../types/postgres";

/**
 * Configure CLI command options using conductor-style subcommands
 */
export function configureCommandOptions(program: Command): void {
  Logger.debug`Configuring command options`;

  program
    .name("composer")
    .description(
      "Generate Dictionary, Song Schema, Elasticsearch, or PostgreSQL configurations"
    )
    .helpOption(false)
    .option("--debug", "Enable debug logging")
    .option("-h, --help", "display help for command")
    .on("option:help", () => {
      Logger.showReferenceCommands();
      process.exit(0);
    })
    .hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.debug) {
        Logger.enableDebug();
        Logger.debug`Full command options: ${JSON.stringify(opts, null, 2)}`;
      }
    });

  program
    .command("song-schema")
    .description("Generate Song schema from JSON metadata")
    .requiredOption("-f, --files <paths...>", "Input JSON metadata file(s)")
    .option("-o, --output <path>", "Output schema file path")
    .option("-n, --name <name>", "Schema name")
    .option("--file-types <types...>", "Allowed file types for Song schema")
    .option("--force", "Force overwrite of existing files without prompting")
    .action(() => { /* Handled by cli/index.ts */ });

  program
    .command("lectern-dictionary")
    .description("Generate Lectern dictionary from CSV files")
    .requiredOption("-f, --files <paths...>", "Input CSV files")
    .option("-o, --output <path>", "Output dictionary file path")
    .option("-n, --name <name>", "Dictionary name")
    .option(
      "-d, --description <text>",
      "Dictionary description",
      "Generated dictionary from CSV files"
    )
    .option("-v, --version <version>", "Dictionary version", "1.0.0")
    .option("--delimiter <char>", "CSV delimiter", ",")
    .option("--force", "Force overwrite of existing files without prompting")
    .action(() => { /* Handled by cli/index.ts */ });

  program
    .command("elasticsearch-mapping")
    .description("Generate Elasticsearch mapping from CSV or JSON")
    .requiredOption(
      "-f, --files <paths...>",
      "Input file paths (CSV or JSON, space separated)"
    )
    .option("-o, --output <path>", "Output file path for generated mapping")
    .option("-i, --index <name>", "Elasticsearch index name", "data")
    .option("--shards <number>", "Number of Elasticsearch shards", "1")
    .option("--replicas <number>", "Number of Elasticsearch replicas", "1")
    .option("--delimiter <char>", "CSV delimiter", ",")
    .option(
      "--ignore-fields <fields...>",
      "Field names to exclude from Elasticsearch mapping"
    )
    .option(
      "--skip-metadata",
      "Skip adding submission metadata to Elasticsearch mapping"
    )
    .option("--force", "Force overwrite of existing files without prompting")
    .action(() => { /* Handled by cli/index.ts */ });

  program
    .command("arranger-configs")
    .description("Generate Arranger configs from Elasticsearch mapping")
    .requiredOption(
      "-f, --files <paths...>",
      "Input Elasticsearch mapping file (JSON)"
    )
    .option("-o, --output <path>", "Output file path for generated configs")
    .option("-i, --index <name>", "Elasticsearch index name", "data")
    .option(
      "--arranger-doc-type <type>",
      "Arranger document type (file or analysis)",
      "file"
    )
    .option("--force", "Force overwrite of existing files without prompting")
    .action(() => { /* Handled by cli/index.ts */ });

  program
    .command("postgres-table")
    .description("Generate PostgreSQL CREATE TABLE from CSV file")
    .requiredOption("-f, --files <paths...>", "Input CSV file path(s)")
    .option("-o, --output <path>", "Output SQL file path")
    .option("--table-name <name>", "PostgreSQL table name")
    .option("--delimiter <char>", "CSV delimiter", ",")
    .option("--force", "Force overwrite of existing files without prompting")
    .action(() => { /* Handled by cli/index.ts */ });
}

export interface ParsedOpts {
  profile?: Profile;
  debug?: boolean;
  files?: string[];
  index?: string;
  shards?: string;
  replicas?: string;
  output?: string;
  arrangerDocType?: string;
  name?: string;
  description?: string;
  version?: string;
  fileTypes?: string[];
  delimiter?: string;
  ignoreFields?: string[];
  skipMetadata?: boolean;
  tableName?: string;
  force?: boolean;
}

/**
 * Parse command line arguments into structured CLIOutput
 */
export function parseOptions(opts: ParsedOpts): CLIOutput {
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
  const postgresConfig: PostgresConfig | undefined = opts.tableName
    ? {
        tableName: opts.tableName || "generated_table",
      }
    : undefined;

  const arrangerDocType = opts.arrangerDocType as
    | "file"
    | "analysis"
    | undefined;

  const output: CLIOutput = {
    profile: opts.profile as Profile,
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
    arrangerConfig: arrangerDocType
      ? {
          documentType: arrangerDocType,
        }
      : undefined,
  };

  if (opts.debug) {
    Logger.debug`Parsed CLI output: ${JSON.stringify(output, null, 2)}`;
  }

  return output;
}
