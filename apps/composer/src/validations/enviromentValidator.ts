import * as fs from "fs";
import * as path from "path";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { PathValidationConfig } from "../types/validations";
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
        Logger.info`Created directory: ${dir}`;
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
