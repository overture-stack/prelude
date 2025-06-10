// src/cli/environment.ts
import * as fs from "fs";
import * as path from "path";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";

// Define all possible environment variables with types
interface ProcessEnv {
  // Elasticsearch
  ELASTICSEARCH_URL?: string;
  ELASTICSEARCH_INDEX?: string;
  ELASTICSEARCH_USER?: string;
  ELASTICSEARCH_PASSWORD?: string;

  // Service URLs
  LECTERN_URL?: string;
  LYRIC_URL?: string;
  SONG_URL?: string;
  SCORE_URL?: string;
  MAESTRO_URL?: string;
  INDEX_URL?: string;

  // Auth & Config
  AUTH_TOKEN?: string;
  LECTERN_AUTH_TOKEN?: string;

  // Lyric specific
  LYRIC_DATA?: string;
  CATEGORY_ID?: string;
  ORGANIZATION?: string;
  CATEGORY_NAME?: string;
  DICTIONARY_NAME?: string;
  DICTIONARY_VERSION?: string;
  DEFAULT_CENTRIC_ENTITY?: string;
  MAX_RETRIES?: string;
  RETRY_DELAY?: string;

  // SONG specific
  SONG_SCHEMA?: string;
  STUDY_ID?: string;
  STUDY_NAME?: string;
  DESCRIPTION?: string;
  ANALYSIS_FILE?: string;
  DATA_DIR?: string;
  OUTPUT_DIR?: string;
  MANIFEST_FILE?: string;

  // General
  LOG_LEVEL?: string;
  DEBUG?: string;
  NODE_ENV?: string;
}

export interface EnvironmentConfig {
  // Core Elasticsearch settings
  elasticsearchUrl: string;
  indexName?: string;
  esUser?: string;
  esPassword?: string;

  // Service URLs
  lecternUrl?: string;
  lyricUrl?: string;
  songUrl?: string;
  scoreUrl?: string;
  maestroUrl?: string;

  // Authentication
  authToken?: string;
  lecternAuthToken?: string;

  // Lyric configuration
  lyricData?: string;
  categoryId?: string;
  organization?: string;
  categoryName?: string;
  dictionaryName?: string;
  dictionaryVersion?: string;
  defaultCentricEntity?: string;
  maxRetries?: number;
  retryDelay?: number;

  // SONG configuration
  songSchema?: string;
  studyId?: string;
  studyName?: string;
  description?: string;
  analysisFile?: string;
  dataDir?: string;
  outputDir?: string;
  manifestFile?: string;

  // General settings
  logLevel: string;
  debug: boolean;
  nodeEnv: string;
}

