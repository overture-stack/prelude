#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("./cli");
const commandRegistry_1 = require("./commands/commandRegistry");
const environment_1 = require("./config/environment");
const errors_1 = require("./utils/errors");
const logger_1 = require("./utils/logger");
// Add global unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
    logger_1.Logger.debugString("Unhandled Rejection at:");
    logger_1.Logger.debugString(String(promise));
    logger_1.Logger.debugString("Reason:");
    logger_1.Logger.debugString(String(reason));
});
async function main() {
    try {
        // Initialize environment and logging
        if (environment_1.Environment.isDebug) {
            logger_1.Logger.enableDebug();
        }
        // Setup CLI and get parsed arguments
        const cliOutput = await (0, cli_1.setupCLI)();
        logger_1.Logger.initialize();
        logger_1.Logger.debugString(`Profile: ${cliOutput.profile}`);
        // Use the simplified command registry
        const command = commandRegistry_1.CommandRegistry.createCommand(cliOutput.profile);
        logger_1.Logger.debug `Running command`;
        // Execute the command
        // FIXED: baseCommand.run() handles ALL error logging
        // Don't add additional error handling here
        const result = await command.run(cliOutput);
        // Check command result - if failed, just exit
        // baseCommand.run() already logged the error
        if (!result.success) {
            process.exit(1);
        }
        logger_1.Logger.debug `Command '${cliOutput.profile}' completed successfully`;
    }
    catch (error) {
        // Special handling ONLY for unknown commands and CLI setup errors
        if (error instanceof Error && error.message.includes("Unknown command")) {
            (0, errors_1.handleError)(error, () => {
                logger_1.Logger.generic("");
                commandRegistry_1.CommandRegistry.displayHelp();
            });
        }
        else {
            // Let the centralized error handler take care of CLI setup errors
            (0, errors_1.handleError)(error);
        }
    }
}
// Simplified error handling for uncaught errors
main().catch(errors_1.handleError);
