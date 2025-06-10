// src/types/cli.ts - Update to match the CLI profile type

import { Profiles } from "./constants";

export type Profile = (typeof Profiles)[keyof typeof Profiles];

export interface Config {
  elasticsearch: {
    url: string;
    user?: string;
    password?: string;
    index: string;
    templateFile?: string;
    templateName?: string;
    alias?: string;
  };
  lectern?: {
    url?: string;
    authToken?: string;
  };
  lyric?: {
    url?: string;
    categoryName?: string;
    dictionaryName?: string;
    dictionaryVersion?: string;
    defaultCentricEntity?: string;
    dataDirectory?: string;
    categoryId?: string;
    organization?: string;
    maxRetries?: number;
    retryDelay?: number;
  };
  song?: {
    url?: string;
    authToken?: string;
    schemaFile?: string;
    studyId?: string;
    studyName?: string;
    organization?: string;
    description?: string;
    analysisFile?: string;
    allowDuplicates?: boolean;
    ignoreUndefinedMd5?: boolean;
    // Combined Score functionality (now part of song config)
    scoreUrl?: string;
    dataDir?: string;
    outputDir?: string;
    manifestFile?: string;
  };
  maestroIndex?: {
    url?: string;
    repositoryCode?: string;
    organization?: string;
    id?: string;
  };
  batchSize: number;
  delimiter: string;
}

export interface CLIOutput {
  profile: Profile; // Use the Profile type from constants
  debug?: boolean;
  filePaths: string[];
  config: Config;
  outputPath?: string;
  envConfig: EnvConfig;
  options: any; // Allows for flexible option handling
}

export interface EnvConfig {
  elasticsearchUrl: string;
  esUser?: string;
  esPassword?: string;
  indexName?: string;
  lecternUrl?: string;
  lyricUrl?: string;
  songUrl?: string;
  lyricData?: string;
  categoryId?: string;
  organization?: string;
}
