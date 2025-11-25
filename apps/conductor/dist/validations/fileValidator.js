"use strict";
/**
 * File Validator
 *
 * Validates file existence, permissions, and basic properties
 * before processing CSV files into Elasticsearch.
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
exports.validateFile = exports.validateFiles = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const constants_1 = require("./constants");
/**
 * Validates that files exist, have proper extensions, and are accessible.
 * Returns a structured result with a validity flag and error messages.
 */
async function validateFiles(filePaths) {
    if (!filePaths || filePaths.length === 0) {
        return { valid: false, errors: ["No input files specified"] };
    }
    const notFoundFiles = [];
    const invalidExtensions = [];
    const missingExtensions = [];
    for (const filePath of filePaths) {
        const extension = path.extname(filePath).toLowerCase();
        if (!extension) {
            missingExtensions.push(filePath);
            continue;
        }
        if (!constants_1.ALLOWED_EXTENSIONS.includes(extension)) {
            invalidExtensions.push(`${filePath} (${extension})`);
            continue;
        }
        if (!fs.existsSync(filePath)) {
            notFoundFiles.push(filePath);
            continue;
        }
    }
    const errors = [];
    if (missingExtensions.length > 0) {
        errors.push(`Missing file extension for: ${missingExtensions.join(", ")}. Allowed extensions: ${constants_1.ALLOWED_EXTENSIONS.join(", ")}`);
    }
    if (invalidExtensions.length > 0) {
        errors.push(`Invalid file extensions: ${invalidExtensions.join(", ")}. Allowed extensions: ${constants_1.ALLOWED_EXTENSIONS.join(", ")}`);
    }
    if (notFoundFiles.length > 0) {
        errors.push(`the following files were not found: ${notFoundFiles.join(", ")}`);
    }
    return { valid: errors.length === 0, errors };
}
exports.validateFiles = validateFiles;
/**
 * Validates a single file with comprehensive checks
 */
async function validateFile(filePath) {
    try {
        logger_1.Logger.debug `Validating file: ${filePath}`;
        // Check file exists
        if (!fs.existsSync(filePath)) {
            throw errors_1.ErrorFactory.file(`File '${filePath}' does not exist`, filePath, [
                "Check the file path for typos",
                "Ensure the file hasn't been moved or deleted",
                "Use absolute paths if relative paths are problematic",
            ]);
        }
        // Check file permissions
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        }
        catch (error) {
            throw errors_1.ErrorFactory.file(`File '${filePath}' is not readable`, filePath, [
                "Check file permissions",
                "Ensure the file is not locked by another application",
                "Try running with elevated permissions if necessary",
            ]);
        }
        // Check file has content
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            throw errors_1.ErrorFactory.file(`File '${filePath}' is empty`, filePath, [
                "Ensure the file contains data",
                "Verify the file was saved properly",
            ]);
        }
        logger_1.Logger.debug `File '${filePath}' is valid and readable`;
        return true;
    }
    catch (error) {
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        throw errors_1.ErrorFactory.file("Error validating file", filePath, [
            "Check that the file exists and is accessible",
            "Verify file permissions and format",
        ]);
    }
}
exports.validateFile = validateFile;
