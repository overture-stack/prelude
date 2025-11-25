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
exports.LecternUploadCommand = void 0;
// src/commands/lecternUploadCommand.ts - Complete fix with direct connection testing
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const chalk_1 = __importDefault(require("chalk"));
const errors_1 = require("../utils/errors");
const lectern_1 = require("../services/lectern");
const serviceConfigManager_1 = require("../config/serviceConfigManager");
const fs = __importStar(require("fs"));
/**
 * Command for uploading schemas to the Lectern service
 */
class LecternUploadCommand extends baseCommand_1.Command {
    constructor() {
        super("Lectern Schema Upload");
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
                "Set LECTERN_SCHEMA environment variable",
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
    }
    /**
     * Executes the Lectern schema upload process
     */
    async execute(cliOutput) {
        const { options } = cliOutput;
        try {
            // Extract configuration
            const schemaFile = this.getSchemaFile(options);
            // Use the ServiceConfigManager
            const serviceConfig = serviceConfigManager_1.ServiceConfigManager.createLecternConfig({
                url: options.lecternUrl,
                authToken: options.authToken,
            });
            // Validate the configuration
            serviceConfigManager_1.ServiceConfigManager.validateConfig(serviceConfig);
            const uploadParams = this.extractUploadParams(schemaFile);
            // Create service instance
            const lecternService = new lectern_1.LecternService(serviceConfig);
            // DIRECT CONNECTION TEST - bypass the generic checkHealth() method
            // This way we can catch and handle the specific connection error
            try {
                logger_1.Logger.debug `Testing connection to Lectern service`;
                // Try to make a direct HTTP request to test connectivity
                const testResponse = await lecternService["http"].get("/health", {
                    timeout: 5000,
                    retries: 1,
                });
                logger_1.Logger.debug `Lectern service is healthy`;
            }
            catch (healthError) {
                // Handle the specific connection error with detailed suggestions
                const errorMessage = healthError instanceof Error
                    ? healthError.message
                    : String(healthError);
                logger_1.Logger.debug `Lectern health check failed`;
                if (errorMessage.includes("ECONNREFUSED") ||
                    errorMessage.includes("connect ECONNREFUSED")) {
                    throw errors_1.ErrorFactory.connection("Cannot connect to Lectern service", {
                        serviceUrl: serviceConfig.url,
                        endpoint: serviceConfig.url + "/health",
                        originalError: healthError,
                    }, [
                        `Check that Lectern service is running on ${serviceConfig.url}`,
                        "Verify the service URL and port number are correct",
                        "Ensure the service is accessible from your network",
                        "Test manually with: curl " + serviceConfig.url + "/health",
                        "Check firewall settings and network connectivity",
                    ]);
                }
                if (errorMessage.includes("ENOTFOUND") ||
                    errorMessage.includes("getaddrinfo ENOTFOUND")) {
                    throw errors_1.ErrorFactory.connection("Lectern service host not found", {
                        serviceUrl: serviceConfig.url,
                        originalError: healthError,
                    }, [
                        "Check the hostname in the service URL",
                        "Verify DNS resolution for the hostname",
                        "Ensure the service URL is spelled correctly",
                        "Try using an IP address instead of hostname",
                        "Check your network connection",
                    ]);
                }
                if (errorMessage.includes("ETIMEDOUT")) {
                    throw errors_1.ErrorFactory.connection("Timeout connecting to Lectern service", {
                        serviceUrl: serviceConfig.url,
                        timeout: 5000,
                        originalError: healthError,
                    }, [
                        "Check network connectivity to the service",
                        "Verify the service is responding (may be overloaded)",
                        "Consider increasing timeout value",
                        "Check for network proxy or firewall blocking",
                        "Verify the service port is accessible",
                    ]);
                }
                if (errorMessage.includes("401") || errorMessage.includes("403")) {
                    throw errors_1.ErrorFactory.auth("Authentication failed with Lectern service", {
                        serviceUrl: serviceConfig.url,
                        originalError: healthError,
                    }, [
                        "Check your authentication token",
                        "Verify you have permission to access the service",
                        "Contact your administrator for proper credentials",
                        "Ensure the auth token is not expired",
                    ]);
                }
                // Generic health check failure with helpful suggestions
                throw errors_1.ErrorFactory.connection("Failed to connect to Lectern service", {
                    serviceUrl: serviceConfig.url,
                    originalError: healthError,
                }, [
                    `Verify Lectern service is running and accessible at ${serviceConfig.url}`,
                    "Check the service URL spelling and port number",
                    "Test connectivity manually: curl " + serviceConfig.url + "/health",
                    "Review service logs for error details",
                    "Check network connectivity and firewall settings",
                ]);
            }
            // Log upload info
            this.logUploadInfo(schemaFile, serviceConfig.url);
            // Upload schema
            const result = await lecternService.uploadSchema(uploadParams);
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
        return options.schemaFile || process.env.LECTERN_SCHEMA;
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
        logger_1.Logger.debug `Uploading Schema to Lectern:`;
        logger_1.Logger.debug `URL: ${serviceUrl}/dictionaries`;
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
     * Handle execution errors - should preserve ConductorError suggestions
     */
    handleExecutionError(error) {
        // If it's already a ConductorError, preserve it completely
        // The base Command.run() method will handle displaying the suggestions
        if (error instanceof Error && error.name === "ConductorError") {
            const conductorError = error;
            // Log the error here to ensure it gets displayed
            logger_1.Logger.errorString(conductorError.message);
            // Display suggestions immediately since they might not make it through the chain
            if (conductorError.suggestions && conductorError.suggestions.length > 0) {
                logger_1.Logger.suggestion("Suggestions");
                conductorError.suggestions.forEach((suggestion) => {
                    logger_1.Logger.tipString(suggestion);
                });
            }
            return {
                success: false,
                errorMessage: conductorError.message,
                errorCode: conductorError.code,
                details: conductorError.details,
            };
        }
        // For any other unexpected errors, wrap them with helpful suggestions
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.Logger.errorString(`Unexpected error: ${errorMessage}`);
        const suggestions = [
            "Check that Lectern service is running and accessible",
            "Verify your schema file format and content",
            "Use --debug for detailed error information",
            "Try the upload again after a few moments",
        ];
        // Display suggestions immediately
        logger_1.Logger.suggestion("Suggestions");
        suggestions.forEach((suggestion) => {
            logger_1.Logger.tipString(suggestion);
        });
        const genericError = errors_1.ErrorFactory.connection("Schema upload failed", { originalError: error }, suggestions);
        return {
            success: false,
            errorMessage: genericError.message,
            errorCode: genericError.code,
            details: genericError.details,
        };
    }
}
exports.LecternUploadCommand = LecternUploadCommand;
