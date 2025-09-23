// src/types/cli.ts - Updated to include Lectern dictionary support
import { Profiles } from "./profiles";
import { ArrangerConfig } from "./arranger";
import { PostgresConfig } from "./postgres"; // IMPORT FROM POSTGRES TYPES

export type Profile = (typeof Profiles)[keyof typeof Profiles];

// Core configuration interfaces
export interface ElasticsearchConfig {
  index: string;
  shards: number;
  replicas: number;
  ignoredFields?: string[];
  ignoredSchemas?: string[]; // NEW: Support for ignoring schemas in Lectern dictionaries
  skipMetadata?: boolean;
}

export interface DictionaryConfig {
  name: string;
  description: string;
  version: string;
}

export interface SongConfig {
  name?: string;
  fileTypes?: string[];
}

// Simplified environment config
export interface EnvConfig {
  // Input files
  inputFiles?: string[];

  // Output paths
  outputPath?: string;

  // Lectern Dictionary options
  dictionaryName?: string;
  dictionaryDescription?: string;
  dictionaryVersion?: string;

  // Song Schema options
  schemaName?: string;
  fileTypes?: string[];

  // Elasticsearch options
  esIndex?: string;
  esShards?: number;
  esReplicas?: number;
  esIgnoredFields?: string[];
  esIgnoredSchemas?: string[];
  esSkipMetadata?: boolean;

  // CSV options
  csvDelimiter?: string;

  // Arranger options
  arrangerDocType?: string;

  // PostgreSQL options
  postgresTableName?: string;
}

// Main CLI output interface with PostgreSQL support
export interface CLIOutput {
  profile: Profile;
  debug?: boolean;
  filePaths: string[];
  force?: boolean;
  outputPath?: string;
  envConfig: EnvConfig;

  // Direct configuration access - flattened for easier use
  elasticsearchConfig: ElasticsearchConfig;
  csvDelimiter: string;

  // Command-specific configs (optional)
  dictionaryConfig?: DictionaryConfig;
  songConfig?: SongConfig;
  postgresConfig?: PostgresConfig; // USES IMPORTED TYPE
  arrangerConfig?: ArrangerConfig;
}
