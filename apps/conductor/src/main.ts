#!/usr/bin/env node

import { setupCLI } from "./cli";
import { CommandRegistry } from "./commands/commandRegistry";
import { Environment } from "./config/environment";
import { handleError } from "./utils/errors";
import { Logger } from "./utils/logger";

process.on("unhandledRejection", (reason) => {
  Logger.errorString(`Unhandled error: ${String(reason)}`);
  process.exit(1);
});

async function main() {
  try {
    // Initialize environment and logging
    if (Environment.isDebug) {
      Logger.enableDebug();
    }
    // Setup CLI and get parsed arguments
    const cliOutput = await setupCLI();
    Logger.initialize();
    Logger.debugString(`Profile: ${cliOutput.profile}`);
    // Use the simplified command registry
    const command = CommandRegistry.createCommand(cliOutput.profile);
    Logger.debug`Running command`;

    // Execute the command
    // baseCommand.run() handles all error logging — no additional handling needed here
    const result = await command.run(cliOutput);

    // Check command result - if failed, just exit
    // baseCommand.run() already logged the error
    if (!result.success) {
      process.exit(1);
    }

    Logger.debug`Command '${cliOutput.profile}' completed successfully`;
  } catch (error) {
    // Special handling ONLY for unknown commands and CLI setup errors
    if (error instanceof Error && error.message.includes("Unknown command")) {
      handleError(error, () => {
        Logger.generic("");
        CommandRegistry.displayHelp();
      });
    } else {
      // Let the centralized error handler take care of CLI setup errors
      handleError(error);
    }
  }
}

// Simplified error handling for uncaught errors
main().catch(handleError);
