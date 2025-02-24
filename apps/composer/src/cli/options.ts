import { Command, Option } from "commander";
import { Profile, Profiles, CLIOutput, CLIMode } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { PROFILE_DESCRIPTIONS } from "./profiles";
import { Logger } from "../utils/logger";

/**
 * Configures and returns the CLI command with all available options
 */
export function configureCommandOptions(program: Command): Command {
  Logger.debug("Configuring command options");

  return program
    .name("composer")
    .description(
      "Generate Dictionary, Song Schema, or Elasticsearch configurations"
    )
    .option("--debug", "Enable debug logging")
    .addOption(
      new Option("-p, --profile <profile>", "Execution profile")
        .choices(Object.keys(Profiles))
        .default("default")
        .argParser((value) => {
          Logger.debug(`Parsing profile value: ${value}`);
          if (!Object.values(Profiles).includes(value as Profile)) {
            Logger.debug(`Invalid profile detected: ${value}`);
            throw new ComposerError(
              `Invalid profile: ${value}. Valid profiles are:\n${Array.from(
                PROFILE_DESCRIPTIONS.entries()
              )
                .map(([profile, desc]) => `  ${profile}: ${desc}`)
                .join("\n")}`,
              ErrorCodes.INVALID_ARGS
            );
          }
          Logger.debug(`Profile validated: ${value}`);
          return value as Profile;
        })
    )
    .requiredOption(
      "-f, --files <paths...>",
      "Input file paths (CSV or JSON, space separated)"
    )
    .option("-i, --index <name>", "Elasticsearch index name", "data")
    .option("--shards <number>", "Number of Elasticsearch shards", "1")
    .option("--replicas <number>", "Number of Elasticsearch replicas", "1")
    .option(
      "-o, --output <path>",
      "Output file path for generated schemas or mapping"
    )
    .option(
      "--arranger-doc-type <type>",
      "Arranger document type (file or analysis)",
      "file"
    )
    .option("-n, --name <name>", "Dictionary/Schema name")
    .option(
      "-d, --description <text>",
      "Dictionary description",
      "Generated dictionary from CSV files"
    )
    .option("-v, --version <version>", "Dictionary version", "1.0.0")
    .option("--file-types <types...>", "Allowed file types for Song schema")
    .option("--delimiter <char>", "CSV delimiter", ",")
    .helpOption("-h, --help", "Display help for command")
    .addHelpText("after", () => {
      Logger.showReferenceCommands();
      return ""; // Return empty string since we handle the formatting in showReferenceCommands
    })
    .hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.debug) {
        Logger.enableDebug();
        Logger.debug(`Full command options: ${JSON.stringify(opts, null, 2)}`);
      }
    });
}

/**
 * Parse command line arguments and convert them to CLIOutput format
 */
export function parseCommandLineArgs(opts: any): CLIOutput {
  Logger.debug("Parsing command line arguments");

  const output: CLIOutput = {
    profile: opts.profile || "default",
    mode: opts.mode || "default",
    debug: opts.debug || false,
    filePaths: opts.files || [],
    outputPath: opts.output,
    config: {
      elasticsearch: {
        index: opts.index || "data",
        shards: parseInt(opts.shards || "1", 10),
        replicas: parseInt(opts.replicas || "1", 10),
      },
      delimiter: opts.delimiter || ",",
    },
    envConfig: {
      fileMetadataSample: opts.fileMetadataSample || "",
      tabularSample: opts.tabularSample || "",
      songSchema: opts.songSchema || "",
      lecternDictionary: opts.lecternDictionary || "",
      esConfigDir: opts.esConfigDir || "",
      arrangerConfigDir: opts.arrangerConfigDir || "",
    },
    arrangerConfig: opts.arrangerDocType
      ? {
          documentType: opts.arrangerDocType,
        }
      : undefined,
    delimiter: opts.delimiter,
    dictionaryConfig:
      opts.name || opts.description || opts.version
        ? {
            name: opts.name || "",
            description:
              opts.description || "Generated dictionary from CSV files",
            version: opts.version || "1.0.0",
          }
        : undefined,
    songConfig:
      opts.name || opts.fileTypes
        ? {
            name: opts.name,
            fileTypes: opts.fileTypes,
          }
        : undefined,
  };

  if (opts.debug) {
    Logger.debug(`Parsed CLI output: ${JSON.stringify(output, null, 2)}`);
  }

  return output;
}
