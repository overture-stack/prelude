import { Profiles, CLIModes } from "./constants";
import { ArrangerConfig } from "./arranger";

export type Profile = (typeof Profiles)[keyof typeof Profiles];
export type CLIMode = (typeof CLIModes)[keyof typeof CLIModes];

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
