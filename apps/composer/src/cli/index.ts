// src/cli/index.ts - Updated with consolidated error handling
import { Command } from "commander";
import { CommandRegistry } from "../commands/commandRegistry";
import { ErrorFactory } from "../utils/errors"; // UPDATED: Import ErrorFactory
import { validateEnvironment } from "../validations";
import { loadEnvironmentConfig } from "./environment";
import { configureCommandOptions, parseOptions } from "./commandOptions";

export async function setupCLI(): Promise<any> {
  const program = new Command();

  try {
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);
    program.parse();
    const options = program.opts();

    if (!CommandRegistry.isRegistered(options.profile)) {
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.args(`Invalid profile: ${options.profile}`, [
        "Use --help to see available profiles",
        `Available profiles: ${CommandRegistry.getAvailableProfiles().join(
          ", "
        )}`,
        "Example: -p SongSchema or -p LecternDictionary",
      ]);
    }

    // Fix: Use getConfig instead of getDefinition
    const commandConfig = CommandRegistry.getConfig(options.profile);
    if (commandConfig && options.files) {
      const path = require("path");
      const invalidFiles = options.files.filter((file: string) => {
        const ext = path.extname(file).toLowerCase();
        return !commandConfig.fileTypes.includes(ext);
      });

      if (invalidFiles.length > 0) {
        // UPDATED: Use ErrorFactory with detailed suggestions
        throw ErrorFactory.validation(
          `Invalid file types for ${commandConfig.name}`,
          {
            invalidFiles,
            expectedTypes: commandConfig.fileTypes,
            providedFiles: options.files,
          },
          [
            `${commandConfig.name} supports: ${commandConfig.fileTypes.join(
              ", "
            )}`,
            "Check your input files and try again",
            `Invalid files: ${invalidFiles.join(", ")}`,
          ]
        );
      }
    }

    // Use the parseOptions function from commandOptions
    const cliOutput = parseOptions(options);
    cliOutput.envConfig = envConfig;

    // Validate environment
    await validateEnvironment({
      profile: options.profile,
      outputPath: cliOutput.outputPath,
    });

    return cliOutput;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    // UPDATED: Use ErrorFactory
    throw ErrorFactory.args("Error setting up CLI", [String(error)]);
  }
}
