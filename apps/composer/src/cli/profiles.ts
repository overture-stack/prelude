import * as path from "path";
import { Profile, CLIMode, EnvConfig, Profiles } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";

/**
 * Profile-specific default paths
 */
export const DEFAULT_PATHS = {
  songSchema: "configs/songSchema/schema.json",
  lecternDictionary: "configs/lecternDictionaries/dictionary.json",
  elasticsearchMapping: "configs/elasticsearchConfigs/mapping.json",
  arrangerConfigs: "configs/arrangerConfigs",
} as const;

/**
 * Profile descriptions for help text
 */
export const PROFILE_DESCRIPTIONS = new Map([
  [Profiles.GENERATE_SONG_SCHEMA, "Generate SONG schema from JSON metadata"],
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
  [Profiles.GENERATE_CONFIGS, "Generate all configurations"],
  [Profiles.DEFAULT, "Default profile"],
]);

/**
 * Determines the CLI mode based on the selected profile
 */
export function determineMode(profile: Profile): CLIMode {
  switch (profile) {
    case Profiles.GENERATE_SONG_SCHEMA:
      return "song";
    case Profiles.GENERATE_LECTERN_DICTIONARY:
      return "dictionary";
    case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
      return "mapping";
    case Profiles.GENERATE_ARRANGER_CONFIGS:
      return "arranger";
    case Profiles.GENERATE_CONFIGS:
      return "all";
    default:
      throw new ComposerError(
        `Invalid profile: ${profile}`,
        ErrorCodes.INVALID_ARGS
      );
  }
}

/**
 * Gets the default output path for a given profile
 */
export function getDefaultOutputPath(
  profile: Profile,
  envConfig: EnvConfig
): string {
  switch (profile) {
    case Profiles.GENERATE_SONG_SCHEMA:
      return path.join(envConfig.songSchema || "", "schema.json");
    case Profiles.GENERATE_LECTERN_DICTIONARY:
      return path.join(envConfig.lecternDictionary || "", "dictionary.json");
    case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
      return path.join(envConfig.esConfigDir || "", "mapping.json");
    case Profiles.GENERATE_ARRANGER_CONFIGS:
      return path.join(envConfig.arrangerConfigDir || "", "configs");
    case Profiles.GENERATE_CONFIGS:
      return envConfig.esConfigDir || "";
    default:
      throw new ComposerError(
        `Cannot determine output path for profile: ${profile}`,
        ErrorCodes.INVALID_ARGS
      );
  }
}
