/**
 * CLI Entry Point Module
 *
 * This module serves as the main entry point for the Conductor CLI application.
 * It handles command-line argument parsing, environment configuration, and command setup.
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
  | "lecternUpload"
  | "lyricRegister"
  | "lyricUpload"
  | "maestroIndex"
  | "songUploadSchema"
  | "songCreateStudy"
  | "songSubmitAnalysis"
  | "scoreManifestUpload"
  | "songPublishAnalysis"
  | "songScoreSubmit";

/**
 * Standardized output from the CLI parsing process.
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
 */
export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    Logger.debug("Conductor CLI");

    // Load environment and parse options
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);

    Logger.debug("Raw arguments:", process.argv);
    program.parse(process.argv);

    // Get the command
    const commandName = program.args[0];

    // Get the specific command
    const command = program.commands.find((cmd) => cmd.name() === commandName);

    // Extract options for the specific command
    const options = command ? command.opts() : {};

    Logger.debug("Parsed options:", options);
    Logger.debug("Remaining arguments:", program.args);

    // Determine the profile based on the command name
    let profile: CLIprofile = Profiles.UPLOAD; // Default to upload instead of index management
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
      case "lyricUpload":
        profile = Profiles.LYRIC_DATA;
        break;
      case "maestroIndex":
        profile = Profiles.INDEX_REPOSITORY;
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
    Logger.debug("CLI setup completed successfully");

    return cliOutput;
  } catch (error) {
    console.error("Error during CLI setup:", error);
    throw error;
  }
}
