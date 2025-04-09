#!/usr/bin/env node

/**
 * Conductor Main Entry Point
 *
 * This is the main entry point for the Conductor CLI application.
 * It orchestrates the high-level application flow by:
 * 1. Setting up the CLI environment and parsing arguments
 * 2. Creating the appropriate command based on the provided profile
 * 3. Executing the command
 * 4. Handling any errors that occur during execution
 *
 * The application follows a layered architecture:
 * - main.ts (this file): Application entry point and orchestration
 * - cli.ts: Command-line argument parsing and environment setup
 * - commandFactory.ts: Command instance creation based on profile
 * - baseCommand.ts: Common command functionality and execution framework
 * - Individual command implementations: Specific business logic
 *
 * Error handling is centralized through the handleError utility,
 * which ensures consistent error reporting across the application.
 *
 * Usage:
 * $ conductor <profile> [options]
 *
 * Example:
 * $ conductor upload --file data.csv --index my-index
 */

import { setupCLI } from "./cli";
import { CommandFactory } from "./commands/Commandfactory";
import { handleError } from "./utils/errors";
import { Logger } from "./utils/logger";
import chalk from "chalk";

/**
 * Main application function that orchestrates the entire execution flow.
 *
 * This async function:
 * 1. Sets up the CLI and obtains parsed arguments
 * 2. Creates an appropriate command instance via the CommandFactory
 * 3. Executes the command with the parsed arguments
 * 4. Delegates error handling to the central error handler
 *
 * The function is designed to clearly separate concerns:
 * - CLI setup and argument parsing
 * - Command selection and creation
 * - Command execution
 * - Error handling
 */
async function main() {
  try {
    // Initialize logger first thing
    const cliOutput = await setupCLI();

    Logger.header(`Conductor: Data Processing Utilities`);
    console.log(chalk.grey.italic`  Version: 1.0.0`);
    console.log(chalk.grey.italic`  Profile: ${cliOutput.profile}`);
    Logger.generic(" ");
    Logger.initialize();
    Logger.debug`Starting CLI setup`;

    Logger.debug`Creating command instance`;
    const command = CommandFactory.createCommand(cliOutput.profile);

    Logger.debug`Running command`;
    await command.run(cliOutput);
  } catch (error) {
    // Let the handleError function handle this error
    handleError(error);
    // This line will never be reached due to process.exit in handleError
  }
}

// Execute the main function and catch any unhandled errors
main().catch(handleError);
