#!/usr/bin/env node

// src/main.ts - Simplified main entry point
import { setupCLI } from "./cli";
import { CommandRegistry } from "./commands/commandRegistry";
import { Environment } from "./config/environment";
import { ConductorError, ErrorCodes, handleError } from "./utils/errors";
import { Logger } from "./utils/logger";
import chalk from "chalk";

// Add global unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

async function main() {
  try {
    // Initialize environment and logging
    if (Environment.isDebug) {
      Logger.enableDebug();
    }

    Logger.header(`Conductor: Data Processing Pipeline`);
    Logger.info(chalk.grey.italic`  Version: 1.0.0`);
    Logger.generic(" ");

    // Setup CLI and get parsed arguments
    const cliOutput = await setupCLI();

    Logger.info(chalk.grey.italic`  Profile: ${cliOutput.profile}`);
    Logger.generic(" ");
    Logger.initialize();

    Logger.debug`Starting CLI setup`;
    Logger.debug`Creating command instance`;

    // Use the simplified command registry
    const command = CommandRegistry.createCommand(cliOutput.profile);

    Logger.debug`Running command`;

    // Execute the command
    const result = await command.run(cliOutput);

    // Check command result and handle errors
    if (!result.success) {
      throw new ConductorError(
        result.errorMessage || "Command execution failed",
        result.errorCode || ErrorCodes.UNKNOWN_ERROR,
        result.details
      );
    }

    Logger.success(`Command '${cliOutput.profile}' completed successfully`);
  } catch (error) {
    // Enhanced error handling with helpful context
    if (Environment.isDebug) {
      console.error("FATAL ERROR:", error);
    }

    // Special handling for unknown commands
    if (error instanceof Error && error.message.includes("Unknown command")) {
      Logger.error(error.message);
      Logger.generic("");
      CommandRegistry.displayHelp();
      process.exit(1);
    }

    // Let the handleError function handle other errors
    handleError(error);
  }
}

// Enhanced error handling for uncaught errors
main().catch((error) => {
  if (Environment.isDebug) {
    console.error("UNCAUGHT ERROR IN MAIN:", error);
  }

  // Try to provide helpful information even for uncaught errors
  if (error instanceof Error && error.message.includes("command")) {
    Logger.error("Command execution failed");
    Logger.tip("Use --debug flag for detailed error information");
    CommandRegistry.displayHelp();
  } else {
    handleError(error);
  }
});
