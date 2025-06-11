#!/usr/bin/env node

// src/main.ts - Simplified main entry point with ErrorFactory
import { setupCLI } from "./cli";
import { CommandRegistry } from "./commands/commandRegistry";
import { Environment } from "./config/environment";
import { ErrorFactory, ErrorCodes, handleError } from "./utils/errors";
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
    Logger.info`Version: 1.0.0`;
    Logger.generic(" ");

    // Setup CLI and get parsed arguments
    const cliOutput = await setupCLI();

    Logger.info`Profile: ${cliOutput.profile}`;
    Logger.generic(" ");
    Logger.initialize();

    Logger.debugString("Starting CLI setup");
    Logger.debugString("Creating command instance");

    // Use the simplified command registry
    const command = CommandRegistry.createCommand(cliOutput.profile);

    Logger.debugString("Running command");

    // Execute the command
    const result = await command.run(cliOutput);

    // Check command result and handle errors
    if (!result.success) {
      throw ErrorFactory.validation(
        result.errorMessage || "Command execution failed",
        {
          errorCode: result.errorCode || ErrorCodes.UNKNOWN_ERROR,
          details: result.details,
          command: cliOutput.profile,
        },
        [
          "Check command parameters and configuration",
          "Verify all required services are running",
          "Use --debug flag for detailed error information",
          "Review command documentation for proper usage",
        ]
      );
    }

    Logger.success`Command '${cliOutput.profile}' completed successfully`;
  } catch (error) {
    // Enhanced error handling with helpful context
    if (Environment.isDebug) {
      console.error("FATAL ERROR:", error);
    }

    // Special handling for unknown commands
    if (error instanceof Error && error.message.includes("Unknown command")) {
      const availableCommands = CommandRegistry.getCommandNames().join(", ");

      const commandError = ErrorFactory.args(error.message, undefined, [
        `Available commands: ${availableCommands}`,
        "Use 'conductor --help' for command documentation",
        "Check command spelling and syntax",
        "Run 'conductor <command> --help' for command-specific options",
      ]);

      handleError(commandError, () => CommandRegistry.displayHelp());
      return;
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
    const systemError = ErrorFactory.validation(
      "Command execution failed unexpectedly",
      { originalError: error },
      [
        "Use --debug flag for detailed error information",
        "Check system requirements and dependencies",
        "Verify all services are properly configured",
        "Contact support if the issue persists",
      ]
    );

    handleError(systemError, () => CommandRegistry.displayHelp());
  } else {
    handleError(error);
  }
});
