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
    analysisPath?: string;
    allowDuplicates?: boolean;
    ignoreUndefinedMd5?: boolean;
  };
  score?: {
    url?: string;
    authToken?: string;
    analysisId?: string;
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
  songUrl?: string;
  scoreUrl?: string;
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

export interface IndexManagementOptions {
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

export interface SongStudyOptions {
  songUrl?: string;
  studyId?: string;
  studyName?: string;
  organization?: string;
  description?: string;
  authToken?: string;
  force?: boolean;
}

export interface SongAnalysisOptions {
  songUrl?: string;
  analysisFile: string;
  studyId?: string;
  allowDuplicates?: boolean;
  authToken?: string;
  force?: boolean;
}

export interface ScoreManifestOptions {
  analysisId: string;
  dataDir?: string;
  outputDir?: string;
  manifestFile?: string;
  songUrl?: string;
  scoreUrl?: string;
  authToken?: string;
}

export interface SongPublishOptions {
  analysisId: string;
  studyId?: string;
  songUrl?: string;
  authToken?: string;
  ignoreUndefinedMd5?: boolean;
}

export interface SongScoreSubmitOptions {
  analysisPath: string;
  studyId?: string;
  dataDir?: string;
  outputDir?: string;
  manifestFile?: string;
  songUrl?: string;
  scoreUrl?: string;
  authToken?: string;
  ignoreUndefinedMd5?: boolean;
}
