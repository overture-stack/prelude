import { Profile, Profiles } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";

interface CLIOptions {
  name?: string;
  shards?: number;
  replicas?: number;
  arrangerDocType?: string;
  [key: string]: any;
}

/**
 * Validates CLI options based on the selected profile
 */
export function validateCliOptions(
  options: CLIOptions,
  profile: Profile
): void {
  try {
    switch (profile) {
      case Profiles.GENERATE_LECTERN_DICTIONARY:
        if (!options.name) {
          throw new ComposerError(
            "Dictionary name is required for dictionary generation",
            ErrorCodes.INVALID_ARGS
          );
        }
        break;

      case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
        if (options.shards && (isNaN(options.shards) || options.shards < 1)) {
          throw new ComposerError(
            "Number of shards must be a positive integer",
            ErrorCodes.INVALID_ARGS
          );
        }
        if (
          options.replicas &&
          (isNaN(options.replicas) || options.replicas < 0)
        ) {
          throw new ComposerError(
            "Number of replicas must be a non-negative integer",
            ErrorCodes.INVALID_ARGS
          );
        }
        break;

      case Profiles.GENERATE_ARRANGER_CONFIGS:
        if (
          options.arrangerDocType &&
          !["file", "analysis"].includes(options.arrangerDocType)
        ) {
          throw new ComposerError(
            'Arranger document type must be either "file" or "analysis"',
            ErrorCodes.INVALID_ARGS
          );
        }
        break;
    }
  } catch (error) {
    if (error instanceof ComposerError) throw error;
    throw new ComposerError(
      "Invalid CLI options",
      ErrorCodes.INVALID_ARGS,
      error
    );
  }
}
