"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFactory = exports.ErrorCodes = exports.ComposerError = void 0;
exports.handleError = handleError;
// src/utils/errors.ts - Updated to use tips for suggestions
const logger_1 = require("./logger");
class ComposerError extends Error {
    constructor(message, code, details, suggestions) {
        super(message);
        this.code = code;
        this.details = details;
        this.suggestions = suggestions;
        this.name = "ComposerError";
    }
    toString() {
        return `${this.message}${this.details ? `\nDetails: ${JSON.stringify(this.details, null, 2)}` : ""}`;
    }
}
exports.ComposerError = ComposerError;
exports.ErrorCodes = {
    INVALID_ARGS: "INVALID_ARGS",
    FILE_NOT_FOUND: "FILE_NOT_FOUND",
    INVALID_FILE: "INVALID_FILE",
    VALIDATION_FAILED: "VALIDATION_FAILED",
    ENV_ERROR: "ENV_ERROR",
    GENERATION_FAILED: "GENERATION_FAILED",
    PARSING_ERROR: "PARSING_ERROR",
    FILE_ERROR: "FILE_ERROR",
    FILE_WRITE_ERROR: "FILE_WRITE_ERROR",
};
// Error factory methods for common error types
class ErrorFactory {
    static validation(message, details, suggestions) {
        return new ComposerError(message, exports.ErrorCodes.VALIDATION_FAILED, details, suggestions);
    }
    static file(message, filePath, suggestions) {
        return new ComposerError(message, exports.ErrorCodes.INVALID_FILE, { filePath }, suggestions);
    }
    static args(message, suggestions) {
        return new ComposerError(message, exports.ErrorCodes.INVALID_ARGS, undefined, suggestions);
    }
    static generation(message, details, suggestions) {
        return new ComposerError(message, exports.ErrorCodes.GENERATION_FAILED, details, suggestions);
    }
    static environment(message, details, suggestions) {
        return new ComposerError(message, exports.ErrorCodes.ENV_ERROR, details, suggestions);
    }
    static parsing(message, details, suggestions) {
        return new ComposerError(message, exports.ErrorCodes.PARSING_ERROR, details, suggestions);
    }
}
exports.ErrorFactory = ErrorFactory;
function formatErrorDetails(details) {
    if (typeof details === "string") {
        return details;
    }
    if (details instanceof Error) {
        return details.message;
    }
    try {
        return JSON.stringify(details, null, 2);
    }
    catch {
        return String(details);
    }
}
/**
 * Centralized error handler for the application
 * @param error - The error to handle
 * @param showHelp - Optional callback to show help information
 */
function handleError(error, showHelp) {
    if (error instanceof ComposerError) {
        logger_1.Logger.error `[${error.code}] ${error.message}`;
        // Show suggestions using tip logging instead of info
        if (error.suggestions && error.suggestions.length > 0) {
            logger_1.Logger.section("\nSuggestions\n");
            error.suggestions.forEach((suggestion) => {
                logger_1.Logger.tipString(suggestion);
            });
        }
        // Show help if callback provided
        if (showHelp) {
            showHelp();
        }
        // Show details in debug mode
        if (error.details) {
            const formattedDetails = formatErrorDetails(error.details);
            logger_1.Logger.debugString("Error details:");
            logger_1.Logger.debugString(formattedDetails);
        }
        // Show stack trace in debug mode
        logger_1.Logger.debugString("Stack trace:");
        logger_1.Logger.debugString(error.stack || "No stack trace available");
    }
    else {
        logger_1.Logger.errorString("Unexpected error occurred");
        if (error instanceof Error) {
            logger_1.Logger.errorString(error.message);
            logger_1.Logger.debugString("Stack trace:");
            logger_1.Logger.debugString(error.stack || "No stack trace available");
        }
        else {
            logger_1.Logger.errorString(String(error));
        }
    }
    process.exit(1);
}
//# sourceMappingURL=errors.js.map