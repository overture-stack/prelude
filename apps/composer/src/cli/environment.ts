import { EnvConfig } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";
import {
  CONFIG_PATHS,
  BASE_CONFIG_DIR,
  getDefaultOutputPathForProfile,
} from "../utils/paths";

/**
 * Maps config key to environment variable name
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
  esSkipMetadata: "ES_SKIP_METADATA", // Added environment variable for skip metadata option

  // CSV options
  csvDelimiter: "CSV_DELIMITER",

  // Arranger options
  arrangerDocType: "ARRANGER_DOC_TYPE",

  // Legacy variables
  dataFile: "TABULAR_DATA_FILE",
  indexName: "TABULAR_INDEX_NAME",
  fileMetadataSample: "FILE_METADATA_SAMPLE",
  tabularSample: "TABULAR_SAMPLE",
  songSchema: "GENERATE_SONG_SCHEMA",
  lecternDictionary: "LECTERN_DICTIONARY",
  esConfigDir: "ES_CONFIG_DIR",
  arrangerConfigDir: "ARRANGER_CONFIG_DIR",
};

/**
 * Loads and validates environment configuration with defaults
 */
export function loadEnvironmentConfig(): EnvConfig {
  try {
    Logger.debug("Loading environment configuration");

    const config: EnvConfig = {
      // New variables aligned with Docker Compose
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
      // Parse boolean environment variable
      esSkipMetadata: process.env.ES_SKIP_METADATA?.toLowerCase() === "true",

      // CSV options
      csvDelimiter: process.env.CSV_DELIMITER || ",",

      // Arranger options
      arrangerDocType: process.env.ARRANGER_DOC_TYPE || "file",

      // Maintain backward compatibility with old variables
      dataFile: process.env.TABULAR_DATA_FILE,
      indexName: process.env.TABULAR_INDEX_NAME,
      fileMetadataSample:
        process.env.FILE_METADATA_SAMPLE || CONFIG_PATHS.samples.fileMetadata,
      tabularSample: process.env.TABULAR_SAMPLE || CONFIG_PATHS.samples.tabular,
      songSchema: process.env.GENERATE_SONG_SCHEMA || CONFIG_PATHS.song.dir,
      lecternDictionary:
        process.env.LECTERN_DICTIONARY || CONFIG_PATHS.lectern.dir,
      esConfigDir: process.env.ES_CONFIG_DIR || CONFIG_PATHS.elasticsearch.dir,
      arrangerConfigDir:
        process.env.ARRANGER_CONFIG_DIR || CONFIG_PATHS.arranger.dir,
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
