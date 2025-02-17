export type Profile =
  | "songSchema"
  | "generateLecternDictionary"
  | "generateElasticSearchMapping"
  | "generateArrangerConfigs"
  | "generateConfigs"
  | "default";

export type CLIMode =
  | "dictionary"
  | "song"
  | "upload"
  | "mapping"
  | "arranger"
  | "all";

export interface Config {
  elasticsearch: {
    index: string;
  };
  batchSize: number;
  delimiter: string;
  mappingOutput?: string;
  mappingsDirectory?: string;
  input?: Record<string, string>;
}

export interface CLIOutput {
  profile: Profile;
  mode: CLIMode;
  filePaths: string[];
  config: Config;
  outputPath?: string;
  arrangerConfigDir?: string;
  envConfig: EnvConfig;
  dictionaryConfig?: {
    name: string;
    description: string;
    version: string;
  };
  songConfig?: {
    name: string;
    fileTypes?: string[];
  };
}

export interface EnvConfig {
  composerPath: string;
  dataFile?: string;
  indexName?: string;
  fileMetadataSample?: string;
  tabularSample?: string;
  lyricUploadDirectory?: string;
  songUploadDirectory?: string;
  defaultStudyId?: string;
  songSchema?: string;
  lecternDictionary?: string;
  esConfigDir?: string;
  arrangerConfigDir?: string;
}

export const Profiles = {
  SONG_SCHEMA: "songSchema",
  GENERATE_LECTERN_DICTIONARY: "generateLecternDictionary",
  GENERATE_ELASTICSEARCH_MAPPING: "generateElasticSearchMapping",
  GENERATE_ARRANGER_CONFIGS: "generateArrangerConfigs",
  GENERATE_CONFIGS: "generateConfigs",
  DEFAULT: "default",
} as const;

export const CLIModes = {
  DICTIONARY: "dictionary",
  SONG: "song",
  UPLOAD: "upload",
  MAPPING: "mapping",
  ARRANGER: "arranger",
  ALL: "all",
} as const;

const types = {
  Profiles,
  CLIModes,
};

export default types;
