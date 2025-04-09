/**
 * Environment Configuration Loader
 *
 * Loads environment variables and configuration settings
 */

import * as fs from "fs";
import * as path from "path";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";

// Dynamically load dotenv if it's available
let dotenv: any;
try {
  // Using require instead of import to handle missing package gracefully
  dotenv = require("dotenv");
} catch (error) {
  // dotenv is not installed, we'll handle this in the code
}

export interface EnvironmentConfig {
  elasticsearchUrl: string;
  indexName?: string;
  esUser?: string;
  esPassword?: string;
  logLevel: string;
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  try {
    // Try to load .env file if dotenv is available and .env exists
    const envPath = path.resolve(process.cwd(), ".env");
    if (dotenv && fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      Logger.debug`Loaded environment from ${envPath}`;
    } else if (!dotenv && fs.existsSync(envPath)) {
      Logger.warn`Found .env file at ${envPath} but dotenv package is not installed. Environment variables from .env will not be loaded.`;
    } else {
      Logger.debug`No .env file found at ${envPath}`;
    }

    // Return environment configuration with defaults
    const config = {
      elasticsearchUrl:
        process.env.ELASTICSEARCH_URL || "http://localhost:9200",
      indexName: process.env.ELASTICSEARCH_INDEX,
      esUser: process.env.ELASTICSEARCH_USER || "elastic",
      esPassword: process.env.ELASTICSEARCH_PASSWORD || "myelasticpassword",
      logLevel: process.env.LOG_LEVEL || "info",
    };

    Logger.debugObject("Environment config", config);
    return config;
  } catch (error) {
    throw new ConductorError(
      "Failed to load environment configuration",
      ErrorCodes.ENV_ERROR,
      { originalError: error, envPath: path.resolve(process.cwd(), ".env") }
    );
  }
}
