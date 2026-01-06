"use strict";
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFile = validateFile;
exports.validateDelimiter = validateDelimiter;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
/**
 * Performs comprehensive validation of a file:
 * - Checks if file exists
 * - Verifies parent directory exists
 * - Confirms file is readable
 * - Ensures file is not empty
 *
 * @param filePath - Path to the file to validate
 * @returns Promise resolving to true if file is valid
 * @throws ComposerError for any validation failures
 */
async function validateFile(filePath) {
    try {
        logger_1.Logger.debug `Validating file: ${filePath}`;
        // Verify file existence
        if (!fs.existsSync(filePath)) {
            logger_1.Logger.debug `File does not exist: ${filePath}`;
            throw errors_1.ErrorFactory.file(`File '${filePath}' does not exist`, filePath, [
                "Check the file path for typos",
                "Ensure the file hasn't been moved or deleted",
                "Verify you're in the correct directory",
                "Use absolute paths if relative paths are problematic",
            ]);
        }
        // Verify parent directory existence
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            // Don't log error here - let the centralized handler do it
            throw errors_1.ErrorFactory.file(`Directory does not exist: ${dirPath}`, dirPath, [
                "Check that the parent directory exists",
                "Ensure the full path is correct",
                "Create the directory if it's missing",
            ]);
        }
        // Check file permissions
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        }
        catch (error) {
            // Don't log error here - let the centralized handler do it
            throw errors_1.ErrorFactory.file(`File '${filePath}' is not readable`, filePath, [
                "Check file permissions (chmod +r on Unix/Linux/Mac)",
                "Ensure the file is not locked by another application",
                "Verify you have read access to the file",
                "Try running with elevated permissions if necessary",
            ]);
        }
        // Verify file has content
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            // Don't log error here - let the centralized handler do it
            throw errors_1.ErrorFactory.file(`File '${filePath}' is empty`, filePath, [
                "Ensure the file contains data",
                "Verify the file was saved properly",
            ]);
        }
        logger_1.Logger.debug `File '${filePath}' is valid and readable`;
        return true;
    }
    catch (error) {
        logger_1.Logger.debug `Error during file validation`;
        logger_1.Logger.debugObject("Error details", error);
        // If it's already a ComposerError, just re-throw it
        if (error instanceof Error && error.name === "ComposerError") {
            throw error;
        }
        // Otherwise, wrap it in a ComposerError
        throw errors_1.ErrorFactory.file("Error validating file", filePath, [
            "Check that the file exists and is accessible",
            "Verify file permissions and format",
            "Ensure the path is correct",
        ]);
    }
}
/**
 * Validates that the CSV delimiter is a single character.
 *
 * @param delimiter - Character to be used as CSV delimiter
 * @returns true if delimiter is valid
 * @throws ComposerError if delimiter is invalid
 */
function validateDelimiter(delimiter) {
    logger_1.Logger.debug `Validating delimiter: '${delimiter}'`;
    if (!delimiter || delimiter.length !== 1) {
        logger_1.Logger.debug `Invalid delimiter: must be a single character`;
        throw errors_1.ErrorFactory.args("Delimiter must be a single character", [
            "Use a single character for the delimiter",
            "Common delimiters: ',' (comma), ';' (semicolon), '\\t' (tab)",
            "Example: --delimiter ','",
            "For tab delimiter use: --delimiter $'\\t'",
        ]);
    }
    logger_1.Logger.debug `Delimiter validation successful`;
    return true;
}
//# sourceMappingURL=fileValidator.js.map