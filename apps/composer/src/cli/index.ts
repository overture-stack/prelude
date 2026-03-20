import { Command } from "commander";
import { CommandRegistry } from "../commands/commandRegistry";
import { ErrorFactory } from "../utils/errors";
import { validateEnvironment } from "../validations";
import { loadEnvironmentConfig } from "./environment";
import { configureCommandOptions, parseOptions, ParsedOpts } from "./commandOptions";
import { Profiles } from "../types/profiles";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { expandDirectoryPaths } from "../utils/fileUtils";
import * as path from "path";
import * as fs from "fs";

type Profile = (typeof Profiles)[keyof typeof Profiles];

const VALID_PROFILES = new Set<string>(Object.values(Profiles));

export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);

    Logger.debug`Raw arguments: ${process.argv.join(" ")}`;
    program.parse(process.argv);

    const commandName = program.args[0];

    // Show help if no command provided
    if (!commandName) {
      Logger.showReferenceCommands();
      process.exit(0);
    }

    // Validate it's a known profile
    if (!VALID_PROFILES.has(commandName)) {
      throw ErrorFactory.args(`Unknown command: ${commandName}`, [
        "Use 'composer --help' to see available commands",
        `Available commands: ${Array.from(VALID_PROFILES).join(", ")}`,
      ]);
    }

    const subCommand = program.commands.find(
      (cmd) => cmd.name() === commandName
    );

    if (!subCommand) {
      throw ErrorFactory.args(`Unknown command: ${commandName}`, [
        "Use 'composer --help' to see available commands",
      ]);
    }

    const globalOpts = program.opts();
    const subOpts = subCommand.opts();

    // Merge global debug flag with subcommand opts
    const options: ParsedOpts = { ...(subOpts as ParsedOpts), profile: commandName as Profile, debug: globalOpts.debug || (subOpts as ParsedOpts).debug };

    if (options.debug) {
      Logger.enableDebug();
      Logger.debug`Parsed options: ${JSON.stringify(options, null, 2)}`;
    }

    const profile = commandName as Profile;

    if (!CommandRegistry.isRegistered(profile)) {
      throw ErrorFactory.args(`Invalid profile: ${profile}`, [
        "Use --help to see available profiles",
        `Available profiles: ${CommandRegistry.getAvailableProfiles().join(", ")}`,
      ]);
    }

    // Expand directories but let commands handle file type validation
    if (options.files) {
      const commandConfig = CommandRegistry.getConfig(profile);

      if (commandConfig) {
        const directories: string[] = [];
        const explicitFiles: string[] = [];

        options.files.forEach((pathStr: string) => {
          try {
            if (fs.existsSync(pathStr) && fs.statSync(pathStr).isDirectory()) {
              directories.push(pathStr);
            } else {
              explicitFiles.push(pathStr);
            }
          } catch {
            explicitFiles.push(pathStr);
          }
        });

        const expandedFiles =
          directories.length > 0
            ? expandDirectoryPaths(directories, commandConfig.fileTypes)
            : [];

        const allFiles = [...expandedFiles, ...explicitFiles];

        if (allFiles.length === 0) {
          throw ErrorFactory.validation(
            `No supported files found for ${commandConfig.name}`,
            {
              providedPaths: options.files,
              supportedTypes: commandConfig.fileTypes,
            },
            [
              `${commandConfig.name} supports: ${commandConfig.fileTypes.join(", ")}`,
              "Check that your directories contain files with the correct extensions",
              "Verify the paths are correct and accessible",
            ]
          );
        }

        options.files = allFiles;

        if (directories.length > 0 && explicitFiles.length === 0) {
          const invalidFiles = options.files.filter((file: string) => {
            const ext = path.extname(file).toLowerCase();
            return !commandConfig.fileTypes.includes(ext);
          });

          if (invalidFiles.length > 0) {
            throw ErrorFactory.validation(
              `Invalid file types for ${commandConfig.name}`,
              {
                invalidFiles,
                expectedTypes: commandConfig.fileTypes,
                providedFiles: options.files,
              },
              [
                `${commandConfig.name} supports: ${commandConfig.fileTypes.join(", ")}`,
                "Check your input files and try again",
                `Invalid files: ${invalidFiles.join(", ")}`,
              ]
            );
          }
        }
      }
    }

    const cliOutput = parseOptions(options as Parameters<typeof parseOptions>[0]);
    cliOutput.envConfig = envConfig;

    await validateEnvironment({
      profile,
      outputPath: cliOutput.outputPath,
    });

    return cliOutput;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw ErrorFactory.args("Error setting up CLI", [String(error)]);
  }
}
