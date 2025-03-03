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
  batchSize: number;
  delimiter: string;
}

export interface CLIOutput {
  profile: Profile;
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
  lyricData?: string;
  categoryId?: string;
  organization?: string;
}

export interface UploadOptions {
  files: string[];
  index?: string;
  batchSize?: number;
  delimiter?: string;
}

export interface indexManagementOptions {
  templateFile: string;
  templateName: string;
  indexName: string;
  aliasName?: string;
}

export interface LyricDataOptions {
  lyricUrl?: string;
  lecternUrl?: string;
  dataDirectory?: string;
  categoryId?: string;
  organization?: string;
  maxRetries?: number;
  retryDelay?: number;
}
