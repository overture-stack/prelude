// src/cli/commandOptions.ts - Updated with case-insensitive profile matching
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

// Profile descriptions integrated here
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
]);

/**
 * Configure CLI command options - separated from parsing logic
 */
export function configureCommandOptions(program: Command): Command {
  Logger.debug`Configuring command options`;

  return program
    .name("composer")
    .description(
      "Generate Dictionary, Song Schema, or Elasticsearch configurations"
    )
    .option("--debug", "Enable debug logging")
    .addOption(
      new Option("-p, --profile <profile>", "Execution profile")
        .choices(Object.values(Profiles))
        .default(Profiles.GENERATE_SONG_SCHEMA)
        .argParser((value) => {
          // Find matching profile (case-insensitive)
          const matchingProfile = Object.values(Profiles).find(
            (profile) => profile.toLowerCase() === value.toLowerCase()
          );

          if (!matchingProfile) {
            // UPDATED: Use ErrorFactory with formatted suggestions
            const suggestions = Array.from(PROFILE_DESCRIPTIONS.entries()).map(
              ([profile, desc]) => `  ▸ ${profile}: ${desc}`
            );

            throw ErrorFactory.args(`Invalid profile: ${value}`, [
              "Valid profiles are (case-insensitive):\n",
              ...suggestions,
            ]);
          }
          return matchingProfile as Profile;
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
    .option("--force", "Force overwrite of existing files without prompting")
    .helpOption("-h, --help", "Display help for command")
    .addHelpText("after", () => {
      Logger.showReferenceCommands();
      return "";
    })
    .hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.debug) {
        Logger.enableDebug();
        Logger.debug`Full command options: ${JSON.stringify(opts, null, 2)}`;
      }
    });
}

/**
 * Parse command line arguments into structured CLIOutput
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
