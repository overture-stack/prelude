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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFile = validateFile;
exports.validateElasticsearchConnection = validateElasticsearchConnection;
exports.validateCSVStructure = validateCSVStructure;
exports.validateBatchSize = validateBatchSize;
exports.validateIndex = validateIndex;
exports.checkElasticsearchIndex = checkElasticsearchIndex;
exports.validateHeadersMatchMappings = validateHeadersMatchMappings;
exports.validateDelimiter = validateDelimiter;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
/**
 * Validation Utilities for CSV Processing Pipeline
 *
 * This module provides a comprehensive set of validation functions to ensure
 * data integrity, system readiness, and configuration correctness before
 * processing CSV files into Elasticsearch.
 *
 * Key Validation Checks:
 * - File existence and readability
 * - Elasticsearch cluster connection
 * - CSV structure and header validation
 * - Batch size configuration
 * - Index existence and accessibility
 * - Delimiter configuration
 *
 * Features:
 * - Detailed error and warning messages
 * - Interactive feedback during validation
 * - Checks for common configuration issues
 * - Helps prevent processing errors early in the pipeline
 *
 * Each validation function:
 * - Returns a boolean indicating pass/fail status
 * - Writes descriptive messages to stdout
 * - Provides actionable feedback for troubleshooting
 */
/**
 * Validates file accessibility and content
 *
 * Performs multiple checks to ensure the file:
 * - Exists on the file system
 * - Is readable by the current process
 * - Is not empty
 *
 * @param filePath Full path to the file to be validated
 * @returns Promise resolving to boolean validation status
 */
async function validateFile(filePath) {
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            process.stdout.write(chalk_1.default.red(`\n❌ Error: File '${filePath}' does not exist\n\n`));
            return false;
        }
        // Check if file is readable
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        }
        catch (error) {
            process.stdout.write(chalk_1.default.red(`\n❌ Error: File '${filePath}' is not readable\n\n`));
            return false;
        }
        // Check if file is empty
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            process.stdout.write(chalk_1.default.red(`\n❌ Error: File '${filePath}' is empty\n\n`));
            return false;
        }
        // Success message
        process.stdout.write(chalk_1.default.green('✓ File ') + chalk_1.default.yellow(`'${filePath}'`) + chalk_1.default.green(' is valid and readable.\n'));
        return true;
    }
    catch (error) {
        process.stdout.write(chalk_1.default.red(`\n❌ Error validating file: ${error}\n\n`));
        return false;
    }
}
/**
 * Validates connection to Elasticsearch cluster
 *
 * Checks:
 * - Ability to connect to the cluster
 * - Retrieves cluster health information
 * - Provides detailed error messages for common connection issues
 *
 * @param client Elasticsearch client instance
 * @param config Configuration object containing connection details
 * @returns Promise resolving to boolean connection status
 */
async function validateElasticsearchConnection(client, config) {
    try {
        // Test connection to Elasticsearch
        const { body: health } = await client.cluster.health();
        process.stdout.write(chalk_1.default.green(`\n✓ Connection to Elasticsearch successful.\n`));
        return true;
    }
    catch (error) { // Type as any for error handling
        process.stdout.write(chalk_1.default.red('\n❌ Error connecting to Elasticsearch:\n\n'));
        if ((error === null || error === void 0 ? void 0 : error.name) === 'ConnectionError') {
            process.stdout.write(chalk_1.default.yellow('Could not connect to Elasticsearch. Please check:\n'));
            process.stdout.write('1. Elasticsearch is running\n');
            process.stdout.write(`2. The URL is correct: ${config.elasticsearch.url}\n`);
            process.stdout.write('3. Network connectivity\n');
        }
        else if ((error === null || error === void 0 ? void 0 : error.name) === 'AuthenticationException') {
            process.stdout.write(chalk_1.default.yellow('Authentication failed. Please check:\n'));
            process.stdout.write('1. Username is correct\n');
            process.stdout.write('2. Password is correct\n');
            process.stdout.write('3. User has sufficient permissions\n');
        }
        else {
            process.stdout.write(chalk_1.default.yellow('Error details:\n'));
            console.error(error);
        }
        return false;
    }
}
/**
 * Validates CSV header structure
 *
 * Checks:
 * - Presence of headers
 * - No duplicate headers
 * - No empty or whitespace-only headers
 *
 * @param headers Array of CSV headers to validate
 * @returns Promise resolving to boolean validation status
 */
