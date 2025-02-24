import { Profiles } from "./constants";
import { ArrangerConfig } from "./arranger";

export type Profile = (typeof Profiles)[keyof typeof Profiles];

export interface Config {
  elasticsearch: {
    index: string;
    shards: number;
    replicas: number;
  };
  delimiter: string;
}

export interface CLIOutput {
  profile: Profile;
  debug?: boolean;
  filePaths: string[];
  force?: boolean;
  config: Config;
  outputPath?: string;
  outputPathProvided?: boolean; // Added this property
  arrangerConfigDir?: string;
  envConfig: EnvConfig;
  delimiter?: string;
  dictionaryConfig?: {
    name: string;
    description: string;
    version: string;
  };
  songConfig?: {
    name?: string;
    fileTypes?: string[];
  };
  arrangerConfig?: ArrangerConfig;
}

export interface EnvConfig {
  dataFile?: string;
  indexName?: string;
  fileMetadataSample: string;
  tabularSample: string;
  songSchema: string;
  lecternDictionary: string;
  esConfigDir: string;
  arrangerConfigDir: string;
}
