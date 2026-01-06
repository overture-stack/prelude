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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongUploadSchemaCommand = void 0;
// src/commands/songUploadSchemaCommand.ts
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const chalk_1 = __importDefault(require("chalk"));
const errors_1 = require("../utils/errors");
const song_score_1 = require("../services/song-score");
const fs = __importStar(require("fs"));
/**
 * Command for uploading schemas to the SONG service
 * Refactored to use the new SongService with error factory pattern
 */
class SongUploadSchemaCommand extends baseCommand_1.Command {
    constructor() {
        super("SONG Schema Upload");
    }
    /**
     * Override validation since we don't use filePaths for this command
     */
    async validate(cliOutput) {
        const { options } = cliOutput;
        // Get schema file from various sources
        const schemaFile = this.getSchemaFile(options);
        if (!schemaFile) {
            throw errors_1.ErrorFactory.args("Schema file not specified", [
                "Use --schema-file option to specify the schema file",
                "Set SONG_SCHEMA environment variable",
                "Example: --schema-file ./my-schema.json",
            ]);
        }
        // Validate file exists and is readable
        if (!fs.existsSync(schemaFile)) {
            throw errors_1.ErrorFactory.file("Schema file not found", schemaFile, [
                "Check the file path spelling",
                "Ensure the file exists and is accessible",
                "Verify file permissions",
            ]);
        }
        // Validate it's a JSON file
        if (!schemaFile.toLowerCase().endsWith(".json")) {
            throw errors_1.ErrorFactory.invalidFile("Schema file must be a JSON file", schemaFile, [
                "Ensure the file has a .json extension",
                "Verify the file contains valid JSON content",
            ]);
        }
        // Try to parse the JSON to validate format
        try {
            const content = fs.readFileSync(schemaFile, "utf-8");
            JSON.parse(content);
        }
        catch (error) {
            throw errors_1.ErrorFactory.parsing("Invalid JSON in schema file", { filePath: schemaFile, originalError: error }, [
                "Validate JSON syntax using a JSON validator",
                "Check for trailing commas or syntax errors",
                "Ensure the file is properly formatted JSON",
            ]);
        }
        // Validate SONG URL
        const songUrl = this.getSongUrl(options);
        if (!songUrl) {
            throw errors_1.ErrorFactory.args("SONG URL not specified", [
                "Use --song-url option to specify SONG server URL",
                "Set SONG_URL environment variable",
                "Example: --song-url http://localhost:8080",
            ]);
        }
    }
    /**
     * Executes the SONG schema upload process
     */
    async execute(cliOutput) {
        const { options } = cliOutput;
        try {
            // Extract configuration
            const schemaFile = this.getSchemaFile(options);
            const serviceConfig = this.extractServiceConfig(options);
            const uploadParams = this.extractUploadParams(schemaFile);
            // Create service instance
            const songService = new song_score_1.SongService(serviceConfig);
            // Check service health
            const healthResult = await songService.checkHealth();
            if (!healthResult.healthy) {
                throw errors_1.ErrorFactory.connection("SONG service is not healthy", {
                    healthResult,
                    serviceUrl: serviceConfig.url,
                }, [
                    "Check that SONG service is running",
                    `Verify the service URL: ${serviceConfig.url}`,
                    "Check network connectivity",
                    "Review service logs for errors",
                ]);
            }
            // Log upload info
            this.logUploadInfo(schemaFile, serviceConfig.url);
            // Upload schema
            const result = await songService.uploadSchema(uploadParams);
            // Log success
            this.logSuccess(result);
            return {
                success: true,
                details: result,
            };
        }
        catch (error) {
            return this.handleExecutionError(error);
        }
    }
    /**
     * Get schema file from various sources
     */
    getSchemaFile(options) {
        return options.schemaFile || process.env.SONG_SCHEMA;
    }
    /**
     * Get SONG URL from various sources
     */
    getSongUrl(options) {
        return options.songUrl || process.env.SONG_URL;
    }
    /**
     * Extract service configuration from options
     */
    extractServiceConfig(options) {
        return {
            url: this.getSongUrl(options),
            timeout: 10000,
            retries: 1,
            authToken: options.authToken || process.env.AUTH_TOKEN || "123",
        };
    }
    /**
     * Extract upload parameters from schema file
     */
    extractUploadParams(schemaFile) {
        try {
            logger_1.Logger.debug `Reading schema file: ${schemaFile}`;
            const schemaContent = fs.readFileSync(schemaFile, "utf-8");
            return {
                schemaContent,
            };
        }
        catch (error) {
            throw errors_1.ErrorFactory.file("Error reading schema file", schemaFile, [
                "Check file permissions",
                "Verify the file is not corrupted",
                "Ensure sufficient disk space",
            ]);
        }
    }
    /**
     * Log upload information
     */
    logUploadInfo(schemaFile, serviceUrl) {
        logger_1.Logger.debug `Uploading Schema to Song:`;
        logger_1.Logger.debug `URL: ${serviceUrl}/schemas`;
        logger_1.Logger.debug `Schema File: ${schemaFile}`;
    }
    /**
     * Log successful upload
     */
    logSuccess(result) {
        logger_1.Logger.successString("Schema uploaded successfully");
        logger_1.Logger.generic(chalk_1.default.gray(`    - Schema ID: ${result.id || "N/A"}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Schema Name: ${result.name || "Unnamed"}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Schema Version: ${result.version || "N/A"}`));
    }
    /**
     * Handle execution errors with helpful user feedback
     */
    handleExecutionError(error) {
        if (error instanceof Error && error.name === "ConductorError") {
            const conductorError = error;
            return {
                success: false,
                errorMessage: conductorError.message,
                errorCode: conductorError.code,
                details: conductorError.details,
            };
        }
        // Handle unexpected errors with categorization
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("ETIMEDOUT")) {
            const connectionError = errors_1.ErrorFactory.connection("Failed to connect to SONG service", { originalError: error }, [
                "Check that SONG service is running",
                "Verify the service URL and port",
                "Check network connectivity",
                "Review firewall settings",
            ]);
            return {
                success: false,
                errorMessage: connectionError.message,
                errorCode: connectionError.code,
                details: connectionError.details,
            };
        }
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
            const authError = errors_1.ErrorFactory.auth("Authentication failed with SONG service", { originalError: error }, [
                "Check authentication credentials",
                "Verify API token is valid",
                "Contact administrator for access",
            ]);
            return {
                success: false,
                errorMessage: authError.message,
                errorCode: authError.code,
                details: authError.details,
            };
        }
        if (errorMessage.includes("400") || errorMessage.includes("validation")) {
            const validationError = errors_1.ErrorFactory.validation("Schema validation failed", { originalError: error }, [
                "Check schema format and structure",
                "Ensure required fields are present",
                "Verify schema follows SONG requirements",
            ]);
            return {
                success: false,
                errorMessage: validationError.message,
                errorCode: validationError.code,
                details: validationError.details,
            };
        }
        if (errorMessage.includes("409") || errorMessage.includes("conflict")) {
            const conflictError = errors_1.ErrorFactory.validation("Schema already exists", { originalError: error }, [
                "Schema with this name may already exist",
                "Update the schema version or name",
                "Use force flag if available to overwrite",
            ]);
            return {
                success: false,
                errorMessage: conflictError.message,
                errorCode: conflictError.code,
                details: conflictError.details,
            };
        }
        // Generic fallback
        const genericError = errors_1.ErrorFactory.connection("Schema upload failed", { originalError: error }, [
            "Check SONG service availability",
            "Verify schema file format and content",
            "Use --debug for detailed error information",
        ]);
        return {
            success: false,
            errorMessage: genericError.message,
            errorCode: genericError.code,
            details: genericError.details,
        };
    }
}
exports.SongUploadSchemaCommand = SongUploadSchemaCommand;
