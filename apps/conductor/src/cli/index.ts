/**
 * CLI Entry Point Module
 *
 * This module serves as the main entry point for the Conductor CLI application.
 * It handles command-line argument parsing, environment configuration, and command setup.
 *
 * Responsibilities:
 * 1. Parsing command line arguments using Commander.js
 * 2. Loading and validating environment configuration
 * 3. Setting up the command structure and options
 * 4. Providing a standardized CLIOutput object to the command execution layer
 *
 * The flow of execution:
 * - CLI arguments → Commander.js parsing → Environment validation → CLIOutput creation → Command execution
 *
 * Related files:
 * - options.ts: Contains command-line option configuration and parsing logic
 * - environment.ts: Handles loading environment variables and configuration
 * - validations/environment.ts: Validates environment configuration
 * - types/cli.ts: Contains CLI-related type definitions
 * - types/constants.ts: Defines available profiles as constants
 * - commands/commandFactory.ts: Creates command instances based on the profile
 *
 * Usage:
 * The setupCLI() function is typically called from the main entry point (index.ts)
 * which then passes the CLIOutput to the appropriate command.
 */

import { Command } from "commander";
import { Config } from "../types/cli";
import { Profiles } from "../types/constants";
import { parseCommandLineArgs } from "./options";
import { configureCommandOptions } from "./options";
import { loadEnvironmentConfig } from "./environment";
import { validateEnvironment } from "../validations/environment";
import { Logger } from "../utils/logger";

/**
 * Type definition for supported CLI profiles.
 * This should match the available profiles in the Profiles enum.
 */
export type CLIprofile =
  | "upload"
  | "indexManagement"
  | "lecternUpload"
  | "lyricRegister"
  | "lyricData"
  | "songUploadSchema"
  | "songCreateStudy"
  | "songSubmitAnalysis"
  | "scoreManifestUpload"
  | "songPublishAnalysis"
  | "songScoreSubmit";

/**
 * Standardized output from the CLI parsing process.
 * This interface represents the fully processed command-line arguments
 * and serves as the contract between the CLI layer and command execution layer.
 */
export interface CLIOutput {
  /** Configuration settings for the command */
  config: Config;

  /** List of input file paths specified by the user */
  filePaths: string[];

  /** The selected profile/command to execute */
  profile: CLIprofile;

  /** Optional output directory path */
  outputPath?: string;

  /** Environment configuration (loaded from .env or system environment) */
  envConfig: any;

  /** Raw command options for command-specific handling */
  options: any;
}

/**
 * Sets up the CLI environment and parses command-line arguments.
 *
 * This function:
 * 1. Initializes the Commander.js instance
 * 2. Loads environment configuration
 * 3. Configures available commands and options
 * 4. Parses command-line arguments
 * 5. Validates the environment
 * 6. Returns a standardized CLIOutput object
 *
 * @returns Promise resolving to a CLIOutput object for command execution
 * @throws Error if environment validation fails or if command parsing fails
 */
export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    Logger.debug("Conductor CLI");

    // Load environment and parse options
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);

    console.log("Raw arguments:", process.argv);
    program.parse(process.argv);

    // Get the command
    const commandName = program.args[0];

    // Get the specific command
    const command = program.commands.find((cmd) => cmd.name() === commandName);

    // Extract options for the specific command
    const options = command ? command.opts() : {};

    console.log("Parsed options:", options);
    console.log("Remaining arguments:", program.args);

    // Determine the profile based on the command name
    let profile: CLIprofile = Profiles.INDEX_MANAGEMENT;
    switch (commandName) {
      case "upload":
        profile = Profiles.UPLOAD;
        break;
      case "lecternUpload":
        profile = Profiles.LECTERN_UPLOAD;
        break;
      case "lyricRegister":
        profile = Profiles.LYRIC_REGISTER;
        break;
      case "lyricData":
        profile = Profiles.LYRIC_DATA;
        break;
      case "songUploadSchema":
        profile = Profiles.song_upload_schema;
        break;
      case "songCreateStudy":
        profile = Profiles.song_create_study;
        break;
      case "songSubmitAnalysis":
        profile = Profiles.song_submit_analysis;
        break;
      case "scoreManifestUpload":
        profile = Profiles.score_manifest_upload;
        break;
      case "songPublishAnalysis":
        profile = Profiles.song_publish_analysis;
        break;
      case "songScoreSubmit":
        profile = Profiles.song_score_submit;
        break;
      case "indexManagement":
        profile = Profiles.INDEX_MANAGEMENT;
        break;
    }

    // Validate options and environment if needed
    // Skip Elasticsearch validation for Lectern, Lyric, and SONG operations
    if (
      profile !== Profiles.LECTERN_UPLOAD &&
      profile !== Profiles.LYRIC_REGISTER &&
      profile !== Profiles.LYRIC_DATA &&
      profile !== Profiles.song_upload_schema &&
      profile !== Profiles.song_create_study &&
      profile !== Profiles.song_submit_analysis &&
      profile !== Profiles.score_manifest_upload &&
      profile !== Profiles.song_publish_analysis &&
      profile !== Profiles.song_score_submit
    ) {
      await validateEnvironment({
        elasticsearchUrl: options.url || envConfig.elasticsearchUrl,
      });
    }

    // Parse command-line arguments into CLIOutput
    const cliOutput = parseCommandLineArgs({
      ...options,
      profile,
      // Ensure schema file is added to filePaths for Lectern and SONG upload
      ...(options.schemaFile ? { file: options.schemaFile } : {}),
      // Ensure analysis file is added to filePaths for SONG analysis upload
      ...(options.analysisFile ? { file: options.analysisFile } : {}),
    });

    return cliOutput;
  } catch (error) {
    // Rethrow without logging
    throw error;
  }
}
