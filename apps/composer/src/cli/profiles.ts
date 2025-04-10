import { Profile, EnvConfig, Profiles } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";
import { getDefaultOutputPathForProfile } from "../utils/paths";

export const PROFILE_DESCRIPTIONS = new Map([
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

  // Get the standard output path
  let defaultPath = getDefaultOutputPathForProfile(profile);

  // Use environment output path if available
  if (envConfig.outputPath) {
    defaultPath = envConfig.outputPath;
  }

  Logger.debug`Using default output path: ${defaultPath}`;
  return defaultPath;
}
