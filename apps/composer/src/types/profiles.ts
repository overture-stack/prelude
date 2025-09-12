// src/types/profiles.ts - Updated with PostgreSQL profile
export const Profiles = {
  GENERATE_SONG_SCHEMA: "SongSchema",
  GENERATE_LECTERN_DICTIONARY: "LecternDictionary",
  GENERATE_ELASTICSEARCH_MAPPING: "ElasticsearchMapping",
  GENERATE_ARRANGER_CONFIGS: "ArrangerConfigs",
  GENERATE_POSTGRES_TABLE: "PostgresTable", // NEW PROFILE
  GENERATE_CONFIGS: "GenerateConfigs",
  DEFAULT: "default",
} as const;

export type Profile = (typeof Profiles)[keyof typeof Profiles];
