import * as path from "path";
import { Profile, Profiles } from "../types";

/**
 * Base directory for all configuration files
 */
export const BASE_CONFIG_DIR = "generatedConfigs";

/**
 * Config type definitions for type safety
 */
type ConfigType = "song" | "lectern" | "elasticsearch" | "arranger";

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

/**
 * Gets directory path for the specified config type
 */
export function getConfigDir(configType: ConfigType): string {
  return CONFIG_PATHS[configType].dir;
}

/**
 * Gets file path within a config directory
 */
export function getConfigFilePath(
  configType: ConfigType,
  filename: string
): string {
  return path.join(getConfigDir(configType), filename);
}

/**
 * Maps profile to its corresponding config type
 */
export function getConfigTypeForProfile(profile: Profile): ConfigType | null {
  switch (profile) {
    case Profiles.GENERATE_SONG_SCHEMA:
      return "song";
    case Profiles.GENERATE_LECTERN_DICTIONARY:
      return "lectern";
    case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
      return "elasticsearch";
    case Profiles.GENERATE_ARRANGER_CONFIGS:
      return "arranger";
    default:
      return null;
  }
}

/**
 * Gets default output path for a specific profile
 */
export function getDefaultOutputPathForProfile(
  profile: Profile
): string | undefined {
  const configType = getConfigTypeForProfile(profile);

  if (!configType) {
    return undefined;
  }

  switch (configType) {
    case "song":
      return CONFIG_PATHS.song.schema;
    case "lectern":
      return CONFIG_PATHS.lectern.dictionary;
    case "elasticsearch":
      return CONFIG_PATHS.elasticsearch.mapping;
    case "arranger":
      return CONFIG_PATHS.arranger.configs;
    default:
      return undefined;
  }
}
