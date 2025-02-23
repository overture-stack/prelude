import * as path from "path";
import { Profile, CLIMode, EnvConfig, Profiles } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";

export const DEFAULT_PATHS = {
  songSchema: "configs/songSchema/schema.json",
  lecternDictionary: "configs/lecternDictionaries/dictionary.json",
  elasticsearchMapping: "configs/elasticsearchConfigs/mapping.json",
  arrangerConfigs: "configs/arrangerConfigs",
} as const;

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

const PROFILE_TO_MODE: Record<Profile, CLIMode> = {
  [Profiles.GENERATE_SONG_SCHEMA]: "song",
  [Profiles.GENERATE_LECTERN_DICTIONARY]: "dictionary",
  [Profiles.GENERATE_ELASTICSEARCH_MAPPING]: "mapping",
  [Profiles.GENERATE_ARRANGER_CONFIGS]: "arranger",
  [Profiles.GENERATE_CONFIGS]: "all",
  [Profiles.DEFAULT]: "all",
} as const;

export function determineMode(profile: Profile): CLIMode {
  Logger.debug(`Determining mode for profile: ${profile}`);

  const mode = PROFILE_TO_MODE[profile];
  if (!mode) {
    throw new ComposerError(
      `Invalid profile: ${profile}`,
      ErrorCodes.INVALID_ARGS
    );
  }

  Logger.debug(`Selected mode: ${mode}`);
  return mode;
}

export function getDefaultOutputPath(
  profile: Profile,
  envConfig: EnvConfig
): string {
  Logger.debug(`Getting default output path for profile: ${profile}`);

  let outputPath: string;

  switch (profile) {
    case Profiles.GENERATE_SONG_SCHEMA:
      outputPath = path.join(envConfig.songSchema || "", "schema.json");
      break;
    case Profiles.GENERATE_LECTERN_DICTIONARY:
      outputPath = path.join(
        envConfig.lecternDictionary || "",
        "dictionary.json"
      );
      break;
    case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
      outputPath = path.join(envConfig.esConfigDir || "", "mapping.json");
      break;
    case Profiles.GENERATE_ARRANGER_CONFIGS:
      outputPath = path.join(envConfig.arrangerConfigDir || "", "configs");
      break;
    case Profiles.GENERATE_CONFIGS:
      outputPath = envConfig.esConfigDir || "";
      break;
    default:
      throw new ComposerError(
        `Cannot determine output path for profile: ${profile}`,
        ErrorCodes.INVALID_ARGS
      );
  }

  Logger.debug(`Using default output path: ${outputPath}`);
  return outputPath;
}
