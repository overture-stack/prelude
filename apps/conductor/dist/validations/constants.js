"use strict";
/**
 * Validation Constants
 *
 * Shared constants used throughout the validation system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_CONSTANTS = exports.ALLOWED_EXTENSIONS = void 0;
/**
 * Allowed file extensions for processing
 */
exports.ALLOWED_EXTENSIONS = [".csv", ".tsv"];
exports.VALIDATION_CONSTANTS = {
    INVALID_CHARS: ["$", "%", "^", "&"],
    MAX_HEADER_LENGTH: 50,
    RESERVED_WORDS: ["null", "undefined", "class", "function"],
    GRAPHQL_NAME_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
};
