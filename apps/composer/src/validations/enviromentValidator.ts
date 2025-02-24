import * as fs from "fs";
import * as path from "path";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { PathValidationConfig } from "../types/validations";
import { Profiles } from "../types";
import { Logger } from "../utils/logger";

// Keep track of validation state to prevent duplicate validations
let environmentValidated = false;

/**
 * Determines which directories are required based on the selected profile.
 */
function getRequiredDirectories(config: PathValidationConfig): string[] {
  const { profile, outputPath } = config;
  const directories: string[] = [];

  if (outputPath) {
    const outputDir = path.dirname(outputPath);
    if (outputDir !== ".") {
      directories.push(outputDir);
    }
  }

  if (profile !== Profiles.GENERATE_CONFIGS) {
    switch (profile) {
      case Profiles.GENERATE_LECTERN_DICTIONARY:
        if (config.lecternDictionary)
          directories.push(config.lecternDictionary);
        break;
      case Profiles.GENERATE_SONG_SCHEMA:
        if (config.songSchema) directories.push(config.songSchema);
        break;
      case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
        if (config.esConfigDir) directories.push(config.esConfigDir);
        break;
      case Profiles.GENERATE_ARRANGER_CONFIGS:
        if (config.arrangerConfigDir)
          directories.push(config.arrangerConfigDir);
        break;
    }
  }

  return [...new Set(directories)].map((dir) => path.normalize(dir));
}

/**
 * Validates the environment configuration and creates any missing directories.
 */
export async function validateEnvironment(
  config: PathValidationConfig
): Promise<boolean> {
  // Skip if already validated
  if (environmentValidated) {
    Logger.debug("Environment already validated, skipping check");
    return true;
  }

  Logger.debugObject("Environment configuration", config);

  // Get and create required directories
  const directories = getRequiredDirectories(config);
  for (const dir of directories) {
    if (dir && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        Logger.info(`Created directory: ${dir}`);
      } catch (error) {
        throw new ComposerError(
          `Failed to create directory ${dir}`,
          ErrorCodes.ENV_ERROR,
          error
        );
      }
    }
  }

  environmentValidated = true;
  return true;
}

/**
 * Validates that all required npm dependencies are installed.
 */
export async function validateDependencies(
  composerPath: string
): Promise<boolean> {
  Logger.debug("Setting up configuration generator");
  Logger.debug("Checking Composer dependencies");

  try {
    const nodeModulesPath = path.join(composerPath, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
      throw new ComposerError(
        "node_modules not found. Consider running 'npm install'",
        ErrorCodes.ENV_ERROR
      );
    }

    Logger.debug("Dependencies validation complete");
    return true;
  } catch (error) {
    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error validating dependencies",
      ErrorCodes.ENV_ERROR,
      error
    );
  }
}
