// src/cli/environment.ts - Updated with Lectern dictionary support
import { EnvConfig } from "../types";
import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";
import { BASE_CONFIG_DIR } from "../utils/paths";

/**
 * Maps config key to environment variable name
 * Added support for Lectern dictionary options
 */
const ENV_VAR_MAP: Record<keyof EnvConfig, string> = {
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
};

/**
 * Enhanced environment configuration with Lectern dictionary support
 */
export function loadEnvironmentConfig(): EnvConfig {
  try {
    Logger.debug`Loading environment configuration`;

    const config: EnvConfig = {
      // Input and output
      inputFiles: process.env.FILES?.split(",").map((f) => f.trim()),
      outputPath: process.env.OUTPUT_PATH || BASE_CONFIG_DIR,

      // Lectern Dictionary options
      dictionaryName: process.env.DICTIONARY_NAME || "lectern_dictionary",
      dictionaryDescription:
        process.env.DICTIONARY_DESC || "Generated dictionary from CSV files",
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
    };

    // Log overridden defaults
    Object.entries(config).forEach(([key, value]) => {
      const envVar = ENV_VAR_MAP[key as keyof EnvConfig];
      if (process.env[envVar]) {
        Logger.debug`Using custom ${key}: ${value}`;
      }
    });

    Logger.debugObject("Environment configuration", config);
    return config;
  } catch (error) {
    throw ErrorFactory.environment(
      "Failed to load environment configuration",
      error,
      [
        "Check that environment variables are properly formatted",
        "Ensure numeric values (like ES_SHARDS) are valid integers",
        "Verify file paths are accessible",
        "For space-separated lists (like ES_IGNORED_SCHEMAS), use proper formatting",
      ]
    );
  }
}
