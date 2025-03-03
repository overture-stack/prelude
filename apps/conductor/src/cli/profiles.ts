import { Profile, EnvConfig, Profiles } from "../types";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";

export const PROFILE_DESCRIPTIONS = new Map([
  [Profiles.UPLOAD, "Upload CSV files to Elasticsearch"],
  [Profiles.INDEX_MANAGEMENT, "Set up Elasticsearch indices and templates"],
]);

// Get all valid profiles
const VALID_PROFILES = Object.values(Profiles);

export function validateProfile(profile: Profile): Profile {
  Logger.debug`Validating profile: ${profile}`;

  if (!VALID_PROFILES.includes(profile)) {
    throw new ConductorError(
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

  // You can add specific output path logic here if needed
  return undefined;
}
