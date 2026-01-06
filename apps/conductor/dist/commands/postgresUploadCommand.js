"use strict";
// src/commands/postgresUploadCommand.ts
/**
 * PostgreSQL Upload Command
 *
 * Command implementation for uploading CSV data to PostgreSQL.
 * Mirrors the Elasticsearch upload functionality but targets PostgreSQL database.
 * Updated with proper connection cleanup to ensure process exits correctly.
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
exports.PostgresUploadCommand = void 0;
const utils_1 = require("../validations/utils");
const fileValidator_1 = require("../validations/fileValidator");
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const postgresql_1 = require("../services/postgresql");
const postgresProcessor_1 = require("../services/csvProcessor/postgresProcessor");
const csvParser_1 = require("../services/csvProcessor/csvParser");
const fs = __importStar(require("fs"));
class PostgresUploadCommand extends baseCommand_1.Command {
    constructor() {
        super("postgresUpload");
    }
    /**
     * Executes the upload process for all specified files
     */
    async execute(cliOutput) {
        const { config, filePaths } = cliOutput;
        logger_1.Logger.debug `Input files specified: ${filePaths.length}`;
        logger_1.Logger.debug `Files: ${filePaths.join(", ")}`;
        // Process each file
        let successCount = 0;
        let failureCount = 0;
        const failureDetails = {};
        try {
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
        finally {
            // CRITICAL: Ensure we exit the process cleanly
            logger_1.Logger.debug `Cleaning up and preparing to exit`;
            // Force exit after a short delay to allow any remaining cleanup
            setTimeout(() => {
                logger_1.Logger.debug `Forcing process exit`;
                process.exit(0);
            }, 500);
        }
    }
    /**
     * Validates command line arguments and configuration
     */
    async validate(cliOutput) {
        const { config, filePaths } = cliOutput;
        // Check if user explicitly provided table by looking at process.argv
        const args = process.argv;
        const hasTableFlag = args.includes('-t') || args.some(arg => arg.startsWith('--table'));
        // Validate that user explicitly provided table name
        if (!hasTableFlag) {
            throw errors_1.ErrorFactory.args("Table name is required", [
                "Use -t or --table option to specify the target table",
                "Example: conductor dbupload -f data.csv -t users",
                "Table name must be explicitly provided for data safety",
            ]);
        }
        // Validate PostgreSQL configuration exists
        if (!config.postgresql) {
            throw errors_1.ErrorFactory.args("PostgreSQL configuration is required", [
                "Provide PostgreSQL configuration in your config object",
                "Use command-line options to specify PostgreSQL connection details",
                "Example: --db-host localhost:5435 --db-name mydb -t mytable",
            ]);
        }
        if (!config.postgresql.table) {
            throw errors_1.ErrorFactory.args("PostgreSQL table name is required", [
                "Use -t or --table option to specify the target table",
                "Example: -t users",
                "Ensure the table exists in your database",
            ]);
        }
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
            this.validateBatchSize(config.batchSize);
        }
        catch (error) {
            throw errors_1.ErrorFactory.validation("Invalid batch size specified", { batchSize: config.batchSize, error }, [
                "Batch size must be a positive number",
                "Recommended range: 100-5000",
                "Use --batch-size option to specify batch size",
            ]);
        }
        // Validate each file's CSV headers
        for (const filePath of filePaths) {
            await this.validateFileHeaders(filePath, config.delimiter);
        }
    }
    /**
     * Validates headers for a single CSV file
     */
    async validateFileHeaders(filePath, delimiter) {
        try {
            // Read first line only
            const fileHandle = await fs.promises.open(filePath, "r");
            const firstLineBuffer = Buffer.alloc(1024);
            await fileHandle.read(firstLineBuffer, 0, 1024, 0);
            await fileHandle.close();
            const firstLine = firstLineBuffer.toString("utf8").split("\n")[0];
            // Parse the headers
            const headerResult = (0, csvParser_1.parseCSVLine)(firstLine, delimiter, true);
            const headers = headerResult[0] || [];
            if (!headers || headers.length === 0) {
                throw errors_1.ErrorFactory.parsing("Failed to parse CSV headers", {
                    line: firstLine.substring(0, 100),
                    delimiter,
                    filePath,
                }, [
                    "Check if the first line contains valid headers",
                    `Verify '${delimiter}' is the correct delimiter`,
                    "Ensure headers are properly formatted",
                ]);
            }
            logger_1.Logger.debug `Validated headers for ${filePath}: ${headers.join(", ")}`;
        }
        catch (error) {
            // If it's already a ConductorError, just rethrow it
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
     * Validates batch size
     */
    validateBatchSize(batchSize) {
        if (!batchSize || isNaN(batchSize) || batchSize <= 0) {
            throw errors_1.ErrorFactory.validation("Batch size must be a positive number", {
                provided: batchSize,
                type: typeof batchSize,
            }, [
                "Provide a positive number for batch size",
                "Recommended range: 100–5000",
                "Example: --batch-size 1000",
            ]);
        }
        if (batchSize > 10000) {
            logger_1.Logger.warnString(`Batch size ${batchSize} is quite large and may cause performance issues`);
            logger_1.Logger.tipString("Consider using a smaller batch size (1000–5000) for better performance");
        }
        else {
            logger_1.Logger.debug `Batch size validated: ${batchSize}`;
        }
    }
    /**
     * Processes a single file with proper connection cleanup
     */
    async processFile(filePath, config) {
        let client;
        try {
            // Set up PostgreSQL client
            client = (0, postgresql_1.createPostgresClient)(config);
            // Validate PostgreSQL connection
            await (0, postgresql_1.validateConnection)(client, config);
            // Validate table exists
            await this.validateTable(client, config.postgresql.table);
            // Process the file
            await (0, postgresProcessor_1.processCSVFileForPostgres)(filePath, config, client);
        }
        catch (error) {
            // If it's already a ConductorError, just rethrow it without additional wrapping
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            // Only wrap and categorize non-ConductorError exceptions
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw errors_1.ErrorFactory.validation(`File processing failed: ${errorMessage}`, { filePath, originalError: error }, [
                "Check file format and content",
                "Verify PostgreSQL connection and table schema",
                "Review error details for specific issues",
            ]);
        }
        finally {
            // CRITICAL: Always close the connection pool to allow process to exit
            if (client) {
                try {
                    logger_1.Logger.debug `Closing PostgreSQL connection pool for ${filePath}`;
                    await client.end();
                    logger_1.Logger.debug `PostgreSQL connection pool closed successfully`;
                }
                catch (closeError) {
                    logger_1.Logger.debug `Warning: Error closing PostgreSQL connection pool: ${closeError}`;
                    // Don't throw here - we don't want to mask the original error
                }
            }
        }
    }
    /**
     * Validates that a table exists
     */
    async validateTable(client, tableName) {
        var _a;
        try {
            logger_1.Logger.debug `Validating table exists: ${tableName}`;
            const result = await client.query(`SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`, [tableName]);
            const tableExists = (_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.exists;
            if (!tableExists) {
                logger_1.Logger.debug `Table ${tableName} does not exist, will be created during upload`;
            }
            else {
                logger_1.Logger.debug `Table ${tableName} exists and is accessible`;
            }
        }
        catch (error) {
            throw errors_1.ErrorFactory.validation("Failed to validate table structure", {
                tableName,
                originalError: error,
            }, [
                "Check PostgreSQL connection and availability",
                "Verify table exists and you have access",
                "Ensure PostgreSQL service is running",
            ]);
        }
    }
}
exports.PostgresUploadCommand = PostgresUploadCommand;
