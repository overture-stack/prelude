import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { PathValidationConfig } from "../types/validations";
import { Profiles } from "../types";

/**
 * Determines which directories are required based on the selected profile.
 * Different profiles (like generating Elasticsearch mappings or Arranger configs)
 * need different directories to be present.
 *
 * @param config - Configuration object containing profile and path information
 * @returns Array of normalized directory paths that need to exist
 */
function getRequiredDirectories(config: PathValidationConfig): string[] {
  const { profile, outputPath } = config;
  const directories: string[] = [];

  // Include output directory's parent if specified (excluding current directory)
  if (outputPath) {
    const outputDir = path.dirname(outputPath);
    if (outputDir !== ".") {
      directories.push(outputDir);
    }
  }

  // Add profile-specific directories when not in generateConfigs mode
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

  // Deduplicate and normalize all paths for consistency
  return [...new Set(directories)].map((dir) => path.normalize(dir));
}

/**
 * Validates the environment configuration and creates any missing directories.
 * This ensures all necessary directories exist before starting operations.
 *
 * @param config - Configuration object with paths to validate
 * @returns Promise resolving to true if validation succeeds
 * @throws ComposerError if directory creation fails
 */
export async function validateEnvironment(
  config: PathValidationConfig
): Promise<boolean> {
  console.log(chalk.yellow("\nDebug: Checking environment configuration..."));

  // Log configuration for debugging purposes
  Object.entries(config).forEach(([key, value]) => {
    console.log(chalk.blue(`  ${key}:`), value || "Not set");
  });

  // Get and create required directories
  const directories = getRequiredDirectories(config);
  for (const dir of directories) {
    if (dir && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(chalk.green(`✓ Created directory: ${dir}`));
      } catch (error) {
        throw new ComposerError(
          `Failed to create directory ${dir}`,
          ErrorCodes.ENV_ERROR,
          error
        );
      }
    }
  }

  console.log(chalk.green("\n✓ Environment validation completed successfully"));
  return true;
}

/**
 * Validates that all required npm dependencies are installed.
 * Checks for presence of node_modules directory.
 *
 * @param composerPath - Path to the composer project root
 * @returns Promise resolving to true if dependencies are present
 * @throws ComposerError if dependencies are missing
 */
export async function validateDependencies(
  composerPath: string
): Promise<boolean> {
  console.log(
    chalk.cyan("\nConfig Generator: Setting up configuration generator")
  );

  try {
    console.log(chalk.magenta("[1/2] Checking Composer dependencies"));

    const nodeModulesPath = path.join(composerPath, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
      throw new ComposerError(
        "node_modules not found. Consider running 'npm install'",
        ErrorCodes.ENV_ERROR
      );
    }

    console.log(chalk.green("✓ Dependencies are present"));
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
