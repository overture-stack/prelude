import { Command } from "commander";
import { Profile, CLIMode, CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { validateEnvironment } from "../validations";
import { loadEnvironmentConfig } from "./environment";
import { determineMode, getDefaultOutputPath } from "./profiles";
import { validateCliOptions } from "./validation";
import { configureCommandOptions } from "./options";

/**
 * Sets up and configures the CLI interface
 * Handles command parsing, validation, and configuration assembly
 */
export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);

    program.parse();
    const options = program.opts();

    const profile = options.profile as Profile;
    validateCliOptions(options, profile);

    const mode = determineMode(profile);
    const outputPath =
      options.output || getDefaultOutputPath(profile, envConfig);

    // Validate environment with profile and outputPath
    await validateEnvironment({
      profile,
      dataFile: envConfig.dataFile,
      esConfigDir: envConfig.esConfigDir,
      arrangerConfigDir: envConfig.arrangerConfigDir,
      lecternDictionary: envConfig.lecternDictionary,
      songSchema: envConfig.songSchema,
      outputPath,
    });

    const cliOutput: CLIOutput = {
      config: {
        elasticsearch: {
          index:
            options.indexPattern ||
            options.index ||
            envConfig.indexName ||
            "data",
          shards: parseInt(options.shards, 10) || 1,
          replicas: parseInt(options.replicas, 10) || 0,
        },
        delimiter: options.delimiter || ",",
      },
      profile,
      mode,
      filePaths: options.files,
      outputPath,
      envConfig,
      arrangerConfigDir:
        options.arrangerConfigDir || envConfig.arrangerConfigDir,
    };

    // Add profile-specific configurations
    if (mode === "dictionary") {
      cliOutput.dictionaryConfig = {
        name: options.name,
        description: options.description,
        version: options.version,
      };
    }

    if (mode === "song") {
      cliOutput.songConfig = {
        name: options.name,
        fileTypes: options.fileTypes,
      };
    }

    if (mode === "arranger") {
      cliOutput.arrangerConfig = {
        documentType: options.arrangerDocType as "file" | "analysis",
      };
    }

    return cliOutput;
  } catch (error) {
    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error setting up CLI",
      ErrorCodes.ENV_ERROR,
      error
    );
  }
}

export { Profile, CLIMode };
