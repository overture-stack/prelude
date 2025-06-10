// src/utils/paths.ts - Removed unused getConfigTypeForProfile function
import * as path from "path";

/**
 * Base directory for all configuration files
 */
export const BASE_CONFIG_DIR = "generatedConfigs";

/**
 * Configuration paths organized by type
 */
export const CONFIG_PATHS = {
  song: {
    dir: path.join(BASE_CONFIG_DIR, "songSchema"),
    schema: path.join(BASE_CONFIG_DIR, "songSchema", "songSchema.json"),
  },
  lectern: {
    dir: path.join(BASE_CONFIG_DIR, "lecternDictionaries"),
    dictionary: path.join(
      BASE_CONFIG_DIR,
      "lecternDictionaries",
      "dictionary.json"
    ),
  },
  elasticsearch: {
    dir: path.join(BASE_CONFIG_DIR, "elasticsearchConfigs"),
    mapping: path.join(BASE_CONFIG_DIR, "elasticsearchConfigs", "mapping.json"),
  },
  arranger: {
    dir: path.join(BASE_CONFIG_DIR, "arrangerConfigs"),
    configs: path.join(BASE_CONFIG_DIR, "arrangerConfigs", "configs"),
  },
  samples: {
    fileMetadata: "data/sampleData/fileMetadata.json",
    tabular: "data/tabularData.csv",
  },
} as const;
