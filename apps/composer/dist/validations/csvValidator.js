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
exports.validateCSVHeaders = validateCSVHeaders;
const fs = __importStar(require("fs"));
const errors_1 = require("../utils/errors");
const csvParser_1 = require("../utils/csvParser");
const logger_1 = require("../utils/logger");
/**
 * Validates the header structure of a CSV file.
 * Reads the first line of the file and validates the headers.
 *
 * @param filePath - Path to the CSV file
 * @param delimiter - Character used to separate values in the CSV
 * @returns Promise resolving to true if headers are valid
 * @throws ComposerError if headers are invalid or file can't be read
 */
async function validateCSVHeaders(filePath, delimiter) {
    try {
        logger_1.Logger.debug `Validating CSV headers for file: ${filePath}`;
        logger_1.Logger.debug `Using delimiter: '${delimiter}'`;
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const [headerLine] = fileContent.split("\n");
        if (!headerLine) {
            logger_1.Logger.debug `CSV file is empty or has no headers`;
            throw errors_1.ErrorFactory.file("CSV file is empty or has no headers", filePath, [
                "Ensure the CSV file contains at least one row of headers",
                "Check that the file is not corrupted",
                "Verify the file encoding is UTF-8",
            ]);
        }
        const headers = (0, csvParser_1.parseCSVLine)(headerLine, delimiter, true)[0];
        if (!headers) {
            logger_1.Logger.debug `Failed to parse CSV headers`;
            throw errors_1.ErrorFactory.file("Failed to parse CSV headers", filePath, [
                "Check that the delimiter is correct",
                "Ensure headers don't contain unescaped quotes",
                "Verify the CSV format is valid",
            ]);
        }
        logger_1.Logger.debug `Parsed headers: ${headers.join(", ")}`;
        return validateCSVStructure(headers);
    }
    catch (error) {
        logger_1.Logger.debug `Error during CSV header validation`;
        logger_1.Logger.debugObject("Error details", error);
        if (error instanceof Error && error.name === "ComposerError") {
            throw error;
        }
        throw errors_1.ErrorFactory.validation("Error validating CSV headers", error, [
            "Check that the file exists and is readable",
            "Verify the CSV format is correct",
            "Ensure proper file permissions",
        ]);
    }
}
/**
 * Validates CSV headers against naming conventions and rules.
 * Checks:
 * - Special character restrictions
 * - Maximum length limits
 * - Reserved word restrictions
 * - GraphQL naming conventions
 * - Duplicate prevention
 *
 * @param headers - Array of header strings to validate
 * @returns Promise resolving to true if all headers are valid
 * @throws ComposerError with details if validation fails
 */
async function validateCSVStructure(headers) {
    try {
        logger_1.Logger.debug `Starting CSV structure validation`;
        // Clean and filter headers
        const cleanedHeaders = headers
            .map((header) => header.trim())
            .filter((header) => header !== "");
        // Validate basic header presence
        if (cleanedHeaders.length === 0) {
            logger_1.Logger.debug `No valid headers found in CSV file`;
            throw errors_1.ErrorFactory.validation("No valid headers found in CSV file", undefined, [
                "Ensure the first row contains column headers",
                "Check that headers are not empty or whitespace-only",
                "Verify the CSV format is correct",
            ]);
        }
        if (cleanedHeaders.length !== headers.length) {
            logger_1.Logger.debug `Empty or whitespace-only headers detected`;
            throw errors_1.ErrorFactory.validation("Empty or whitespace-only headers detected", { originalCount: headers.length, cleanedCount: cleanedHeaders.length }, [
                "Remove empty header columns",
                "Ensure all headers have meaningful names",
                "Check for trailing commas in the header row",
            ]);
        }
        // Define validation rules
        const invalidChars = [
            ":",
            ">",
            "<",
            ".",
            " ",
            ",",
            "/",
            "\\",
            "?",
            "#",
            "[",
            "]",
            "{",
            "}",
            '"',
            "*",
            "|",
            "+",
            "@",
            "&",
            "(",
            ")",
            "!",
            "^",
        ];
        const maxLength = 255;
        const reservedWords = [
            "_type",
            "_id",
            "_source",
            "_all",
            "_parent",
            "_field_names",
            "_routing",
            "_index",
            "_size",
            "_timestamp",
            "_ttl",
            "_meta",
            "_doc",
            "__typename",
            "__schema",
            "__type",
        ];
        const graphqlNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
        // Validate headers against all rules
        const invalidHeaders = cleanedHeaders.filter((header) => {
            const hasInvalidChars = invalidChars.some((char) => header.includes(char));
            const isTooLong = Buffer.from(header).length > maxLength;
            const isReserved = reservedWords.includes(header.toLowerCase());
            const isValidGraphQLName = graphqlNamePattern.test(header);
            return hasInvalidChars || isTooLong || isReserved || !isValidGraphQLName;
        });
        if (invalidHeaders.length > 0) {
            logger_1.Logger.debug `Invalid headers detected: ${invalidHeaders.join(", ")}`;
            // Don't log the file list here - let the command handle it
            throw errors_1.ErrorFactory.validation("Invalid header names detected", { invalidHeaders }, [
                "Use only letters, numbers, and underscores in header names",
                "Headers must start with a letter or underscore",
                "Avoid reserved words like _id, _type, etc.",
                "Remove special characters and spaces from headers",
                `Keep header names under ${maxLength} characters`,
                `Invalid headers: ${invalidHeaders.join(", ")}`,
            ]);
        }
        // Check for duplicate headers
        const headerCounts = cleanedHeaders.reduce((acc, header) => {
            acc[header] = (acc[header] || 0) + 1;
            return acc;
        }, {});
        const duplicates = Object.entries(headerCounts)
            .filter(([_, count]) => count > 1)
            .map(([header, _]) => header);
        if (duplicates.length > 0) {
            logger_1.Logger.debug `Duplicate headers found: ${duplicates.join(", ")}`;
            throw errors_1.ErrorFactory.validation("Duplicate headers found in CSV file", { duplicates, counts: headerCounts }, [
                "Ensure all column headers are unique",
                "Remove or rename duplicate headers",
                "Check for accidentally repeated columns",
                `Duplicate headers: ${duplicates.join(", ")}`,
            ]);
        }
        logger_1.Logger.debug `CSV header structure is valid`;
        return true;
    }
    catch (error) {
        logger_1.Logger.debug `Error during CSV structure validation`;
        logger_1.Logger.debugObject("Error details", error);
        if (error instanceof Error && error.name === "ComposerError") {
            throw error;
        }
        throw errors_1.ErrorFactory.validation("Error validating CSV structure", error, [
            "Check the CSV file format",
            "Verify headers follow naming conventions",
            "Ensure no duplicate or invalid headers",
        ]);
    }
}
//# sourceMappingURL=csvValidator.js.map