/**
 * Load environment configuration with better error handling and validation
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  try {
    // Try to load .env file if it exists (but don't require dotenv package)
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      try {
        // Try to dynamically import dotenv if available
        const dotenv = require("dotenv");
        dotenv.config({ path: envPath });
        Logger.debug(`Loaded environment from ${envPath}`);
      } catch (error) {
        Logger.warn(
          `Found .env file but dotenv package not available. Using system environment variables only.`
        );
      }
    }

    // Type-safe environment variable access
    const env = process.env as ProcessEnv;

    // Build configuration with validation
    const config: EnvironmentConfig = {
      // Required settings with sensible defaults
      elasticsearchUrl: env.ELASTICSEARCH_URL || "http://localhost:9200",
      logLevel: env.LOG_LEVEL || "info",
      debug: env.DEBUG === "true" || process.argv.includes("--debug"),
      nodeEnv: env.NODE_ENV || "development",

      // Optional Elasticsearch settings
      indexName: env.ELASTICSEARCH_INDEX,
      esUser: env.ELASTICSEARCH_USER || "elastic",
      esPassword: env.ELASTICSEARCH_PASSWORD || "myelasticpassword",

      // Service URLs
      lecternUrl: env.LECTERN_URL,
      lyricUrl: env.LYRIC_URL,
      songUrl: env.SONG_URL,
      scoreUrl: env.SCORE_URL,
      maestroUrl: env.INDEX_URL,

      // Authentication
      authToken: env.AUTH_TOKEN,
      lecternAuthToken: env.LECTERN_AUTH_TOKEN,

      // Lyric settings
      lyricData: env.LYRIC_DATA,
      categoryId: env.CATEGORY_ID,
      organization: env.ORGANIZATION,
      categoryName: env.CATEGORY_NAME,
      dictionaryName: env.DICTIONARY_NAME,
      dictionaryVersion: env.DICTIONARY_VERSION,
      defaultCentricEntity: env.DEFAULT_CENTRIC_ENTITY,
      maxRetries: env.MAX_RETRIES ? parseInt(env.MAX_RETRIES, 10) : undefined,
      retryDelay: env.RETRY_DELAY ? parseInt(env.RETRY_DELAY, 10) : undefined,

      // SONG settings
      songSchema: env.SONG_SCHEMA,
      studyId: env.STUDY_ID,
      studyName: env.STUDY_NAME,
      description: env.DESCRIPTION,
      analysisFile: env.ANALYSIS_FILE,
      dataDir: env.DATA_DIR,
      outputDir: env.OUTPUT_DIR,
      manifestFile: env.MANIFEST_FILE,
    };

    // Validate critical configuration
    validateCriticalConfig(config);

    if (config.debug) {
      Logger.debugObject("Environment config", config);
    }

    return config;
  } catch (error) {
    throw new ConductorError(
      "Failed to load environment configuration",
      ErrorCodes.ENV_ERROR,
      {
        originalError: error,
        envPath: path.resolve(process.cwd(), ".env"),
        availableEnvVars: Object.keys(process.env).filter(
          (key) =>
            key.startsWith("ELASTICSEARCH_") ||
            key.startsWith("LYRIC_") ||
            key.startsWith("SONG_") ||
            key.startsWith("LECTERN_")
        ),
      }
    );
  }
}

/**
 * Validate critical configuration settings
 */
function validateCriticalConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  // Validate URLs if provided
  if (config.elasticsearchUrl && !isValidUrl(config.elasticsearchUrl)) {
    errors.push("ELASTICSEARCH_URL must be a valid URL");
  }

  if (config.lecternUrl && !isValidUrl(config.lecternUrl)) {
    errors.push("LECTERN_URL must be a valid URL");
  }

  if (config.lyricUrl && !isValidUrl(config.lyricUrl)) {
    errors.push("LYRIC_URL must be a valid URL");
  }

  if (config.songUrl && !isValidUrl(config.songUrl)) {
    errors.push("SONG_URL must be a valid URL");
  }

  // Validate numeric values
  if (
    config.maxRetries !== undefined &&
    (config.maxRetries < 0 || config.maxRetries > 100)
  ) {
    errors.push("MAX_RETRIES must be between 0 and 100");
  }

  if (
    config.retryDelay !== undefined &&
    (config.retryDelay < 0 || config.retryDelay > 60000)
  ) {
    errors.push("RETRY_DELAY must be between 0 and 60000 milliseconds");
  }

  if (errors.length > 0) {
    throw new ConductorError(
      "Environment configuration validation failed",
      ErrorCodes.VALIDATION_FAILED,
      { errors }
    );
  }
}

/**
 * Simple URL validation
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get environment-specific configuration for services
 */
export function getServiceConfig(serviceName: string): {
  url?: string;
  authToken?: string;
} {
  const config = loadEnvironmentConfig();

  switch (serviceName.toLowerCase()) {
    case "elasticsearch":
      return {
        url: config.elasticsearchUrl,
        authToken: config.esPassword,
      };
    case "lectern":
      return {
        url: config.lecternUrl,
        authToken: config.lecternAuthToken,
      };
    case "lyric":
      return {
        url: config.lyricUrl,
        authToken: config.authToken,
      };
    case "song":
      return {
        url: config.songUrl,
        authToken: config.authToken,
      };
    case "score":
      return {
        url: config.scoreUrl,
        authToken: config.authToken,
      };
    default:
      return {};
  }
}