async function validateCSVStructure(headers) {
    // Remove empty strings and trim whitespace
    const cleanedHeaders = headers
        .map(header => header.trim())
        .filter(header => header !== '');
    // Check if we have the expected number of headers
    if (cleanedHeaders.length === 0) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: No valid headers found in CSV file\n\n'));
        return false;
    }
    // Check if the number of cleaned headers matches the original headers
    if (cleanedHeaders.length !== headers.length) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: Empty or whitespace-only headers detected\n\n'));
        process.stdout.write(chalk_1.default.yellow('Problematic headers are:\n'));
        headers.forEach((header, index) => {
            if (header.trim() === '') {
                process.stdout.write(chalk_1.default.yellow(`├─ Column ${index + 1}: Empty header\n\n`));
            }
        });
        process.stdout.write(chalk_1.default.cyan('\nSuggestions:\n'));
        process.stdout.write('1. Remove empty columns from the CSV file\n');
        process.stdout.write('2. Ensure each column has a meaningful name\n');
        process.stdout.write('3. Check your CSV export settings\n');
        return false;
    }
    // Count header occurrences
    const headerCounts = cleanedHeaders.reduce((acc, header) => {
        acc[header] = (acc[header] || 0) + 1;
        return acc;
    }, {});
    // Find duplicate headers
    const duplicates = Object.entries(headerCounts)
        .filter(([_, count]) => count > 1)
        .map(([header, _]) => header);
    if (duplicates.length > 0) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: Duplicate headers found in CSV file\n\n'));
        // Display duplicate headers
        duplicates.forEach(header => {
            process.stdout.write(chalk_1.default.yellow(`├─ Duplicate header: "${header}" appears ${headerCounts[header]} times\n`));
        });
        // Provide suggestions
        process.stdout.write(chalk_1.default.cyan('\nSuggestions:\n'));
        process.stdout.write('1. Remove duplicate columns from the CSV file\n');
        process.stdout.write('2. Ensure each column has a unique name\n');
        process.stdout.write('3. Check your CSV export settings\n');
        return false;
    }
    // Optional: Suggest renaming generic headers
    const genericHeaderWarnings = cleanedHeaders.filter(header => ['0', '1', '2', 'col1', 'col2', 'column1', 'column2'].includes(header.toLowerCase()));
    if (genericHeaderWarnings.length > 0) {
        process.stdout.write(chalk_1.default.yellow('\n⚠️  Warning: Generic headers detected\n'));
        genericHeaderWarnings.forEach(header => {
            process.stdout.write(chalk_1.default.yellow(`├─ Generic header: "${header}"\n`));
        });
        process.stdout.write(chalk_1.default.cyan('Consider using more descriptive column names\n\n'));
    }
    process.stdout.write(chalk_1.default.green('\n✓ CSV header structure is valid.\n\n'));
    return true;
}
/**
 * Validates batch size configuration
 *
 * Checks:
 * - Batch size is a positive number
 * - Warns about potentially problematic large batch sizes
 *
 * @param batchSize Configured batch size to validate
 * @returns Boolean indicating if batch size is valid
 */
function validateBatchSize(batchSize) {
    if (isNaN(batchSize) || batchSize < 1) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: Invalid batch size\n\n'));
        process.stdout.write(chalk_1.default.yellow('Batch size must be a positive number\n'));
        return false;
    }
    if (batchSize > 10000) {
        process.stdout.write(chalk_1.default.yellow('\n⚠️  Warning: Large batch size detected\n'));
        process.stdout.write('Large batch sizes may cause memory issues or timeouts\n');
        process.stdout.write('Recommended batch size is between 500 and 5000\n');
    }
    return true;
}
/**
 * Validates Elasticsearch index
 *
 * Checks:
 * - Index existence
 * - Retrieves and displays available indices if not found
 *
 * @param client Elasticsearch client instance
 * @param indexName Name of the index to validate
 * @returns Promise resolving to boolean index validation status
 */
