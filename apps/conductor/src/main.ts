#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandFactory } from "./commands/commandFactory";
import { ConductorError, ErrorCodes, handleError } from "./utils/errors";
import { Logger } from "./utils/logger";
import chalk from "chalk";

// Add global unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

async function main() {
  try {
    const cliOutput = await setupCLI();

    Logger.header(`Conductor: Data Processing Pipeline`);
    Logger.info(chalk.grey.italic`  Version: 1.0.0`);
    Logger.info(chalk.grey.italic`  Profile: ${cliOutput.profile}`);
    Logger.generic(" ");
    Logger.initialize();
    Logger.debug`Starting CLI setup`;

    Logger.debug`Creating command instance`;
    // Convert the CLI profile to the command factory profile type
    const command = CommandFactory.createCommand(cliOutput.profile as any);

    Logger.debug`Running command`;
    // Use the CLI output type directly
    const result = await command.run(cliOutput as any);

    // Check command result and handle errors
    if (!result.success) {
      throw new ConductorError(
        result.errorMessage || "Command execution failed",
        result.errorCode || ErrorCodes.UNKNOWN_ERROR,
        result.details
      );
    }
  } catch (error) {
    // Simplified error logging with optional debug details
    if (process.argv.includes("--debug")) {
      console.error("FATAL ERROR:", error);
    }

    // Let the handleError function handle this error
    handleError(error);
  }
}

// Replace the catch with a simpler approach that defers to handleError
main().catch((error) => {
  if (process.argv.includes("--debug")) {
    console.error("UNCAUGHT ERROR IN MAIN:", error);
  }
  handleError(error);
});
