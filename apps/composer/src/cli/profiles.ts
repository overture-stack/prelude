import * as path from "path";
import { Profile, EnvConfig, Profiles } from "../types";
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

// Get all valid profiles
const VALID_PROFILES = Object.values(Profiles);

export function validateProfile(profile: Profile): Profile {
  Logger.debug`Validating profile: ${profile}`;

  if (!VALID_PROFILES.includes(profile)) {
    throw new ComposerError(
      `Invalid profile: ${profile}. Valid profiles are: ${VALID_PROFILES.join(
        ", "
      )}`,
      ErrorCodes.INVALID_ARGS
    );
  }

  Logger.debug`Profile validated: ${profile}`;
  return profile;
}

export function getDefaultOutputPath(
  profile: Profile,
  envConfig: EnvConfig
): string | undefined {
  Logger.debug`Getting default output path for profile: ${profile}`;

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
        defaultPath = path.join(envConfig.songSchema || "", "songSchema.json");
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

  Logger.debug`Using default output path: ${defaultPath}`;
  return defaultPath;
}
