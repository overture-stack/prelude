// src/cli/index.ts - Fixed to handle directories properly
import { Command } from "commander";
import { CommandRegistry } from "../commands/commandRegistry";
import { ErrorFactory } from "../utils/errors";
import { validateEnvironment } from "../validations";
import { loadEnvironmentConfig } from "./environment";
import { configureCommandOptions, parseOptions, PROFILE_DESCRIPTIONS } from "./commandOptions";
import { Profiles } from "../types/profiles";
import { Logger } from "../utils/logger";
import { expandDirectoryPaths } from "../utils/fileUtils";
import * as path from "path";
import * as fs from "fs";

export async function setupCLI(): Promise<any> {
  const program = new Command();

  try {
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);

    // Check if we should show help before parsing (when no profile is specified)
    const argv = process.argv.slice(2);
    const hasProfile = argv.some(arg =>
      Object.values(Profiles).some(profile =>
        profile.toLowerCase() === arg.toLowerCase()
      )
    );
    const hasPFlag = argv.includes('-p') || argv.some(arg => arg.startsWith('--profile'));
    const hasHelpFlag = argv.includes('-h') || argv.includes('--help');

    // If no profile specified and no help flag, show help
    if (!hasProfile && !hasPFlag && !hasHelpFlag && argv.length > 0) {
      Logger.showReferenceCommands();
      process.exit(0);
    }

    // If no arguments at all, show help
    if (argv.length === 0) {
      Logger.showReferenceCommands();
      process.exit(0);
    }

    program.parse();
    const options = program.opts();
    const args = program.args;

    // Handle profile from positional argument or -p option
    let profile = options.profile;

    // If positional argument is provided, use it (takes precedence over -p option)
    if (args.length > 0) {
      const positionalProfile = args[0];
      // Find matching profile (case-insensitive)
      const matchingProfile = Object.values(Profiles).find(
        (p) => p.toLowerCase() === positionalProfile.toLowerCase()
      );

      if (matchingProfile) {
        profile = matchingProfile;
      } else {
        // If positional argument doesn't match a profile, treat it as invalid
        const suggestions = Array.from(PROFILE_DESCRIPTIONS.entries()).map(
          ([profile, desc]) => `  ▸ ${profile}: ${desc}`
        );

        throw ErrorFactory.args(`Invalid profile: ${positionalProfile}`, [
          "Valid profiles are (case-insensitive):\n",
          ...suggestions,
          "\nUsage examples:",
          "  ▸ composer ArrangerConfigs -f mapping.json",
          "  ▸ composer -p ArrangerConfigs -f mapping.json",
        ]);
      }
    }

    // Profile should be set by now (either from args or -p option)
    if (!profile) {
      throw ErrorFactory.args("No profile specified", [
        "This should not happen - profile validation error",
      ]);
    }

    // Update options with resolved profile
    options.profile = profile;

    if (!CommandRegistry.isRegistered(options.profile)) {
      throw ErrorFactory.args(`Invalid profile: ${options.profile}`, [
        "Use --help to see available profiles",
        `Available profiles: ${CommandRegistry.getAvailableProfiles().join(
          ", "
        )}`,
        "Example: -p SongSchema or -p LecternDictionary",
      ]);
    }

    // FIXED: Expand directories but let commands handle file type validation
    if (options.files) {
      // Get the command config to know what file types are supported
      const commandConfig = CommandRegistry.getConfig(options.profile);

      if (commandConfig) {
        // Separate directories from explicit files
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
            // If we can't stat it, treat it as an explicit file (let file validation handle the error)
            explicitFiles.push(pathStr);
          }
        });

        // Expand directories with file type filtering
        const expandedFiles =
          directories.length > 0
            ? expandDirectoryPaths(directories, commandConfig.fileTypes)
            : [];

        // Combine expanded directory files with explicit files (no filtering on explicit files)
        const allFiles = [...expandedFiles, ...explicitFiles];

        if (allFiles.length === 0) {
          throw ErrorFactory.validation(
            `No supported files found for ${commandConfig.name}`,
            {
              providedPaths: options.files,
              supportedTypes: commandConfig.fileTypes,
            },
            [
              `${commandConfig.name} supports: ${commandConfig.fileTypes.join(
                ", "
              )}`,
              "Check that your directories contain files with the correct extensions",
              "Verify the paths are correct and accessible",
            ]
          );
        }

        // Replace the original files array with the combined list
        options.files = allFiles;

        // Only validate file extensions for directory-expanded files
        // Let individual commands handle explicit file validation for better error messages
        if (directories.length > 0 && explicitFiles.length === 0) {
          // Only directories were provided - validate all files
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
                `${commandConfig.name} supports: ${commandConfig.fileTypes.join(
                  ", "
                )}`,
                "Check your input files and try again",
                `Invalid files: ${invalidFiles.join(", ")}`,
              ]
            );
          }
        }
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
    throw ErrorFactory.args("Error setting up CLI", [String(error)]);
  }
}
