// src/cli/environment.ts - Simplified
import { EnvConfig } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";
import { BASE_CONFIG_DIR } from "../utils/paths";

/**
 * Maps config key to environment variable name
 * Removed legacy/unused variables
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
  esSkipMetadata: "ES_SKIP_METADATA",

  // CSV options
  csvDelimiter: "CSV_DELIMITER",

  // Arranger options
  arrangerDocType: "ARRANGER_DOC_TYPE",
};

/**
 * Simplified environment configuration
 * Removed legacy variables that are no longer used
 */
export function loadEnvironmentConfig(): EnvConfig {
  try {
    Logger.debug("Loading environment configuration");

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
        Logger.debug(`Using custom ${key}: ${value}`);
      }
    });

    Logger.debugObject("Environment configuration", config);
    return config;
  } catch (error) {
    if (error instanceof ComposerError) throw error;
    throw new ComposerError(
      "Failed to load environment configuration",
      ErrorCodes.ENV_ERROR,
      error
    );
  }
}
