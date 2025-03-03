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
import { Config, CLIOutput as CLIOutputType } from "../types/cli";
import { Profiles } from "../types/constants";
import { parseCommandLineArgs } from "./options";
import { configureCommandOptions } from "./options";
import { loadEnvironmentConfig } from "./environment";
import { validateEnvironment } from "../validations/environment";
import { Logger } from "../utils/logger";
import { validateProfile } from "./profiles";

/**
 * Type definition for supported CLI profiles.
 * This should match the available profiles in the Profiles enum.
 */
export type CLIprofile = "upload" | "indexManagement";

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

  /** Debug flag */
  debug?: boolean;
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

    // Map command name to profile
    let profile;
    if (commandName === "upload") {
      profile = Profiles.UPLOAD;
    } else if (commandName === "indexManagement") {
      profile = Profiles.INDEX_MANAGEMENT;
    } else {
      throw new Error(`Unrecognized command: ${commandName}`);
    }

    // Validate the profile
    validateProfile(profile);

    // Get the specific command
    const command = program.commands.find((cmd) => cmd.name() === commandName);

    // Extract options for the specific command
    const options = command ? command.opts() : {};

    console.log("Parsed options:", options);
    console.log("Remaining arguments:", program.args);

    // Validate options and environment
    await validateEnvironment({
      elasticsearchUrl: options.url || envConfig.elasticsearchUrl,
    });

    // Parse command-line arguments into CLIOutput
    const cliOutput = parseCommandLineArgs({
      ...options,
      profile: profile, // Use the determined profile instead of hardcoded value
    });

    return cliOutput;
  } catch (error) {
    // Rethrow without logging
    throw error;
  }
}
