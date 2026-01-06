"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationError = exports.handleError = exports.ErrorFactory = exports.ErrorCodes = exports.ConductorError = void 0;
// src/utils/errors.ts - Updated with error factory pattern
const logger_1 = require("./logger");
class ConductorError extends Error {
    constructor(message, code, details, suggestions) {
        super(message);
        this.code = code;
        this.details = details;
        this.suggestions = suggestions;
        this.isLogged = false; // Add this property to track if error was already logged
        this.name = "ConductorError";
    }
    toString() {
        return `${this.message}${this.details ? `\nDetails: ${JSON.stringify(this.details, null, 2)}` : ""}`;
    }
}
exports.ConductorError = ConductorError;
exports.ErrorCodes = {
    INVALID_ARGS: "INVALID_ARGS",
    FILE_NOT_FOUND: "FILE_NOT_FOUND",
    INVALID_FILE: "INVALID_FILE",
    VALIDATION_FAILED: "VALIDATION_FAILED",
    ENV_ERROR: "ENV_ERROR",
    PARSING_ERROR: "PARSING_ERROR",
    FILE_ERROR: "FILE_ERROR",
    FILE_WRITE_ERROR: "FILE_WRITE_ERROR",
    CONNECTION_ERROR: "CONNECTION_ERROR",
    AUTH_ERROR: "AUTH_ERROR",
    INDEX_NOT_FOUND: "INDEX_NOT_FOUND",
    TRANSFORM_ERROR: "TRANSFORM_ERROR",
    CLI_ERROR: "CLI_ERROR",
    CSV_ERROR: "CSV_ERROR",
    ES_ERROR: "ES_ERROR",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
    USER_CANCELLED: "USER_CANCELLED",
};
// Error factory methods for common error types
class ErrorFactory {
    static validation(message, details, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.VALIDATION_FAILED, details, suggestions);
    }
    static file(message, filePath, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.FILE_NOT_FOUND, { filePath }, suggestions);
    }
    static invalidFile(message, filePath, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.INVALID_FILE, { filePath }, suggestions);
    }
    static args(message, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.INVALID_ARGS, undefined, suggestions);
    }
    static connection(message, details, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.CONNECTION_ERROR, details, suggestions);
    }
    static environment(message, details, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.ENV_ERROR, details, suggestions);
    }
    static parsing(message, details, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.PARSING_ERROR, details, suggestions);
    }
    static csv(message, details, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.CSV_ERROR, details, suggestions);
    }
    static elasticsearch(message, details, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.ES_ERROR, details, suggestions);
    }
    static auth(message, details, suggestions) {
        return new ConductorError(message, exports.ErrorCodes.AUTH_ERROR, details, suggestions);
    }
    static indexNotFound(indexName, suggestions) {
        return new ConductorError(`Index '${indexName}' not found`, exports.ErrorCodes.INDEX_NOT_FOUND, { indexName }, suggestions || [
            "Create the index first or use a different index name",
            "Check your index name spelling and permissions",
        ]);
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
    catch (_a) {
        return String(details);
    }
}
/**
 * Centralized error handler for the application
 * @param error - The error to handle
 * @param showHelp - Optional callback to show help information
 */
function handleError(error, showHelp) {
    if (error instanceof ConductorError) {
        logger_1.Logger.errorString(`[${error.code}] ${error.message}`);
        // Show suggestions using tip logging
        if (error.suggestions && error.suggestions.length > 0) {
            logger_1.Logger.suggestion("Suggestions");
            error.suggestions.forEach((suggestion) => {
                logger_1.Logger.tipString(suggestion);
            });
        }
        // Show help if callback provided
        if (showHelp) {
            showHelp();
        }
        // Show details in debug mode only
        if (process.argv.includes("--debug")) {
            if (error.details) {
                logger_1.Logger.generic("");
                logger_1.Logger.debugString("Details: " + formatErrorDetails(error.details));
            }
            logger_1.Logger.generic("");
            logger_1.Logger.debugString("Stack Trace " + error.stack || "No stack trace available");
        }
    }
    else {
        logger_1.Logger.errorString(`${error instanceof Error ? error.message : String(error)}`);
        if (process.argv.includes("--debug") && error instanceof Error) {
            logger_1.Logger.debugString(error.stack || "No stack trace available");
        }
    }
    process.exit(1);
}
exports.handleError = handleError;
// Keep the legacy function for backward compatibility during transition
function createValidationError(message, details) {
    return ErrorFactory.validation(message, details);
}
exports.createValidationError = createValidationError;
