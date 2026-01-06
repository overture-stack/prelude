"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnvironmentConfig = loadEnvironmentConfig;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const paths_1 = require("../utils/paths");
/**
 * Maps config key to environment variable name
 * Added support for Lectern dictionary options
 */
const ENV_VAR_MAP = {
    // Input files
    inputFiles: "FILES",
    // Output paths
    outputPath: "OUTPUT_PATH",
    // Lectern Dictionary options
    dictionaryName: "DICTIONARY_NAME",
    dictionaryDescription: "DICTIONARY_DESC",
    dictionaryVersion: "DICTIONARY_VERSION",
    // Song Schema options
    schemaName: "SCHEMA_NAME",
    fileTypes: "FILE_TYPES",
    // Elasticsearch options
    esIndex: "ES_INDEX",
    esShards: "ES_SHARDS",
    esReplicas: "ES_REPLICAS",
    esIgnoredFields: "ES_IGNORED_FIELDS",
    esIgnoredSchemas: "ES_IGNORED_SCHEMAS", // NEW: Environment variable for ignored schemas
    esSkipMetadata: "ES_SKIP_METADATA",
    // CSV options
    csvDelimiter: "CSV_DELIMITER",
    // Arranger options
    arrangerDocType: "ARRANGER_DOC_TYPE",
    // PostgreSQL options
    postgresTableName: "POSTGRES_TABLE_NAME",
};
/**
 * Enhanced environment configuration with Lectern dictionary support
 */
function loadEnvironmentConfig() {
    try {
        logger_1.Logger.debug `Loading environment configuration`;
        const config = {
            // Input and output
            inputFiles: process.env.FILES?.split(",").map((f) => f.trim()),
            outputPath: process.env.OUTPUT_PATH || paths_1.BASE_CONFIG_DIR,
            // Lectern Dictionary options
            dictionaryName: process.env.DICTIONARY_NAME || "lectern_dictionary",
            dictionaryDescription: process.env.DICTIONARY_DESC || "Generated dictionary from CSV files",
            dictionaryVersion: process.env.DICTIONARY_VERSION || "1.0.0",
            // Song Schema options
            schemaName: process.env.SCHEMA_NAME || "song_schema",
            fileTypes: process.env.FILE_TYPES?.split(/\s+/),
            // Elasticsearch options
            esIndex: process.env.ES_INDEX || "data",
            esShards: parseInt(process.env.ES_SHARDS || "1", 10),
            esReplicas: parseInt(process.env.ES_REPLICAS || "1", 10),
            esIgnoredFields: process.env.ES_IGNORED_FIELDS?.split(/\s+/),
            esIgnoredSchemas: process.env.ES_IGNORED_SCHEMAS?.split(/\s+/), // NEW: Parse ignored schemas
            esSkipMetadata: process.env.ES_SKIP_METADATA?.toLowerCase() === "true",
            // CSV options
            csvDelimiter: process.env.CSV_DELIMITER || ",",
            // Arranger options
            arrangerDocType: process.env.ARRANGER_DOC_TYPE || "file",
            // PostgreSQL options
            postgresTableName: process.env.POSTGRES_TABLE_NAME,
        };
        // Log overridden defaults
        Object.entries(config).forEach(([key, value]) => {
            const envVar = ENV_VAR_MAP[key];
            if (process.env[envVar]) {
                logger_1.Logger.debug `Using custom ${key}: ${value}`;
            }
        });
        logger_1.Logger.debugObject("Environment configuration", config);
        return config;
    }
    catch (error) {
        throw errors_1.ErrorFactory.environment("Failed to load environment configuration", error, [
            "Check that environment variables are properly formatted",
            "Ensure numeric values (like ES_SHARDS) are valid integers",
            "Verify file paths are accessible",
            "For space-separated lists (like ES_IGNORED_SCHEMAS), use proper formatting",
        ]);
    }
}
//# sourceMappingURL=environment.js.map