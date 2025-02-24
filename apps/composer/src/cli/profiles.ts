import * as path from "path";
import { Profile, CLIMode, EnvConfig, Profiles } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";
import { getDefaultOutputPathForProfile } from "../utils/paths";

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
): string | undefined {
  Logger.debug(`Getting default output path for profile: ${profile}`);

  // Handle special cases first
  if (profile === Profiles.GENERATE_CONFIGS) {
    return envConfig.esConfigDir || "";
  }

  // Get the standard output path
  let defaultPath = getDefaultOutputPathForProfile(profile);

  // Override with environment config if needed
  if (defaultPath) {
    switch (profile) {
      case Profiles.GENERATE_SONG_SCHEMA:
        defaultPath = path.join(envConfig.songSchema || "", "schema.json");
        break;
      case Profiles.GENERATE_LECTERN_DICTIONARY:
        defaultPath = path.join(
          envConfig.lecternDictionary || "",
          "dictionary.json"
        );
        break;
      case Profiles.GENERATE_ARRANGER_CONFIGS:
        defaultPath = path.join(envConfig.arrangerConfigDir || "", "configs");
        break;
    }
  }

  Logger.debug(`Using default output path: ${defaultPath}`);
  return defaultPath;
}
