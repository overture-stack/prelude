// src/cli/index.ts - Fixed imports and exports
import { Command } from "commander";
import { CommandRegistry } from "../commands/commandRegistry";
import { ErrorService } from "../services/errorService";
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
      throw ErrorService.args(`Invalid profile: ${options.profile}`, [
        "Use --help to see available profiles",
        `Available profiles: ${CommandRegistry.getAvailableProfiles().join(
          ", "
        )}`,
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
        throw ErrorService.validation(
          `Invalid file types for ${commandConfig.name}`,
          { invalidFiles },
          [
            `${commandConfig.name} supports: ${commandConfig.fileTypes.join(
              ", "
            )}`,
            "Check your input files and try again",
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
    throw ErrorService.args("Error setting up CLI", [String(error)]);
  }
}
