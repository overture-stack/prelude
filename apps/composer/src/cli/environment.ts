import { EnvConfig } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";

const DEFAULT_CONFIG = {
  fileMetadataSample: "data/sampleData/fileMetadata.json",
  tabularSample: "data/tabularData.csv",
  songSchema: "configs/songSchema",
  lecternDictionary: "configs/lecternDictionaries",
  esConfigDir: "configs/elasticsearchConfigs",
  arrangerConfigDir: "configs/arrangerConfigs",
} as const;

/**
 * Maps config key to environment variable name
 */
const ENV_VAR_MAP: Record<keyof EnvConfig, string> = {
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
      // Optional environment variables
      dataFile: process.env.TABULAR_DATA_FILE,
      indexName: process.env.TABULAR_INDEX_NAME,

      // Variables with defaults
      fileMetadataSample:
        process.env.FILE_METADATA_SAMPLE || DEFAULT_CONFIG.fileMetadataSample,
      tabularSample: process.env.TABULAR_SAMPLE || DEFAULT_CONFIG.tabularSample,
      songSchema: process.env.GENERATE_SONG_SCHEMA || DEFAULT_CONFIG.songSchema,
      lecternDictionary:
        process.env.LECTERN_DICTIONARY || DEFAULT_CONFIG.lecternDictionary,
      esConfigDir: process.env.ES_CONFIG_DIR || DEFAULT_CONFIG.esConfigDir,
      arrangerConfigDir:
        process.env.ARRANGER_CONFIG_DIR || DEFAULT_CONFIG.arrangerConfigDir,
    };

    // Log overridden defaults
    (Object.entries(config) as [keyof EnvConfig, string | undefined][]).forEach(
      ([key, value]) => {
        const envVar = ENV_VAR_MAP[key];
        if (process.env[envVar]) {
          Logger.debug(`Using custom ${key}: ${value}`);
        }
      }
    );

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
