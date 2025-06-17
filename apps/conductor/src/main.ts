#!/usr/bin/env node

// src/main.ts - Simplified main entry point with centralized error handling
import { setupCLI } from "./cli";
import { CommandRegistry } from "./commands/commandRegistry";
import { Environment } from "./config/environment";
import { handleError } from "./utils/errors";
import { Logger } from "./utils/logger";

// Add global unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
  Logger.debugString("Unhandled Rejection at:");
  Logger.debugString(String(promise));
  Logger.debugString("Reason:");
  Logger.debugString(String(reason));
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
    const result = await command.run(cliOutput);

    // Check command result and handle errors
    if (!result.success) {
      throw new Error(result.errorMessage || "Command execution failed");
    }

    Logger.debug`Command '${cliOutput.profile}' completed successfully`;
  } catch (error) {
    // Special handling for unknown commands to show help
    if (error instanceof Error && error.message.includes("Unknown command")) {
      handleError(error, () => {
        Logger.generic("");
        CommandRegistry.displayHelp();
      });
    } else {
      // Let the centralized error handler take care of everything else
      handleError(error);
    }
  }
}

// Simplified error handling for uncaught errors
main().catch(handleError);
