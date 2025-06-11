// src/types/cli.ts - Updated to remove unused exports

import { Profiles } from "./constants";

// Keep this as it's used by commands (but don't export it)
type Profile = (typeof Profiles)[keyof typeof Profiles];

// Keep main config interface (used throughout)
interface Config {
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

// Keep this as it's used in CLI setup
interface CLIOutput {
  profile: string;
  debug?: boolean;
  filePaths: string[];
  config: Config;
  outputPath?: string;
  envConfig: any; // Simplified - we can remove EnvConfig interface
  options: any;
}

// Export only what's actually used externally
export { Config, CLIOutput };
