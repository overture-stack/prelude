import { EnvConfig } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";

/**
 * Loads and validates environment configuration
 * Provides defaults for unset environment variables
 */
export function loadEnvironmentConfig(): EnvConfig {
  try {
    return {
      dataFile: process.env.TABULAR_DATA_FILE,
      indexName: process.env.TABULAR_INDEX_NAME,
      fileMetadataSample:
        process.env.FILE_METADATA_SAMPLE || "data/sampleData/fileMetadata.json",
      tabularSample: process.env.TABULAR_SAMPLE || "data/tabularData.csv",
      songSchema: process.env.GENERATE_SONG_SCHEMA || "configs/songSchema",
      lecternDictionary:
        process.env.LECTERN_DICTIONARY || "configs/lecternDictionaries",
      esConfigDir: process.env.ES_CONFIG_DIR || "configs/elasticsearchConfigs",
      arrangerConfigDir:
        process.env.ARRANGER_CONFIG_DIR || "configs/arrangerConfigs",
    };
  } catch (error) {
    if (error instanceof ComposerError) throw error;
    throw new ComposerError(
      "Failed to load environment configuration",
      ErrorCodes.ENV_ERROR,
      error
    );
  }
}
