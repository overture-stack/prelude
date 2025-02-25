/**
 * CLI Types
 *
 * Type definitions for the command-line interface.
 */

import { Config, EnvConfig } from "./config";

/**
 * Supported CLI operation modes
 */
export type CLIMode = "upload";

/**
 * Output from CLI parsing and setup
 */
export interface CLIOutput {
  /** Application configuration */
  config: Config;

  /** Paths to input files */
  filePaths: string[];

  /** Operation mode */
  mode: CLIMode;

  /** Output path for logs or results */
  outputPath?: string;

  /** Environment configuration */
  envConfig: EnvConfig;
}

/**
 * Command-line options parsed from arguments
 */
export interface CLIOptions {
  /** Input file paths */
  files: string[];

  /** Target Elasticsearch index */
  index?: string;

  /** Output path for logs or results */
  output?: string;

  /** Elasticsearch URL */
  url?: string;

  /** Elasticsearch username */
  user?: string;

  /** Elasticsearch password */
  password?: string;

  /** Batch size for processing records */
  batchSize?: string;

  /** CSV delimiter character */
  delimiter?: string;

  /** Whether debug mode is enabled */
  debug?: boolean;
}
