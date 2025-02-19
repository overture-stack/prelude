export const Profiles = {
  GENERATE_SONG_SCHEMA: "songSchema",
  GENERATE_LECTERN_DICTIONARY: "generateLecternDictionary",
  GENERATE_ELASTICSEARCH_MAPPING: "generateElasticSearchMapping",
  GENERATE_ARRANGER_CONFIGS: "generateArrangerConfigs",
  GENERATE_CONFIGS: "generateConfigs",
  DEFAULT: "default",
} as const;

export const CLIModes = {
  DICTIONARY: "dictionary",
  SONG: "song",
  MAPPING: "mapping",
  ARRANGER: "arranger",
  ALL: "all",
} as const;
