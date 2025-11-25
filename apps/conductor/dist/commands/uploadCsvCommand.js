"use strict";
/**
 * Upload Command
 *
 * Command implementation for uploading CSV data to Elasticsearch.
 * Simplified to remove unnecessary output file handling.
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
exports.UploadCommand = void 0;
const elasticsearchValidator_1 = require("../validations/elasticsearchValidator");
const utils_1 = require("../validations/utils");
const csvValidator_1 = require("../validations/csvValidator");
const fileValidator_1 = require("../validations/fileValidator");
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const elasticsearch_1 = require("../services/elasticsearch");
const csvProcessor_1 = require("../services/csvProcessor");
const csvParser_1 = require("../services/csvProcessor/csvParser");
const fs = __importStar(require("fs"));
class UploadCommand extends baseCommand_1.Command {
    /**
     * Creates a new UploadCommand instance.
     */
    constructor() {
        super("upload");
    }
    /**
     * Executes the upload process for all specified files
     * @param cliOutput The CLI configuration and inputs
     * @returns Promise<CommandResult> with success/failure information
     */
    async execute(cliOutput) {
        const { config, filePaths } = cliOutput;
        logger_1.Logger.debug `Input files specified: ${filePaths.length}`;
        logger_1.Logger.debug `Files: ${filePaths.join(", ")}`;
        // Process each file
        let successCount = 0;
        let failureCount = 0;
        const failureDetails = {};
        for (const filePath of filePaths) {
            logger_1.Logger.generic("");
            logger_1.Logger.info `Processing File: ${filePath}`;
            try {
                await this.processFile(filePath, config);
                logger_1.Logger.debug `Successfully processed ${filePath}`;
                successCount++;
            }
            catch (error) {
                failureCount++;
                // Handle ConductorErrors - log them with suggestions here
                if (error instanceof Error && error.name === "ConductorError") {
                    const conductorError = error;
                    // Log the error and suggestions at the file processing level
                    logger_1.Logger.errorString(`${conductorError.message}`);
                    // Show suggestions if available
                    if (conductorError.suggestions &&
                        conductorError.suggestions.length > 0) {
                        logger_1.Logger.suggestion("Suggestions");
                        conductorError.suggestions.forEach((suggestion) => {
                            logger_1.Logger.tipString(suggestion);
                        });
                    }
                    logger_1.Logger.debug `Skipping file '${filePath}': [${conductorError.code}] ${conductorError.message}`;
                    failureDetails[filePath] = {
                        code: conductorError.code,
                        message: conductorError.message,
                        details: conductorError.details,
                    };
                }
                else if (error instanceof Error) {
                    // Only log non-ConductorError errors
                    logger_1.Logger.errorString(`${error.message}`);
                    logger_1.Logger.debug `Skipping file '${filePath}': ${error.message}`;
                    failureDetails[filePath] = {
                        message: error.message,
                    };
                }
                else {
                    logger_1.Logger.errorString("An unknown error occurred");
                    logger_1.Logger.debug `Skipping file '${filePath}' due to an error`;
                    failureDetails[filePath] = {
                        message: "Unknown error",
                    };
                }
            }
        }
        // Return the CommandResult
        if (failureCount === 0) {
            logger_1.Logger.debug `Successfully processed all ${successCount} files`;
            return {
                success: true,
                details: {
                    filesProcessed: successCount,
                },
            };
        }
        else if (successCount === 0) {
            // Don't create a new error, just return the failure result
            // The original error with suggestions has already been logged
            return {
                success: false,
                errorCode: "PROCESSING_FAILED",
                details: failureDetails,
            };
        }
        else {
            // Partial success
            logger_1.Logger.warnString(`Processed ${successCount} files successfully, ${failureCount} failed`);
            return {
                success: true,
                details: {
                    filesProcessed: successCount,
                    filesFailed: failureCount,
                    failureDetails,
                },
            };
        }
    }
    /**
     * Validates command line arguments and configuration
     * Updated to remove index validation (moved to processFile)
     * @param cliOutput The CLI configuration and inputs
     * @throws ConductorError if validation fails
     */
    async validate(cliOutput) {
        const { config, filePaths } = cliOutput;
        // Validate files first
        const fileValidationResult = await (0, fileValidator_1.validateFiles)(filePaths);
        if (!fileValidationResult.valid) {
            // Create a more detailed error message
            const errorDetails = fileValidationResult.errors.join("; ");
            throw errors_1.ErrorFactory.invalidFile(`File validation failed ${errorDetails}`, undefined, fileValidationResult.errors.concat([
                "Check file extensions (.csv, .tsv allowed)",
                "Verify files exist and are accessible",
                "Ensure files are not empty",
            ]));
        }
        // Validate delimiter
        try {
            (0, utils_1.validateDelimiter)(config.delimiter);
        }
        catch (error) {
            throw errors_1.ErrorFactory.validation("Invalid delimiter specified", { delimiter: config.delimiter, error }, [
                "Delimiter must be a single character",
                "Common delimiters: , (comma), ; (semicolon), \\t (tab)",
                "Use --delimiter option to specify delimiter",
            ]);
        }
        // Validate batch size
        try {
            (0, elasticsearchValidator_1.validateBatchSize)(config.batchSize);
        }
        catch (error) {
            throw errors_1.ErrorFactory.validation("Invalid batch size specified", { batchSize: config.batchSize, error }, [
                "Batch size must be a positive number",
                "Recommended range: 100-5000",
                "Use --batch-size option to specify batch size",
            ]);
        }
        // Validate each file's CSV headers (without index validation)
        for (const filePath of filePaths) {
            await this.validateFileHeaders(filePath, config.delimiter);
        }
    }
    /**
     * Validates headers for a single file (without index validation)
     */
    async validateFileHeaders(filePath, delimiter) {
        try {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const [headerLine] = fileContent.split("\n");
            if (!headerLine) {
                throw errors_1.ErrorFactory.invalidFile("CSV file is empty or has no headers", filePath, [
                    "Ensure the file contains data",
                    "Check if the first line contains column headers",
                    "Verify the file was not corrupted during transfer",
                ]);
            }
            const parseResult = (0, csvParser_1.parseCSVLine)(headerLine, delimiter, true);
            if (!parseResult || !parseResult[0]) {
                throw errors_1.ErrorFactory.parsing("Failed to parse CSV headers", { filePath, delimiter, headerLine: headerLine.substring(0, 100) }, [
                    `Check if '${delimiter}' is the correct delimiter`,
                    "Verify CSV format is valid",
                    "Ensure headers don't contain special characters",
                ]);
            }
            const headers = parseResult[0];
            // Validate CSV structure using our validation function (without index mapping)
            await (0, csvValidator_1.validateCSVStructure)(headers);
        }
        catch (error) {
            // If it's already a ConductorError, rethrow it
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            // Wrap other errors
            throw errors_1.ErrorFactory.validation("Error validating CSV headers", { filePath, originalError: error }, [
                "Check CSV file format and structure",
                "Ensure headers follow naming conventions",
                "Verify file encoding is UTF-8",
            ]);
        }
    }
    /**
     * Processes a single file with consolidated validation
     * Index validation now happens here, creating single point of validation
     */
    async processFile(filePath, config) {
        try {
            // Set up Elasticsearch client
            const client = (0, elasticsearch_1.createClientFromConfig)(config);
            // Validate Elasticsearch connection first
            await (0, elasticsearch_1.validateConnection)(client);
            // Validate index exists (SINGLE POINT OF INDEX VALIDATION)
            await (0, elasticsearchValidator_1.validateIndex)(client, config.elasticsearch.index);
            // NOW validate headers against mapping (only after we know index exists)
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const [headerLine] = fileContent.split("\n");
            const parseResult = (0, csvParser_1.parseCSVLine)(headerLine, config.delimiter, true);
            const headers = parseResult[0];
            logger_1.Logger.debug `Validating headers against the ${config.elasticsearch.index} mapping`;
            await (0, csvValidator_1.validateHeadersMatchMappings)(client, headers, config.elasticsearch.index);
            // Process the file
            await (0, csvProcessor_1.processCSVFile)(filePath, config, client);
        }
        catch (error) {
            // If it's already a ConductorError, just rethrow it without additional wrapping
            // This prevents duplicate error creation and logging
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            // Only wrap and categorize non-ConductorError exceptions
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("ECONNREFUSED") ||
                errorMessage.includes("ENOTFOUND")) {
                throw errors_1.ErrorFactory.connection("Failed to connect to Elasticsearch", {
                    filePath,
                    elasticsearchUrl: config.elasticsearch.url,
                    originalError: error,
                }, [
                    "Check that Elasticsearch is running",
                    `Verify the URL: ${config.elasticsearch.url}`,
                    "Check network connectivity",
                    "Review firewall and security settings",
                ]);
            }
            if (errorMessage.includes("401") || errorMessage.includes("403")) {
                throw errors_1.ErrorFactory.auth("Elasticsearch authentication failed", {
                    filePath,
                    originalError: error,
                }, [
                    "Check your Elasticsearch credentials",
                    "Verify username and password",
                    "Ensure you have write permissions to the index",
                ]);
            }
            // Generic processing error for unknown exceptions
            throw errors_1.ErrorFactory.csv("Failed to process CSV file", {
                filePath,
                originalError: error,
            }, [
                "Check CSV file format and structure",
                "Verify file is not corrupted",
                "Ensure sufficient memory and disk space",
                "Use --debug for detailed error information",
            ]);
        }
    }
}
exports.UploadCommand = UploadCommand;
