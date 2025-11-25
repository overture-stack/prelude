"use strict";
/**
 * Elasticsearch Bulk Operations Module
 *
 * Provides functions for bulk indexing operations in Elasticsearch.
 * Updated with concise error handling and optional verbose logging.
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
exports.sendBulkWriteRequest = void 0;
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Track if we've already displayed the error summary to avoid duplicates during retries
let hasDisplayedErrorSummary = false;
/**
 * Sends a bulk write request to Elasticsearch.
 * Supports upsert behavior by including document IDs when available.
 *
 * @param client - The Elasticsearch client instance
 * @param records - An array of records to be indexed (can include _id field for upserts)
 * @param indexName - The name of the Elasticsearch index
 * @param onFailure - Callback function to handle failed records
 * @param options - Optional configuration for bulk operations
 * @throws Error after all retries are exhausted
 */
async function sendBulkWriteRequest(client, records, indexName, onFailure, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const refresh = options.refresh !== undefined ? options.refresh : true;
    // Reset the error display flag for each new bulk request
    hasDisplayedErrorSummary = false;
    let attempt = 0;
    let success = false;
    let lastErrorAnalysis = null;
    while (attempt < maxRetries && !success) {
        try {
            const body = records.flatMap((doc) => {
                // Extract _id if present, remove from document body
                const { _id, ...docBody } = doc;
                // Include _id in index action if available (enables upsert behavior)
                const indexAction = _id
                    ? { index: { _index: indexName, _id: String(_id) } }
                    : { index: { _index: indexName } };
                return [indexAction, docBody];
            });
            const { body: result } = await client.bulk({
                body,
                refresh,
            });
            if (result.errors) {
                const errorAnalysis = analyzeErrors(result.items);
                lastErrorAnalysis = errorAnalysis;
                // Write detailed errors to log file if requested
                let logFileName = "";
                if (options.writeErrorLog !== false) {
                    logFileName = await writeErrorLogFile(errorAnalysis, result.items, indexName, options.errorLogDir);
                }
                // Show concise error summary in terminal (only once)
                displayConciseErrorSummary(errorAnalysis, logFileName);
                onFailure(errorAnalysis.totalErrors);
                // If some records succeeded, consider it a partial success
                if (errorAnalysis.totalErrors < records.length) {
                    success = true;
                }
                else {
                    attempt++;
                }
            }
            else {
                success = true;
            }
        }
        catch (error) {
            // Only show retry messages in debug mode
            logger_1.Logger.debugString(`Error sending to Elasticsearch (Attempt ${attempt + 1}): ${error instanceof Error ? error.message : String(error)}`);
            onFailure(records.length);
            attempt++;
            if (attempt < maxRetries) {
                logger_1.Logger.debugString(`Retrying... (${attempt}/${maxRetries})`);
                // Add backoff delay between retries
                await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    if (!success) {
        throw errors_1.ErrorFactory.elasticsearch("Data type validation failed - all records rejected", {
            maxRetries,
            recordCount: records.length,
            indexName,
            errorSummary: lastErrorAnalysis,
        }, [
            "Fix the data types in your CSV file",
            "Check the sample values shown above",
            "Ensure data matches the Elasticsearch field types",
        ]);
    }
}
exports.sendBulkWriteRequest = sendBulkWriteRequest;
/**
 * Analyzes bulk operation errors and groups them by pattern
 */
function analyzeErrors(items) {
    const errorPatterns = new Map();
    let totalErrors = 0;
    items.forEach((item, index) => {
        var _a;
        if ((_a = item.index) === null || _a === void 0 ? void 0 : _a.error) {
            totalErrors++;
            const error = item.index.error;
            const patternKey = `${error.type}:${extractFieldName(error.reason)}`;
            if (!errorPatterns.has(patternKey)) {
                errorPatterns.set(patternKey, {
                    type: error.type,
                    field: extractFieldName(error.reason),
                    reason: cleanErrorReason(error.reason),
                    count: 0,
                    sampleValues: [],
                    sampleDocuments: [],
                });
            }
            const pattern = errorPatterns.get(patternKey);
            pattern.count++;
            // Store first few sample values and document IDs
            if (pattern.sampleValues.length < 3) {
                const sampleValue = extractSampleValue(error.reason);
                if (sampleValue && !pattern.sampleValues.includes(sampleValue)) {
                    pattern.sampleValues.push(sampleValue);
                }
            }
            if (pattern.sampleDocuments.length < 3) {
                pattern.sampleDocuments.push(item.index._id);
            }
        }
    });
    return {
        patterns: Array.from(errorPatterns.values()),
        totalErrors,
    };
}
/**
 * Displays a concise error summary in the terminal
 */
function displayConciseErrorSummary(errorAnalysis, logFileName) {
    // Only display if we haven't shown this pattern before (to avoid duplicates during retries)
    if (!hasDisplayedErrorSummary) {
        logger_1.Logger.generic("");
        logger_1.Logger.generic("");
        logger_1.Logger.info `Bulk indexing failed for ${errorAnalysis.totalErrors} records`;
        logger_1.Logger.suggestion("Issues");
        errorAnalysis.patterns.forEach((pattern) => {
            if (pattern.type === "mapper_parsing_exception") {
                logger_1.Logger.generic(`   ▸ ${pattern.field}: ${pattern.reason} (${pattern.count} records)`);
                if (pattern.sampleValues.length > 0) {
                    logger_1.Logger.generic(`     Sample of values provided: ${pattern.sampleValues.join(", ")}`);
                }
            }
        });
        // Show other error types if any
        const otherPatterns = errorAnalysis.patterns.filter((p) => p.type !== "mapper_parsing_exception");
        if (otherPatterns.length > 0) {
            logger_1.Logger.suggestion("Other Issues");
            otherPatterns.forEach((pattern) => {
                logger_1.Logger.generic(`     ${pattern.type}: ${pattern.reason} (${pattern.count} records)`);
            });
        }
        if (logFileName) {
            logger_1.Logger.generic(`   ▸ Detailed error log: ${logFileName}`);
        }
        hasDisplayedErrorSummary = true;
    }
}
/**
 * Writes detailed error information to a log file
 */
async function writeErrorLogFile(errorAnalysis, items, indexName, logDir) {
    try {
        const logDirectory = logDir || "./logs";
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const logFileName = `elasticsearch-errors-${timestamp}.log`;
        const logPath = path.join(logDirectory, logFileName);
        // Ensure log directory exists
        if (!fs.existsSync(logDirectory)) {
            fs.mkdirSync(logDirectory, { recursive: true });
        }
        let logContent = `Elasticsearch Bulk Operation Error Log\n`;
        logContent += `Index: ${indexName}\n`;
        logContent += `Timestamp: ${new Date().toISOString()}\n`;
        logContent += `Total Errors: ${errorAnalysis.totalErrors}\n\n`;
        // Write error patterns summary
        logContent += "ERROR PATTERNS:\n";
        logContent += "================\n\n";
        errorAnalysis.patterns.forEach((pattern, index) => {
            logContent += `${index + 1}. ${pattern.type} in field "${pattern.field}"\n`;
            logContent += `   Reason: ${pattern.reason}\n`;
            logContent += `   Count: ${pattern.count} records\n`;
            logContent += `   Sample values: ${pattern.sampleValues.join(", ")}\n`;
            logContent += `   Sample documents: ${pattern.sampleDocuments.join(", ")}\n\n`;
        });
        // Write detailed errors
        logContent += "\nDETAILED ERRORS:\n";
        logContent += "=================\n\n";
        items.forEach((item, index) => {
            var _a;
            if ((_a = item.index) === null || _a === void 0 ? void 0 : _a.error) {
                logContent += `Record ${index}:\n`;
                logContent += `  Document ID: ${item.index._id}\n`;
                logContent += `  Status: ${item.index.status}\n`;
                logContent += `  Error: ${JSON.stringify(item.index.error, null, 2)}\n\n`;
            }
        });
        fs.writeFileSync(logPath, logContent);
        // Return the relative path for display
        return logPath;
    }
    catch (error) {
        logger_1.Logger.warnString(`Could not write error log file: ${error}`);
        return "";
    }
}
/**
 * Extracts field name from error reason
 */
function extractFieldName(reason) {
    const fieldMatch = reason.match(/field \[([^\]]+)\]/);
    return fieldMatch ? fieldMatch[1] : "unknown_field";
}
/**
 * Extracts sample value from error reason
 */
function extractSampleValue(reason) {
    const valueMatch = reason.match(/Preview of field's value: '([^']+)'/);
    return valueMatch ? valueMatch[1] : null;
}
/**
 * Cleans up error reason for display
 */
function cleanErrorReason(reason) {
    // Extract the main error without field references and document IDs
    if (reason.includes("failed to parse field")) {
        const typeMatch = reason.match(/of type \[([^\]]+)\]/);
        if (typeMatch) {
            return `Expected ${typeMatch[1]}, but got string values`;
        }
        // Fallback for number format exceptions
        if (reason.includes("number_format_exception")) {
            return "Expected number, but got string values";
        }
    }
    // Clean up other error types
    const firstSentence = reason.split(".")[0];
    return firstSentence.length > 60
        ? firstSentence.substring(0, 60) + "..."
        : firstSentence;
}
