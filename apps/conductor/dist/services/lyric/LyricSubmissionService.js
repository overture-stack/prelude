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
exports.LyricSubmissionService = void 0;
// src/services/lyric/LyricSubmissionService.ts - Enhanced with single file support
const baseService_1 = require("../base/baseService");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Use require for FormData to avoid TypeScript import issues
const FormData = require("form-data");
const chalk_1 = __importDefault(require("chalk"));
class LyricSubmissionService extends baseService_1.BaseService {
    constructor(config) {
        super(config);
    }
    get serviceName() {
        return "Lyric Data";
    }
    get healthEndpoint() {
        return "/health";
    }
    /**
     * Complete data submission workflow: validate -> submit -> wait -> commit
     */
    async submitDataWorkflow(params) {
        try {
            // Step 1: Find and validate files (now supports both files and directories)
            const validFiles = await this.findValidFiles(params.dataDirectory);
            // Step 2: Validate filenames against schema names BEFORE submission
            await this.validateFilenamesAgainstSchemas(validFiles, params.categoryId);
            // Step 3: Submit files
            const submission = await this.submitFiles({
                categoryId: params.categoryId,
                organization: params.organization,
                files: validFiles,
            });
            // Step 4: Wait for validation
            const finalStatus = await this.waitForValidation(submission.submissionId, params.maxRetries || 10, params.retryDelay || 20000);
            // Step 5: Commit if valid
            if (finalStatus === "VALID") {
                await this.commitSubmission(params.categoryId, submission.submissionId);
                return {
                    submissionId: submission.submissionId,
                    status: "COMMITTED",
                    filesSubmitted: validFiles.map((f) => path.basename(f)),
                    message: "Data successfully submitted and committed",
                };
            }
            throw errors_1.ErrorFactory.validation("Submission validation failed", {
                submissionId: submission.submissionId,
                status: finalStatus,
                categoryId: params.categoryId,
            }, [
                `Submission status: ${finalStatus}`,
                `Check validation details at ${this.config.url}/submission/${submission.submissionId}`,
                "Review data format and required fields",
                "Verify data meets service requirements",
            ]);
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Validate filenames against available schema names BEFORE submission
     */
    async validateFilenamesAgainstSchemas(filePaths, categoryId) {
        logger_1.Logger.debug `Validating filenames against schema names for category ${categoryId}`;
        try {
            // Get available schema names from the dictionary
            const availableSchemas = await this.getAvailableSchemaNames(categoryId);
            if (availableSchemas.length === 0) {
                logger_1.Logger.warnString(`Could not fetch schema names for category ${categoryId}`);
                logger_1.Logger.warnString("Proceeding without filename validation");
                return;
            }
            logger_1.Logger.debug `Available schemas: ${availableSchemas.join(", ")}`;
            // Check each file
            const invalidFiles = [];
            const validFiles = [];
            for (const filePath of filePaths) {
                const filename = path.basename(filePath);
                const schemaName = path.basename(filename, ".csv");
                if (availableSchemas.includes(schemaName)) {
                    validFiles.push(filename);
                    logger_1.Logger.debug `✓ ${filename} matches schema '${schemaName}'`;
                }
                else {
                    invalidFiles.push(filename);
                    logger_1.Logger.debug `✗ ${filename} does not match any schema (extracted: '${schemaName}')`;
                }
            }
            // If there are invalid files, display error and stop
            if (invalidFiles.length > 0) {
                logger_1.Logger.errorString(`Invalid file names detected - files must match schema names exactly`);
                logger_1.Logger.suggestion("Invalid Files (do not match any schema)");
                invalidFiles.forEach((filename) => {
                    const extractedName = path.basename(filename, ".csv");
                    logger_1.Logger.generic(`   ▸ ${filename} (extracted schema name: '${extractedName}')`);
                });
                if (validFiles.length > 0) {
                    logger_1.Logger.suggestion("Valid Files (match schemas)");
                    validFiles.forEach((filename) => {
                        const extractedName = path.basename(filename, ".csv");
                        logger_1.Logger.generic(`   ▸ ${filename} (matches schema: '${extractedName}')`);
                    });
                }
                logger_1.Logger.suggestion("Available Schema Names");
                availableSchemas.forEach((schemaName) => {
                    logger_1.Logger.generic(`   ▸ ${schemaName}.csv`);
                });
                logger_1.Logger.suggestion("How to Fix");
                logger_1.Logger.generic("   ▸ Rename your CSV files to match the exact schema names");
                logger_1.Logger.generic("   ▸ Schema names are case-sensitive");
                logger_1.Logger.generic("   ▸ File format must be: [schema_name].csv");
                logger_1.Logger.generic("   ▸ Example: if you have a 'diagnosis' schema, file should be 'diagnosis.csv'");
                // Create error but mark as already logged
                const error = errors_1.ErrorFactory.validation("File names do not match schema names", {
                    invalidFiles,
                    validFiles,
                    availableSchemas,
                    categoryId,
                    alreadyLogged: true,
                }, [] // Empty suggestions since we already displayed them above
                );
                error.isLogged = true;
                throw error;
            }
            logger_1.Logger.debug `All ${filePaths.length} files have valid schema names`;
        }
        catch (error) {
            // If it's our validation error, rethrow it
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            // If we couldn't validate schemas, warn but continue
            logger_1.Logger.warnString(`Could not validate filenames against schemas: ${error}`);
            logger_1.Logger.warnString("Proceeding without filename validation - errors may occur during submission");
        }
    }
    /**
     * ENHANCED: Find valid CSV files - now supports both files and directories
     */
    async findValidFiles(inputPath) {
        if (!fs.existsSync(inputPath)) {
            throw errors_1.ErrorFactory.file("Input path not found", inputPath, [
                "Check that the file or directory exists",
                "Verify the path is correct",
                "Ensure you have access to the path",
            ]);
        }
        const stats = fs.statSync(inputPath);
        // Handle single file input
        if (stats.isFile()) {
            logger_1.Logger.debug `Input is a single file: ${inputPath}`;
            // Validate it's a CSV file
            if (!inputPath.toLowerCase().endsWith(".csv")) {
                throw errors_1.ErrorFactory.invalidFile("File must have .csv extension", inputPath, [
                    "Ensure the file has a .csv extension",
                    "Only CSV files are supported for Lyric uploads",
                ]);
            }
            // Check file has content
            if (stats.size === 0) {
                throw errors_1.ErrorFactory.invalidFile("File is empty", inputPath, [
                    "Ensure the file contains data",
                    "Check if the file was created properly",
                ]);
            }
            logger_1.Logger.debug `Single file validation passed`;
            logger_1.Logger.debug `File: ${path.basename(inputPath)} (${Math.round((stats.size / 1024) * 10) / 10} KB)`;
            return [inputPath];
        }
        // Handle directory input (existing logic)
        if (stats.isDirectory()) {
            logger_1.Logger.debug `Input is a directory: ${inputPath}`;
            // Find all CSV files
            const allFiles = fs
                .readdirSync(inputPath)
                .filter((file) => file.endsWith(".csv"))
                .map((file) => path.join(inputPath, file))
                .filter((filePath) => {
                try {
                    const fileStats = fs.statSync(filePath);
                    return fileStats.isFile() && fileStats.size > 0;
                }
                catch (_a) {
                    return false;
                }
            });
            if (allFiles.length === 0) {
                throw errors_1.ErrorFactory.file("No valid CSV files found in directory", inputPath, [
                    "Ensure the directory contains CSV files",
                    "Check that files have .csv extension",
                    "Verify files are not empty",
                ]);
            }
            // Log the files found in a nice format
            logger_1.Logger.debug `Found ${allFiles.length} valid CSV files in directory`;
            logger_1.Logger.debug `Files found in ${inputPath}:`;
            allFiles.forEach((file) => {
                const fileStats = fs.statSync(file);
                const sizeKB = Math.round((fileStats.size / 1024) * 10) / 10;
                logger_1.Logger.debug `  - ${path.basename(file)} (${sizeKB} KB)`;
            });
            return allFiles;
        }
        // Not a file or directory
        throw errors_1.ErrorFactory.file("Input path is not a file or directory", inputPath, [
            "Provide a valid file path (ending in .csv) or directory path",
            "Check that the path points to an existing file or directory",
        ]);
    }
    /**
     * Submit files to Lyric
     */
    async submitFiles(params) {
        var _a;
        try {
            const fileCount = params.files.length;
            const fileWord = fileCount === 1 ? "file" : "files";
            logger_1.Logger.info `Submitting ${fileCount} ${fileWord} to Lyric:`;
            // List the files being submitted
            params.files.forEach((file) => {
                logger_1.Logger.generic(`  ▸ ${path.basename(file)}`);
            });
            logger_1.Logger.generic("");
            // Create FormData for file upload - use Node.js FormData implementation
            const formData = new FormData();
            // Add files
            for (const filePath of params.files) {
                logger_1.Logger.debug `Adding file: ${path.basename(filePath)}`;
                const fileStream = fs.createReadStream(filePath);
                formData.append("files", fileStream, {
                    filename: path.basename(filePath),
                    contentType: "text/csv",
                });
            }
            // Add organization
            formData.append("organization", params.organization);
            // Log headers for debugging
            logger_1.Logger.debug `Form headers: ${JSON.stringify(formData.getHeaders())}`;
            // Make the request with proper FormData headers
            const response = await this.http.post(`/submission/category/${params.categoryId}/data`, formData, {
                headers: {
                    ...formData.getHeaders(), // This ensures content-type and boundaries are set correctly
                },
            });
            const submissionId = (_a = response.data) === null || _a === void 0 ? void 0 : _a.submissionId;
            if (!submissionId) {
                // This should not happen now since we validate filenames beforehand
                throw errors_1.ErrorFactory.connection("Could not extract submission ID from response", {
                    response: response.data,
                    categoryId: params.categoryId,
                }, [
                    "Check Lyric service response format",
                    "Verify the submission was processed",
                    "Review service logs for errors",
                ]);
            }
            logger_1.Logger.debug `Submission created with ID: ${submissionId}`;
            return { submissionId: submissionId.toString() };
        }
        catch (error) {
            // Enhanced error handling for submission failures
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.Logger.debug `Submission error: ${errorMessage}`;
            // If it's already a ConductorError, just rethrow it
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            // Special handling for category not found errors
            if (errorMessage.includes("Dictionary in category") ||
                (errorMessage.includes("400") && errorMessage.includes("category"))) {
                // Try to fetch available categories to help the user
                try {
                    logger_1.Logger.debug `Fetching available categories to help with suggestions`;
                    const categoriesResponse = await this.http.get("/category");
                    // Check if we got a valid response with categories
                    if (categoriesResponse.data &&
                        Array.isArray(categoriesResponse.data)) {
                        const availableCategories = categoriesResponse.data;
                        // Display the list of available categories ONLY ONCE
                        logger_1.Logger.errorString(`Category ID '${params.categoryId}' not found`);
                        if (availableCategories.length > 0) {
                            logger_1.Logger.generic("");
                            logger_1.Logger.generic(chalk_1.default.bold.cyan("🔍 Available categories:"));
                            availableCategories.forEach((cat) => {
                                logger_1.Logger.generic(`   ▸ ID: ${cat.id} - Name: ${cat.name || "Unnamed"}`);
                            });
                            logger_1.Logger.generic("");
                            // Create error but mark it as already logged to prevent duplicate messages
                            const error = errors_1.ErrorFactory.validation("Category not found", {
                                requestedCategoryId: params.categoryId,
                                availableCategories,
                                alreadyLogged: true, // Add marker
                            }, [] // Empty suggestions since we showed the fix above
                            );
                            // Add a property to indicate this error was already logged
                            error.alreadyLogged = true;
                            throw error;
                        }
                        else {
                            logger_1.Logger.warnString("No categories found in Lyric service");
                            const error = errors_1.ErrorFactory.validation("No categories available in the Lyric service", {
                                categoryId: params.categoryId,
                                alreadyLogged: true,
                            }, [] // Empty suggestions
                            );
                            // Mark as already logged
                            error.alreadyLogged = true;
                            throw error;
                        }
                    }
                }
                catch (catError) {
                    // If this is already a properly formatted error with a marker, just rethrow it
                    if (catError instanceof Error &&
                        catError.name === "ConductorError" &&
                        catError.alreadyLogged) {
                        throw catError;
                    }
                    // If we couldn't fetch categories, log and continue with generic error
                    logger_1.Logger.debug `Failed to fetch categories: ${catError}`;
                }
                // Fallback error if we couldn't fetch categories
                throw errors_1.ErrorFactory.validation("Category not found or bad request during file submission", { originalError: error, categoryId: params.categoryId }, [
                    "Check that category ID is valid",
                    "Verify the Lyric service configuration",
                    "Ensure you have permission to access categories",
                ]);
            }
            // Handle other specific error types with relevant suggestions
            if (errorMessage.includes("413")) {
                throw errors_1.ErrorFactory.validation("Files are too large for submission", { originalError: error, fileCount: params.files.length }, [
                    "Reduce file sizes or split large files",
                    "Check service upload limits",
                    "Try submitting fewer files at once",
                ]);
            }
            if (errorMessage.includes("422")) {
                throw errors_1.ErrorFactory.validation("File validation failed during submission", { originalError: error }, [
                    "Check CSV file format and structure",
                    "Verify data meets service requirements",
                    "Review column names and data types",
                ]);
            }
            if (errorMessage.includes("ECONNREFUSED") ||
                errorMessage.includes("ENOTFOUND")) {
                throw errors_1.ErrorFactory.connection("Failed to connect to Lyric service", { originalError: error, serviceUrl: this.config.url }, [
                    "Check that Lyric service is running",
                    `Verify the service URL: ${this.config.url}`,
                    "Check network connectivity",
                    "Review firewall settings",
                ]);
            }
            // For other unknown errors, provide generic but relevant suggestions
            throw errors_1.ErrorFactory.connection(`File submission failed: ${errorMessage}`, { originalError: error }, [
                "Check Lyric service status and connectivity",
                "Verify your authentication and permissions",
                "Review service logs for more details",
            ]);
        }
    }
    /**
     * Get available schema names from the dictionary for the given category
     */
    async getAvailableSchemaNames(categoryId) {
        var _a, _b;
        try {
            logger_1.Logger.debug `Fetching schema names for category ${categoryId}`;
            // First, get the category information to find the dictionary
            const categoryResponse = await this.http.get(`/category/${categoryId}`);
            const category = categoryResponse.data;
            logger_1.Logger.debug `Category response: ${JSON.stringify(category)}`;
            // Check for dictionary information in the category response
            // The structure appears to be category.dictionary with name and version
            if (!((_a = category === null || category === void 0 ? void 0 : category.dictionary) === null || _a === void 0 ? void 0 : _a.name) || !((_b = category === null || category === void 0 ? void 0 : category.dictionary) === null || _b === void 0 ? void 0 : _b.version)) {
                logger_1.Logger.debug `No dictionary information found for category ${categoryId}`;
                logger_1.Logger.debug `Expected category.dictionary.name and category.dictionary.version`;
                return [];
            }
            const dictionaryName = category.dictionary.name;
            const dictionaryVersion = category.dictionary.version;
            logger_1.Logger.debug `Found dictionary: ${dictionaryName} v${dictionaryVersion}`;
            // Now we need to get the dictionary details from Lectern
            // Since we have the name and version, we can query Lectern directly
            const lecternUrl = process.env.LECTERN_URL || "http://localhost:3031";
            try {
                // Create a simple HTTP client for Lectern
                const axios = require("axios");
                // Get all dictionaries from Lectern
                const dictionariesResponse = await axios.get(`${lecternUrl}/dictionaries`);
                const dictionaries = Array.isArray(dictionariesResponse.data)
                    ? dictionariesResponse.data
                    : [];
                logger_1.Logger.debug `Found ${dictionaries.length} dictionaries in Lectern`;
                // Find the specific dictionary by name and version
                const targetDictionary = dictionaries.find((dict) => dict.name === dictionaryName && dict.version === dictionaryVersion);
                if (!targetDictionary) {
                    logger_1.Logger.debug `Dictionary ${dictionaryName} v${dictionaryVersion} not found in Lectern`;
                    return [];
                }
                logger_1.Logger.debug `Found target dictionary: ${JSON.stringify(targetDictionary)}`;
                // Get detailed dictionary information
                const detailedDictResponse = await axios.get(`${lecternUrl}/dictionaries/${targetDictionary._id}`);
                const detailedDict = detailedDictResponse.data;
                logger_1.Logger.debug `Detailed dictionary response: ${JSON.stringify(detailedDict)}`;
                if (!(detailedDict === null || detailedDict === void 0 ? void 0 : detailedDict.schemas) || !Array.isArray(detailedDict.schemas)) {
                    logger_1.Logger.debug `No schemas found in dictionary ${dictionaryName} v${dictionaryVersion}`;
                    return [];
                }
                logger_1.Logger.debug `Found ${detailedDict.schemas.length} schemas`;
                // Extract schema names (these are the entity names)
                const schemaNames = detailedDict.schemas
                    .map((schema) => schema === null || schema === void 0 ? void 0 : schema.name)
                    .filter((name) => typeof name === "string" && name.length > 0);
                logger_1.Logger.debug `Found ${schemaNames.length} schema names: ${schemaNames.join(", ")}`;
                return schemaNames;
            }
            catch (lecternError) {
                logger_1.Logger.debug `Error connecting to Lectern: ${lecternError}`;
                // If we can't connect to Lectern, we can't get the schema names
                // This is expected if Lectern is not running or not accessible
                logger_1.Logger.debug `Could not fetch schema names from Lectern service`;
                return [];
            }
        }
        catch (error) {
            logger_1.Logger.debug `Could not fetch schema names: ${error}`;
            // Enhanced error logging for troubleshooting
            if (error instanceof Error) {
                logger_1.Logger.debug `Error name: ${error.name}`;
                logger_1.Logger.debug `Error message: ${error.message}`;
                if (error.response) {
                    logger_1.Logger.debug `Error response status: ${error.response.status}`;
                    logger_1.Logger.debug `Error response data: ${JSON.stringify(error.response.data)}`;
                }
            }
            return [];
        }
    }
    /**
     * Parse and display Lyric validation errors in a user-friendly way
     * Focuses on common scenarios like duplicate submissions
     */
    parseAndDisplayLyricErrors(submissionId, responseData) {
        var _a;
        try {
            if (!((_a = responseData === null || responseData === void 0 ? void 0 : responseData.errors) === null || _a === void 0 ? void 0 : _a.inserts)) {
                logger_1.Logger.errorString("Data validation failed - see submission details for more information");
                logger_1.Logger.generic(`   ▸ View detailed errors: ${this.config.url}/submission/${submissionId}`);
                return;
            }
            const errorsByTable = responseData.errors.inserts;
            const totalErrors = Object.values(errorsByTable).reduce((sum, errors) => sum + (Array.isArray(errors) ? errors.length : 0), 0);
            const isDuplicateSubmission = this.isDuplicateSubmissionError(errorsByTable);
            if (isDuplicateSubmission) {
                this.displayDuplicateSubmissionError(errorsByTable, totalErrors, submissionId);
            }
            else {
                this.displayGenericValidationErrors(errorsByTable, totalErrors, submissionId);
            }
        }
        catch (parseError) {
            logger_1.Logger.warnString("Could not parse detailed error information");
            logger_1.Logger.debugString(`Parse error: ${parseError}`);
            logger_1.Logger.generic(`   ▸ View detailed errors: ${this.config.url}/submission/${submissionId}`);
        }
    }
    /**
     * Detect if this is a duplicate submission (all errors are INVALID_BY_UNIQUE)
     */
    isDuplicateSubmissionError(errorsByTable) {
        const allErrors = Object.values(errorsByTable).flat();
        return (allErrors.length > 0 &&
            allErrors.every((error) => error.reason === "INVALID_BY_UNIQUE"));
    }
    /**
     * Display error message specifically for duplicate submissions
     */
    displayDuplicateSubmissionError(errorsByTable, totalErrors, submissionId) {
        const tableCount = Object.keys(errorsByTable).length;
        logger_1.Logger.errorString(`Duplicate submission detected - ${totalErrors} duplicate records across ${tableCount} tables`);
        logger_1.Logger.suggestion("This appears to be a resubmission of existing data");
        Object.entries(errorsByTable).forEach(([tableName, errors]) => {
            if (Array.isArray(errors) && errors.length > 0) {
                logger_1.Logger.generic(`   ▸ ${tableName.toUpperCase()}: ${errors.length} duplicate records`);
            }
        });
        // Simple submission link
        if (submissionId) {
            logger_1.Logger.generic(`   ▸ View detailed errors: ${this.config.url}/submission/${submissionId}`);
        }
    }
    /**
     * Display error message for other validation issues
     */
    displayGenericValidationErrors(errorsByTable, totalErrors, submissionId) {
        const tableCount = Object.keys(errorsByTable).length;
        logger_1.Logger.errorString(`Data validation failed with ${totalErrors} errors across ${tableCount} tables`);
        logger_1.Logger.generic("");
        const errorSummary = this.summarizeErrorTypes(errorsByTable);
        logger_1.Logger.suggestion("Error Summary");
        Object.entries(errorSummary).forEach(([reason, count]) => {
            const description = this.getErrorDescription(reason);
            logger_1.Logger.generic(`   ▸ ${description}: ${count} errors`);
        });
        logger_1.Logger.generic("");
        logger_1.Logger.suggestion("Affected Tables");
        Object.entries(errorsByTable).forEach(([tableName, errors]) => {
            if (Array.isArray(errors) && errors.length > 0) {
                logger_1.Logger.generic(`   ▸ ${tableName.toUpperCase()}: ${errors.length} errors`);
            }
        });
        logger_1.Logger.generic("");
        this.displayGenericSolutions(errorSummary);
        // Simple submission link
        if (submissionId) {
            logger_1.Logger.generic(`   ▸ View detailed errors: ${this.config.url}/submission/${submissionId}`);
        }
    }
    /**
     * Summarize error types across all tables
     */
    summarizeErrorTypes(errorsByTable) {
        const summary = {};
        Object.values(errorsByTable)
            .flat()
            .forEach((error) => {
            const reason = (error === null || error === void 0 ? void 0 : error.reason) || "UNKNOWN";
            summary[reason] = (summary[reason] || 0) + 1;
        });
        return summary;
    }
    /**
     * Get user-friendly description for error codes
     */
    getErrorDescription(reason) {
        switch (reason) {
            case "INVALID_BY_UNIQUE":
                return "Duplicate values in unique fields";
            case "INVALID_BY_MISSING_RELATION":
            case "INVALID_BY_FOREIGNKEY":
                return "Foreign key constraint violations";
            case "INVALID_BY_REGEX":
                return "Invalid format or pattern";
            case "INVALID_BY_SCRIPT":
                return "Custom validation failures";
            default:
                return reason;
        }
    }
    /**
     * Display solutions based on error types
     */
    displayGenericSolutions(errorSummary) {
        logger_1.Logger.suggestion("How to Fix");
        Object.keys(errorSummary).forEach((reason) => {
            switch (reason) {
                case "INVALID_BY_UNIQUE":
                    logger_1.Logger.generic("   ▸ Remove duplicate ID values from your CSV files");
                    logger_1.Logger.generic("   ▸ Ensure each record has a unique identifier");
                    break;
                case "INVALID_BY_MISSING_RELATION":
                case "INVALID_BY_FOREIGNKEY":
                    logger_1.Logger.generic("   ▸ Verify foreign key values exist in referenced tables");
                    logger_1.Logger.generic("   ▸ Check the order of file uploads (dependencies first)");
                    break;
                case "INVALID_BY_REGEX":
                    logger_1.Logger.generic("   ▸ Check data format requirements in the dictionary schema");
                    logger_1.Logger.generic("   ▸ Fix values that don't match expected patterns");
                    break;
                case "INVALID_BY_SCRIPT":
                    logger_1.Logger.generic("   ▸ Review custom validation rules in the dictionary");
                    logger_1.Logger.generic("   ▸ Ensure data meets business logic constraints");
                    break;
            }
        });
        logger_1.Logger.generic("   ▸ Fix the issues in your CSV files and resubmit");
    }
    /**
     * Wait for submission validation with progress updates and enhanced error parsing
     */
    async waitForValidation(submissionId, maxRetries, retryDelay) {
        var _a, _b;
        logger_1.Logger.debug `Waiting for submission Id ${submissionId} validation`;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.http.get(`/submission/${submissionId}`);
                const status = (_a = response.data) === null || _a === void 0 ? void 0 : _a.status;
                if (!status) {
                    throw errors_1.ErrorFactory.connection("Could not extract status from response", { response: response.data, submissionId }, [
                        "Check Lyric service response format",
                        "Verify submission ID is valid",
                        "Review service logs for errors",
                    ]);
                }
                logger_1.Logger.info `Validation check ${attempt}/${maxRetries}: ${status}`;
                if (status === "VALID") {
                    logger_1.Logger.debug `Submission validation passed`;
                    return status;
                }
                else if (status === "INVALID") {
                    this.parseAndDisplayLyricErrors(submissionId, response.data);
                    const error = errors_1.ErrorFactory.validation("Data validation failed - see detailed errors above", {
                        submissionId,
                        status,
                        errorCount: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.errors)
                            ? Object.values(response.data.errors.inserts || {}).reduce((sum, errors) => sum + (Array.isArray(errors) ? errors.length : 0), 0)
                            : 0,
                    }, []);
                    error.isLogged = true;
                    throw error;
                }
                if (attempt < maxRetries) {
                    logger_1.Logger.info `Waiting ${retryDelay / 1000} seconds before next check`;
                    await this.delay(retryDelay);
                }
            }
            catch (error) {
                if (error instanceof Error && error.name === "ConductorError") {
                    throw error;
                }
                if (attempt === maxRetries) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    throw errors_1.ErrorFactory.connection(`Status check failed after ${maxRetries} attempts: ${errorMessage}`, { submissionId, originalError: error }, [
                        "Check Lyric service connectivity",
                        "Verify submission ID is valid",
                        "Review service logs for details",
                    ]);
                }
                logger_1.Logger.warnString(`Status check failed, retrying... (${attempt}/${maxRetries})`);
                await this.delay(retryDelay);
            }
        }
        throw errors_1.ErrorFactory.connection("Validation timed out", {
            submissionId,
            attempts: maxRetries,
            totalWaitTime: (maxRetries * retryDelay) / 1000,
        }, [
            `Validation did not complete after ${maxRetries} attempts (${(maxRetries * retryDelay) / 1000} seconds)`,
            `Check status manually at ${this.config.url}/submission/${submissionId}`,
            "Consider increasing max retries or retry delay",
            "Review service logs for processing issues",
        ]);
    }
    /**
     * Commit a validated submission
     */
    async commitSubmission(categoryId, submissionId) {
        logger_1.Logger.debug `Committing submission: ${submissionId}`;
        try {
            await this.http.post(`/submission/category/${categoryId}/commit/${submissionId}`, {});
            logger_1.Logger.debug `Submission committed successfully`;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("404")) {
                throw errors_1.ErrorFactory.validation("Submission not found for commit", { submissionId, categoryId }, [
                    "Verify submission ID is correct",
                    "Check that submission exists and is in VALID status",
                    "Ensure category ID matches the original submission",
                ]);
            }
            if (errorMessage.includes("409")) {
                throw errors_1.ErrorFactory.validation("Submission cannot be committed in current state", { submissionId, categoryId }, [
                    "Submission may already be committed",
                    "Check submission status before committing",
                    "Verify submission passed validation",
                ]);
            }
            throw errors_1.ErrorFactory.connection(`Failed to commit submission: ${errorMessage}`, { submissionId, categoryId, originalError: error }, [
                "Check Lyric service connectivity",
                "Verify submission is in valid state",
                "Review service logs for details",
            ]);
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.LyricSubmissionService = LyricSubmissionService;
