"use strict";
/**
 * Common Validation Utilities
 *
 * Simple validators for common primitive values and configurations.
 * Updated to use error factory pattern for consistent error handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDelimiter = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
/**
 * Validates that a delimiter is a single character
 */
function validateDelimiter(delimiter) {
    if (!delimiter || delimiter.length !== 1) {
        throw errors_1.ErrorFactory.validation("Delimiter must be a single character", {
            provided: delimiter,
            length: (delimiter === null || delimiter === void 0 ? void 0 : delimiter.length) || 0,
            type: typeof delimiter,
        }, [
            "Use a single character as delimiter",
            "Common delimiters: , (comma), ; (semicolon), \\t (tab)",
            "Example: --delimiter ,",
        ]);
    }
    logger_1.Logger.debug `Delimiter validated: '${delimiter}'`;
}
exports.validateDelimiter = validateDelimiter;
