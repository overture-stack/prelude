// src/types/profiles.ts - Complete profiles definition
export const Profiles = {
  GENERATE_SONG_SCHEMA: "SongSchema",
  GENERATE_LECTERN_DICTIONARY: "LecternDictionary",
  GENERATE_ELASTICSEARCH_MAPPING: "ElasticsearchMapping",
  GENERATE_ARRANGER_CONFIGS: "ArrangerConfigs",
  GENERATE_CONFIGS: "GenerateConfigs", // Added missing property
  DEFAULT: "default", // Added missing property
} as const;

export type Profile = (typeof Profiles)[keyof typeof Profiles];
