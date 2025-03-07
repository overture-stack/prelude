import { EnvConfig } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";
import { BASE_CONFIG_DIR } from "../utils/paths";

/**
 * Maps config key to environment variable name
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

  // CSV options
  csvDelimiter: "CSV_DELIMITER",

  // Arranger options
  arrangerDocType: "ARRANGER_DOC_TYPE",
};

/**
 * Loads and validates environment configuration with defaults
 */
export function loadEnvironmentConfig(): EnvConfig {
  try {
    Logger.debug("Loading environment configuration");

    const config: EnvConfig = {
      // Core variables aligned with Docker Compose
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

      // CSV options
      csvDelimiter: process.env.CSV_DELIMITER || ",",

      // Arranger options
      arrangerDocType: process.env.ARRANGER_DOC_TYPE || "file",
    };

    // Log overridden defaults
    Object.entries(config).forEach(([key, value]) => {
      if (key in ENV_VAR_MAP) {
        const envVar = ENV_VAR_MAP[key as keyof typeof ENV_VAR_MAP];
        if (process.env[envVar]) {
          Logger.debug(`Using custom ${key}: ${value}`);
        }
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
