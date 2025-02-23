import { Command } from "commander";
import { Profile, CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { validateEnvironment } from "../validations";
import { loadEnvironmentConfig } from "./environment";
import { determineMode, getDefaultOutputPath } from "./profiles";
import { validateCliOptions } from "./validation";
import { configureCommandOptions } from "./options";
import { Logger } from "../utils/logger";

export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    // Load environment and parse options
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);
    program.parse();
    const options = program.opts();

    // Process profile and mode
    const profile = options.profile as Profile;
    const mode = determineMode(profile);
    const outputPath =
      options.output || getDefaultOutputPath(profile, envConfig);

    // Log consolidated configuration
    Logger.debugObject("CLI Configuration", {
      command: {
        profile,
        mode,
        input: options.files,
        output: outputPath,
      },
      directories: {
        elasticsearch: envConfig.esConfigDir,
        arranger: envConfig.arrangerConfigDir,
        lectern: envConfig.lecternDictionary,
        song: envConfig.songSchema,
      },
    });

    // Validate options and environment
    validateCliOptions(options, profile);
    await validateEnvironment({
      profile,
      dataFile: envConfig.dataFile,
      esConfigDir: envConfig.esConfigDir,
      arrangerConfigDir: envConfig.arrangerConfigDir,
      lecternDictionary: envConfig.lecternDictionary,
      songSchema: envConfig.songSchema,
      outputPath,
    });

    // Build CLI output
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

    // Add profile-specific config
    if (mode === "dictionary") {
      cliOutput.dictionaryConfig = {
        name: options.name,
        description: options.description,
        version: options.version,
      };
    } else if (mode === "song") {
      cliOutput.songConfig = {
        name: options.name,
        fileTypes: options.fileTypes,
      };
    } else if (mode === "arranger") {
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
