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
exports.LyricUploadCommand = void 0;
// src/commands/lyricUploadCommand.ts - Updated with single file support
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const chalk_1 = __importDefault(require("chalk"));
const errors_1 = require("../utils/errors");
const LyricSubmissionService_1 = require("../services/lyric/LyricSubmissionService");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Command for loading data into Lyric
 * Enhanced to support both single files and directories
 */
class LyricUploadCommand extends baseCommand_1.Command {
    constructor() {
        super("Lyric Data Loading");
    }
    /**
     * Override to indicate this command doesn't require input files from -f/--file
     * It uses data directories or files instead.
     */
    requiresInputFiles() {
        return false;
    }
    /**
     * Executes the Lyric data loading process
     */
    async execute(cliOutput) {
        try {
            // Extract and validate configuration
            const submissionParams = this.extractSubmissionParams(cliOutput);
            const serviceConfig = this.extractServiceConfig(cliOutput);
            // Create service
            const lyricSubmissionService = new LyricSubmissionService_1.LyricSubmissionService(serviceConfig);
            // Check service health with direct error handling
            try {
                logger_1.Logger.debug `Checking Lyric service health at ${serviceConfig.url}`;
                const healthResult = await lyricSubmissionService.checkHealth();
                if (!healthResult.healthy) {
                    throw errors_1.ErrorFactory.connection("Lyric service is not healthy", {
                        healthResult,
                        serviceUrl: serviceConfig.url,
                    }, [
                        "Check that Lyric service is running",
                        `Verify the service URL: ${serviceConfig.url}`,
                        "Check network connectivity",
                        "Review service logs for errors",
                    ]);
                }
                logger_1.Logger.debug `Lyric service health check passed`;
            }
            catch (healthError) {
                // Enhanced error handling for health check failures
                const errorMessage = healthError instanceof Error
                    ? healthError.message
                    : String(healthError);
                if (errorMessage.includes("ECONNREFUSED") ||
                    errorMessage.includes("ENOTFOUND")) {
                    throw errors_1.ErrorFactory.connection("Failed to connect to Lyric service", { originalError: healthError, serviceUrl: serviceConfig.url }, [
                        "Check that Lyric service is running",
                        `Verify the service URL: ${serviceConfig.url}`,
                        "Check network connectivity",
                        "Review firewall settings",
                    ]);
                }
                throw errors_1.ErrorFactory.connection("Lyric service health check failed", { originalError: healthError, serviceUrl: serviceConfig.url }, [
                    "Check Lyric service status and configuration",
                    `Verify the service URL: ${serviceConfig.url}`,
                    "Check network connectivity",
                    "Use --debug for detailed error information",
                ]);
            }
            // Log submission info
            this.logSubmissionInfo(submissionParams, serviceConfig.url);
            // Execute the complete workflow
            const result = await lyricSubmissionService.submitDataWorkflow(submissionParams);
            // Log success
            this.logSuccess(result);
            return {
                success: true,
                details: result,
            };
        }
        catch (error) {
            // Let baseCommand handle all error logging
            return this.handleExecutionError(error);
        }
    }
    /**
     * ENHANCED: Validates command line arguments - now supports both files and directories
     */
    async validate(cliOutput) {
        // First call the parent validate method with our override
        // This skips the file validation since we return false in requiresInputFiles()
        await super.validate(cliOutput);
        // Ensure config exists
        if (!cliOutput.config) {
            throw errors_1.ErrorFactory.args("Configuration is missing", [
                "Check CLI setup and argument parsing",
                "Verify command line options are correct",
            ]);
        }
        // Validate required parameters
        const requiredParams = [
            {
                value: this.getLyricUrl(cliOutput),
                name: "Lyric URL",
                suggestion: "Use --lyric-url option or set LYRIC_URL environment variable",
            },
            {
                value: this.getDataInput(cliOutput),
                name: "Data input (file or directory)",
                suggestion: "Use --data-directory (-d) option to specify a CSV file or directory containing CSV files",
            },
        ];
        for (const param of requiredParams) {
            if (!param.value) {
                throw errors_1.ErrorFactory.args(`${param.name} is required`, [
                    param.suggestion,
                    "Example: -d ./data/diagnosis.csv or -d ./data/csv-files/",
                ]);
            }
        }
        // ENHANCED: Validate data input (file or directory) exists
        const dataInput = this.getDataInput(cliOutput);
        if (!fs.existsSync(dataInput)) {
            throw errors_1.ErrorFactory.file("Data input not found", dataInput, [
                "Check that the file or directory exists",
                "Verify the path is correct",
                "Ensure you have access to the path",
            ]);
        }
        const stats = fs.statSync(dataInput);
        if (stats.isFile()) {
            // Single file validation
            await this.validateSingleFile(dataInput);
        }
        else if (stats.isDirectory()) {
            // Directory validation
            await this.validateDirectory(dataInput);
        }
        else {
            throw errors_1.ErrorFactory.file("Input is not a file or directory", dataInput, [
                "Provide a valid CSV file path or directory containing CSV files",
                "Check that the path points to an existing file or directory",
            ]);
        }
    }
    /**
     * NEW: Validate a single CSV file
     */
    async validateSingleFile(filePath) {
        // Check file extension
        if (!filePath.toLowerCase().endsWith(".csv")) {
            throw errors_1.ErrorFactory.invalidFile("File must have .csv extension", filePath, [
                "Ensure the file has a .csv extension",
                "Only CSV files are supported for Lyric uploads",
                "Example: diagnosis.csv, donor.csv, etc.",
            ]);
        }
        // Check file has content
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            throw errors_1.ErrorFactory.invalidFile("File is empty", filePath, [
                "Ensure the file contains data",
                "Check if the file was created properly",
                "Verify the file wasn't truncated during transfer",
            ]);
        }
        // Check read permissions
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        }
        catch (error) {
            throw errors_1.ErrorFactory.file("Cannot read file", filePath, [
                "Check file permissions",
                "Ensure you have read access to the file",
                "Try running with appropriate privileges",
            ]);
        }
        logger_1.Logger.debug `Single file validation passed: ${path.basename(filePath)} (${Math.round((stats.size / 1024) * 10) / 10} KB)`;
    }
    /**
     * EXISTING: Validate directory contains CSV files
     */
    async validateDirectory(directoryPath) {
        try {
            const files = fs
                .readdirSync(directoryPath)
                .filter((file) => file.toLowerCase().endsWith(".csv"));
            if (files.length === 0) {
                throw errors_1.ErrorFactory.validation("No CSV files found in directory", { directoryPath }, [
                    "Ensure the directory contains CSV files",
                    "Check that files have .csv extension",
                    "Verify files are not empty",
                ]);
            }
            logger_1.Logger.debug `Found ${files.length} CSV files in ${directoryPath}`;
        }
        catch (error) {
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            throw errors_1.ErrorFactory.file("Failed to read directory", directoryPath, [
                "Check directory permissions",
                "Verify you have access to read the directory",
                "Ensure the directory path is correct",
            ]);
        }
    }
    /**
     * Extract submission parameters from CLI output
     */
    extractSubmissionParams(cliOutput) {
        var _a, _b, _c, _d;
        return {
            categoryId: ((_a = cliOutput.config.lyric) === null || _a === void 0 ? void 0 : _a.categoryId) ||
                cliOutput.options.categoryId ||
                process.env.CATEGORY_ID ||
                "1",
            organization: ((_b = cliOutput.config.lyric) === null || _b === void 0 ? void 0 : _b.organization) ||
                cliOutput.options.organization ||
                process.env.ORGANIZATION ||
                "OICR",
            dataDirectory: this.getDataInput(cliOutput),
            maxRetries: parseInt(String(cliOutput.options.maxRetries ||
                ((_c = cliOutput.config.lyric) === null || _c === void 0 ? void 0 : _c.maxRetries) ||
                process.env.MAX_RETRIES ||
                "10")),
            retryDelay: parseInt(String(cliOutput.options.retryDelay ||
                ((_d = cliOutput.config.lyric) === null || _d === void 0 ? void 0 : _d.retryDelay) ||
                process.env.RETRY_DELAY ||
                "20000")),
        };
    }
    /**
     * Extract service configuration from CLI output
     */
    extractServiceConfig(cliOutput) {
        return {
            url: this.getLyricUrl(cliOutput),
            timeout: 30000,
            retries: 1,
        };
    }
    /**
     * Get Lyric URL from various sources
     */
    getLyricUrl(cliOutput) {
        var _a;
        return (cliOutput.options.lyricUrl ||
            ((_a = cliOutput.config.lyric) === null || _a === void 0 ? void 0 : _a.url) ||
            process.env.LYRIC_URL);
    }
    /**
     * ENHANCED: Get data input (file or directory) from various sources
     */
    getDataInput(cliOutput) {
        var _a;
        return (cliOutput.options.dataDirectory ||
            ((_a = cliOutput.config.lyric) === null || _a === void 0 ? void 0 : _a.dataDirectory) ||
            process.env.LYRIC_DATA);
    }
    /**
     * ENHANCED: Log submission information with better file/directory detection
     */
    logSubmissionInfo(params, serviceUrl) {
        const inputType = fs.statSync(params.dataDirectory).isFile()
            ? "file"
            : "directory";
        logger_1.Logger.debug `Uploading from ${inputType}: ${params.dataDirectory}`;
        logger_1.Logger.debug `Lyric URL: ${serviceUrl}`;
        logger_1.Logger.debug `Category ID: ${params.categoryId}`;
        logger_1.Logger.debug `Organization: ${params.organization}`;
        logger_1.Logger.debug `Max Retries: ${params.maxRetries}`;
        logger_1.Logger.debug `Retry Delay: ${params.retryDelay}ms`;
    }
    /**
     * Log successful submission
     */
    logSuccess(result) {
        logger_1.Logger.successString("Data upload complete");
        logger_1.Logger.generic(chalk_1.default.gray(`    - Submission ID: ${result.submissionId}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Status: ${result.status}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Files Submitted: ${result.filesSubmitted.join(", ")}`));
    }
    /**
     * Handle execution errors - DON'T LOG HERE, let baseCommand handle it
     */
    handleExecutionError(error) {
        // Don't log here - let baseCommand handle all logging
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
        // Connection errors
        if (errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("ETIMEDOUT") ||
            errorMessage.includes("ENOTFOUND")) {
            const connectionError = errors_1.ErrorFactory.connection("Failed to connect to Lyric service", { originalError: error }, [
                "Check that Lyric service is running",
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
        // File/directory errors
        if (errorMessage.includes("ENOENT") || errorMessage.includes("directory")) {
            const fileError = errors_1.ErrorFactory.file("Data input or file issue", undefined, [
                "Check that the data file or directory exists",
                "Verify CSV files are present and accessible",
                "Ensure you have read access to the files",
            ]);
            return {
                success: false,
                errorMessage: fileError.message,
                errorCode: fileError.code,
                details: fileError.details,
            };
        }
        // Authentication errors
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
            const authError = errors_1.ErrorFactory.auth("Authentication failed with Lyric service", { originalError: error }, [
                "Check your authentication credentials",
                "Verify you have permission to submit data",
                "Contact administrator for access",
            ]);
            return {
                success: false,
                errorMessage: authError.message,
                errorCode: authError.code,
                details: authError.details,
            };
        }
        // Generic fallback
        const genericError = errors_1.ErrorFactory.connection(`Data loading failed: ${errorMessage}`, { originalError: error }, [
            "Check the service logs for more details",
            "Verify your data format and structure",
            "Try the upload again after a few moments",
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
exports.LyricUploadCommand = LyricUploadCommand;
