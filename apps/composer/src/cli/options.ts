import { Command, Option } from "commander";
import { Profile, Profiles } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { PROFILE_DESCRIPTIONS } from "./profiles";
import { Logger } from "../utils/logger";

/**
 * Configures and returns the CLI command with all available options
 */
export function configureCommandOptions(program: Command): Command {
  return program
    .name("composer")
    .description(
      "Generate Dictionary, Song Schema, or Elasticsearch configurations"
    )
    .addOption(
      new Option("-p, --profile <profile>", "Execution profile")
        .choices(Object.keys(Profiles))
        .default("default")
        .argParser((value) => {
          if (!Object.values(Profiles).includes(value as Profile)) {
            throw new ComposerError(
              `Invalid profile: ${value}. Valid profiles are:\n${Array.from(
                PROFILE_DESCRIPTIONS.entries()
              )
                .map(([profile, desc]) => `  ${profile}: ${desc}`)
                .join("\n")}`,
              ErrorCodes.INVALID_ARGS
            );
          }
          return value as Profile;
        })
    )
    .requiredOption(
      "-f, --files <paths...>",
      "Input file paths (CSV or JSON, space separated)"
    )
    .option("-i, --index <name>", "Elasticsearch index name", "tabular-index")
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
    .option("--debug", "Enable debug logging")
    .hook("preAction", (thisCommand) => {
      if (thisCommand.opts().debug) {
        Logger.enableDebug();
        Logger.debug("Debug logging enabled");
      }
    });
}
