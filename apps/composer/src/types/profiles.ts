export const Profiles = {
  GENERATE_SONG_SCHEMA: "song-schema",
  GENERATE_LECTERN_DICTIONARY: "lectern-dictionary",
  GENERATE_ELASTICSEARCH_MAPPING: "elasticsearch-mapping",
  GENERATE_ARRANGER_CONFIGS: "arranger-configs",
  GENERATE_POSTGRES_TABLE: "postgres-table",
} as const;

export type Profile = (typeof Profiles)[keyof typeof Profiles];
