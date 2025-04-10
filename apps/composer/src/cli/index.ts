import { Command } from "commander";
import { Profile, CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { validateEnvironment } from "../validations";
import { loadEnvironmentConfig } from "./environment";
import { getDefaultOutputPath } from "./profiles";
import { configureCommandOptions } from "./options";
import { Logger } from "../utils/logger";
import * as fs from "fs";
import * as path from "path";

/**
 * Extract file types from a JSON file containing file metadata
 * Used to automatically determine file types for Song schema generation
 *
 * @param filePath Path to the JSON file
 * @returns Array of file types found in the file
 */
function extractFileTypesFromJson(filePath: string): string[] {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    // Check if the JSON has a files array with fileType properties
    if (data && data.files && Array.isArray(data.files)) {
      // Extract unique file types
      const fileTypes = new Set<string>();
      data.files.forEach((file: any) => {
        if (file.fileType) {
          fileTypes.add(file.fileType);
        }
      });

      return Array.from(fileTypes);
    }

    return [];
  } catch (error) {
    Logger.debug(`Error extracting file types from JSON: ${error}`);
    return [];
  }
}

export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    // Load environment and parse options
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);
    program.parse();
    const options = program.opts();

    // Process profile
    const profile = options.profile as Profile;
    const outputPath =
      options.output || getDefaultOutputPath(profile, envConfig);

    // Log consolidated configuration
    Logger.debugObject("CLI Configuration", {
      command: {
        profile,
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
    await validateEnvironment({
      profile,
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
          shards: parseInt(options.shards, 10) || envConfig.esShards || 1,
          replicas: parseInt(options.replicas, 10) || envConfig.esReplicas || 0,
          ignoredFields: options.ignoreFields || envConfig.esIgnoredFields,
          skipMetadata:
            options.skipMetadata || envConfig.esSkipMetadata || false, // Added skipMetadata option
        },
        delimiter: options.delimiter || envConfig.csvDelimiter || ",",
      },
      profile,
      filePaths: options.files,
      outputPath,
      force: options.force || false,
      envConfig,
      arrangerConfigDir:
        options.arrangerConfigDir || envConfig.arrangerConfigDir,
    };

    // Add profile-specific config
    if (profile === "LecternDictionary") {
      cliOutput.dictionaryConfig = {
        name: options.name,
        description: options.description,
        version: options.version,
      };
    } else if (profile === "SongSchema") {
      // For Song schema, try to extract file types from the input file if not specified
      let fileTypes = options.fileTypes;

      // If file types not specified and there's exactly one JSON file, try to extract them
      if (
        (!fileTypes || fileTypes.length === 0) &&
        options.files &&
        options.files.length === 1
      ) {
        const filePath = options.files[0];
        if (path.extname(filePath).toLowerCase() === ".json") {
          Logger.debug("Attempting to extract file types from JSON file");
          const extractedTypes = extractFileTypesFromJson(filePath);
          if (extractedTypes.length > 0) {
            Logger.debug(
              `Found file types in JSON: ${extractedTypes.join(", ")}`
            );
            fileTypes = extractedTypes;
          }
        }
      }

      // Provide reasonable defaults for Song schema configuration
      cliOutput.songConfig = {
        name:
          options.name ||
          path.basename(options.files[0], path.extname(options.files[0])),
        fileTypes: fileTypes || [],
      };

      Logger.debug(
        `Song schema config: ${JSON.stringify(cliOutput.songConfig)}`
      );
    } else if (profile === "ArrangerConfigs") {
      cliOutput.arrangerConfig = {
        documentType:
          (options.arrangerDocType as "file" | "analysis") || "file",
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
