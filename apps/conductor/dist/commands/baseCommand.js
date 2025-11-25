"use strict";
/**
 * Command Module
 *
 * Provides the base abstract class and interfaces for all command implementations.
 * Commands follow the Command Pattern for encapsulating operations.
 * FIXED: Centralized error logging - only log here, nowhere else
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const fs = __importStar(require("fs"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
/**
 * Abstract base class for all CLI commands in the conductor service.
 * Provides common functionality for command execution, validation, and error handling.
 */
class Command {
    /**
     * Creates a new Command instance.
     *
     * @param name - Name of the command for logging and identification
     */
    constructor(name) {
        this.name = name;
    }
    /**
     * Main method to run the command with the provided CLI arguments.
     * FIXED: Single point of error logging - only log errors here
     *
     * @param cliOutput - The parsed command line arguments
     * @returns A promise that resolves to a CommandResult object
     */
    async run(cliOutput) {
        var _a;
        const startTime = Date.now();
        try {
            // Enable debug logging if requested
            if (cliOutput.debug) {
                logger_1.Logger.enableDebug();
                logger_1.Logger.debug `Running ${this.name} command with debug enabled`;
            }
            // Validate input arguments
            try {
                await this.validate(cliOutput);
            }
            catch (validationError) {
                logger_1.Logger.debug `Validation error: ${validationError}`;
                if (validationError instanceof Error) {
                    throw validationError;
                }
                throw errors_1.ErrorFactory.validation(String(validationError), undefined, [
                    "Check your command line arguments",
                    "Use --help for usage information",
                ]);
            }
            logger_1.Logger.debug `Starting execution of ${this.name} command`;
            // Execute the specific command implementation
            const result = await this.execute(cliOutput);
            // Calculate and log execution time
            const endTime = Date.now();
            const executionTime = (endTime - startTime) / 1000;
            if (result.success) {
                logger_1.Logger.debug `${this.name} command completed successfully in ${executionTime.toFixed(2)}s`;
            }
            else {
                logger_1.Logger.debug `${this.name} command failed after ${executionTime.toFixed(2)}s: ${result.errorMessage || "Unknown error"}`;
            }
            return result;
        }
        catch (error) {
            logger_1.Logger.debug `ERROR IN ${this.name} COMMAND: ${error}`;
            // CENTRALIZED ERROR LOGGING - SINGLE POINT OF CONTROL
            if (error instanceof errors_1.ConductorError) {
                // Only log if not already logged
                if (!error.isLogged) {
                    logger_1.Logger.errorString(error.message);
                    // Display suggestions if available
                    if (error.suggestions && error.suggestions.length > 0) {
                        logger_1.Logger.suggestion("Suggestions");
                        error.suggestions.forEach((suggestion) => {
                            logger_1.Logger.tipString(suggestion);
                        });
                    }
                    error.isLogged = true; // Mark as logged
                }
                // Display additional details in debug mode
                if (cliOutput.debug && error.details) {
                    logger_1.Logger.debug `Error details: ${JSON.stringify(error.details, null, 2)}`;
                }
                return {
                    success: false,
                    errorMessage: error.message,
                    errorCode: error.code,
                    details: error.details,
                };
            }
            // For unexpected errors, improve error details and visibility
            const errorMessage = error instanceof Error ? error.message : String(error);
            // ALWAYS ensure the error is visible to the user
            logger_1.Logger.errorString(`Command execution failed: ${errorMessage}`);
            const wrappedError = errors_1.ErrorFactory.args(`Command execution failed: ${errorMessage}`, [
                "Check the command arguments",
                "Use --debug for more detailed error information",
                "Verify input files and permissions",
            ]);
            // Log the suggestions once - don't duplicate
            logger_1.Logger.suggestion("Suggestions");
            (_a = wrappedError.suggestions) === null || _a === void 0 ? void 0 : _a.forEach((suggestion) => {
                logger_1.Logger.tipString(suggestion);
            });
            // In debug mode, show stack trace
            if (cliOutput.debug && error instanceof Error && error.stack) {
                logger_1.Logger.debug `Stack trace: ${error.stack}`;
            }
            return {
                success: false,
                errorMessage: wrappedError.message,
                errorCode: wrappedError.code,
                details: {
                    originalError: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
            };
        }
    }
    /**
     * Validates command line arguments.
     * This base implementation checks for required input files.
     * Derived classes should override to add additional validation.
     *
     * @param cliOutput - The parsed command line arguments
     * @throws ConductorError if validation fails
     */
    async validate(cliOutput) {
        var _a, _b;
        // Only validate file paths if the command requires them
        // This allows commands to operate without files if needed
        if (!((_a = cliOutput.filePaths) === null || _a === void 0 ? void 0 : _a.length) && this.requiresInputFiles()) {
            throw errors_1.ErrorFactory.args("No input files provided", [
                "Use -f or --file to specify input files",
                "Example: -f data.csv metadata.csv",
                "Check that file paths are correct",
            ]);
        }
        // Validate each input file exists if file paths are provided
        if ((_b = cliOutput.filePaths) === null || _b === void 0 ? void 0 : _b.length) {
            for (const filePath of cliOutput.filePaths) {
                if (!fs.existsSync(filePath)) {
                    throw errors_1.ErrorFactory.file("Input file not found", filePath, [
                        "Check the file path spelling",
                        "Ensure the file exists in the specified location",
                        "Verify you have access to the file",
                    ]);
                }
                // Check if file is readable
                try {
                    fs.accessSync(filePath, fs.constants.R_OK);
                }
                catch (error) {
                    throw errors_1.ErrorFactory.file("File is not readable", filePath, [
                        "Check file permissions",
                        "Ensure you have read access to the file",
                        "Try running with appropriate privileges",
                    ]);
                }
                // Check if file has content
                const stats = fs.statSync(filePath);
                if (stats.size === 0) {
                    throw errors_1.ErrorFactory.invalidFile("File is empty", filePath, [
                        "Ensure the file contains data",
                        "Check if the file was created properly",
                        "Verify the file wasn't truncated during transfer",
                    ]);
                }
            }
        }
    }
    /**
     * Override this method in derived classes that don't require input files
     * Default is true for backward compatibility
     */
    requiresInputFiles() {
        return true;
    }
    /**
     * Helper method to create a directory if it doesn't exist.
     * Available for commands that need to create output directories.
     */
    createDirectoryIfNotExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath, { recursive: true });
                logger_1.Logger.info `Created directory: ${dirPath}`;
            }
            catch (error) {
                throw errors_1.ErrorFactory.file("Failed to create directory", dirPath, [
                    "Check directory permissions",
                    "Ensure parent directories exist",
                    "Verify sufficient disk space",
                ]);
            }
        }
    }
    /**
     * Helper method to log generated files.
     * Available for commands that generate output files.
     */
    logGeneratedFile(filePath) {
        logger_1.Logger.success `Generated file: ${filePath}`;
    }
}
exports.Command = Command;