async function validateIndex(client, indexName) {
    try {
        // Check if index exists
        const exists = await client.indices.exists({ index: indexName });
        if (!exists.body) {
            // Get list of available indices
            const { body } = await client.cat.indices({ format: 'json', v: true });
            console.log(chalk_1.default.red(`\n❌ Error: Index '${indexName}' does not exist\n\n`));
            process.stdout.write(chalk_1.default.yellow('Available indices:\n'));
            // Filter and sort indices
            const filteredIndices = body
                .filter((idx) => {
                const name = idx.index;
                return !name.startsWith('.') && // Remove system indices
                    !name.endsWith('_arranger_set'); // Remove arranger sets
            })
                .sort((a, b) => a.index.localeCompare(b.index));
            filteredIndices.forEach((idx) => {
                process.stdout.write(chalk_1.default.cyan(`├─ ${idx.index}\n`));
            });
            return false;
        }
        // Get index settings and mappings for additional validation if needed
        await client.indices.get({
            index: indexName,
            include_type_name: false
        });
        // Log index details
        process.stdout.write(chalk_1.default.green('\n✓ ') + chalk_1.default.yellow(`'${indexName}'`) + chalk_1.default.green(' exists and is valid.\n'));
        return true;
    }
    catch (error) {
        process.stdout.write(chalk_1.default.red(`\n❌ Error validating index: ${error}\n\n`));
        return false;
    }
}
async function checkElasticsearchIndex(client, indexName) {
    try {
        const indexExists = await client.indices.exists({
            index: indexName
        });
        if (!indexExists.body) {
            const { body } = await client.cat.indices({
                format: 'json',
                v: true
            });
            process.stdout.write(chalk_1.default.red(`\n❌ Error: Index '${indexName}' does not exist\n\n`));
            process.stdout.write(chalk_1.default.yellow('Available indices:\n'));
            // Filter and sort indices
            const filteredIndices = body
                .filter((idx) => {
                const indexName = idx.index;
                return !indexName.startsWith('.') && // Remove system indices
                    !indexName.endsWith('_arranger_set'); // Remove arranger sets
            })
                .sort((a, b) => a.index.localeCompare(b.index));
            filteredIndices.forEach((idx) => {
                process.stdout.write(chalk_1.default.cyan(`├─ ${idx.index}\n`));
            });
            process.stdout.write(chalk_1.default.yellow('\nPlease specify one of the above indices using the -i option\n'));
            return false;
        }
        process.stdout.write(chalk_1.default.green(`✓ Index '${indexName}' found\n`));
        return true;
    }
    catch (error) {
        process.stdout.write(chalk_1.default.red('\n❌ Error checking Elasticsearch indices: ') + error + '\n\n');
        throw error;
    }
}
/**
 * Validates CSV headers against the existing index mapping
 *
 * @param client Elasticsearch client
 * @param headers Array of CSV headers to validate
 * @param indexName Name of the target Elasticsearch index
 * @returns Promise resolving to boolean indicating header validity
 */
async function validateHeadersMatchMappings(client, headers, indexName) {
    try {
        // Retrieve the current index mapping
        const { body: mappingResponse } = await client.indices.getMapping({
            index: indexName
        });
        // Get the properties (fields) from the mapping
        const mapping = mappingResponse[indexName].mappings;
        const existingFields = Object.keys(mapping.properties || {});
        // Clean headers to remove any potential extra whitespace or empty strings
        const cleanedHeaders = headers
            .map(header => header.trim())
            .filter(header => header !== '');
        if (cleanedHeaders.length === 0) {
            process.stdout.write(chalk_1.default.red('\n❌ No valid headers found\n\n'));
            return false;
        }
        // Find headers in CSV that don't exist in mapping
        const extraHeaders = cleanedHeaders.filter(header => header !== 'submission_metadata' && !existingFields.includes(header));
        // Find required fields from mapping that are missing in CSV
        const missingRequiredFields = existingFields.filter(field => field !== 'submission_metadata' && !cleanedHeaders.includes(field));
        let hasValidationErrors = false;
        if (extraHeaders.length > 0 || missingRequiredFields.length > 0) {
            process.stdout.write(chalk_1.default.red('\n❌ Header/Field Mismatch Detected:\n\n'));
            hasValidationErrors = true;
            // CSV Headers (with matched and mismatched)
            process.stdout.write(chalk_1.default.yellow.bold.underline('CSV headers:\n\n'));
            cleanedHeaders.forEach(header => {
                const matchStatus = existingFields.includes(header)
                    ? chalk_1.default.green('✓ ')
                    : chalk_1.default.red('✗ ');
                process.stdout.write(matchStatus + header + '\n');
            });
            // Missing Required Fields
            if (missingRequiredFields.length > 0) {
                process.stdout.write(chalk_1.default.yellow.bold.underline('\nMissing required headers in CSV:\n\n'));
                missingRequiredFields.forEach(field => {
                    process.stdout.write(chalk_1.default.red(`✗`) + chalk_1.default.white(` ${field}\n`));
                });
            }
            // Extra Fields
            if (extraHeaders.length > 0) {
                process.stdout.write(chalk_1.default.yellow.bold.underline('\nUnexpected headers in CSV:\n\n'));
                extraHeaders.forEach(field => {
                    process.stdout.write(chalk_1.default.red(`✗`) + chalk_1.default.white(` ${field}\n`));
                });
            }
            return false;
        }
        process.stdout.write(chalk_1.default.green('✓ All headers validated against the index mapping\n\n'));
        return true;
    }
    catch (error) {
        process.stdout.write(chalk_1.default.red('\n❌ Error validating headers against index:\n\n'));
        console.error(error);
        return false;
    }
}
/**
 * Validates CSV delimiter configuration
 *
 * Checks:
 * - Delimiter is a single character
 *
 * @param delimiter Delimiter to validate
 * @returns Boolean indicating if delimiter is valid
 */
function validateDelimiter(delimiter) {
    if (!delimiter || delimiter.length !== 1) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: Invalid delimiter\n\n'));
        process.stdout.write(chalk_1.default.yellow('Delimiter must be a single character\n'));
        return false;
    }
    return true;
}
