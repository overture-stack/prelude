import * as fs from "fs";
import * as path from "path";
import { ErrorFactory } from "../utils/errors"; // UPDATED: Import ErrorFactory
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
    Logger.debug`Environment already validated, skipping check`;
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
        // UPDATED: Use ErrorFactory with helpful suggestions
        throw ErrorFactory.environment(
          `Failed to create directory ${dir}`,
          error,
          [
            "Check that you have write permissions to the parent directory",
            "Ensure the path is not too long for your filesystem",
            "Verify there are no special characters in the path",
            "Make sure the disk has sufficient space",
          ]
        );
      }
    }
  }

  environmentValidated = true;
  return true;
}
