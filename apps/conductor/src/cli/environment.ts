// src/config/Environment.ts
/**
 * Centralized environment variable management
 * Replaces scattered process.env reads throughout the codebase
 */

import { ErrorFactory } from "../utils/errors";

interface ServiceEndpoints {
  elasticsearch: {
    url: string;
    user: string;
    password: string;
  };
  lectern: {
    url: string;
    authToken: string;
  };
  lyric: {
    url: string;
    categoryId: string;
    organization: string;
  };
  song: {
    url: string;
    authToken: string;
  };
  score: {
    url: string;
    authToken: string;
  };
  maestro: {
    url: string;
  };
}

interface DefaultValues {
  elasticsearch: {
    index: string;
    batchSize: number;
    delimiter: string;
  };
  lyric: {
    maxRetries: number;
    retryDelay: number;
  };
  timeouts: {
    default: number;
    upload: number;
    healthCheck: number;
  };
}

export class Environment {
  private static _services: ServiceEndpoints | null = null;
  private static _defaults: DefaultValues | null = null;

  /**
   * Get all service endpoints with fallback defaults
   */
  static get services(): ServiceEndpoints {
    if (!this._services) {
      this._services = {
        elasticsearch: {
          url: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
          user: process.env.ELASTICSEARCH_USER || "elastic",
          password: process.env.ELASTICSEARCH_PASSWORD || "myelasticpassword",
        },
        lectern: {
          url: process.env.LECTERN_URL || "http://localhost:3031",
          authToken: process.env.LECTERN_AUTH_TOKEN || "",
        },
        lyric: {
          url: process.env.LYRIC_URL || "http://localhost:3030",
          categoryId: process.env.CATEGORY_ID || "1",
          organization: process.env.ORGANIZATION || "OICR",
        },
        song: {
          url: process.env.SONG_URL || "http://localhost:8080",
          authToken: process.env.AUTH_TOKEN || "123",
        },
        score: {
          url: process.env.SCORE_URL || "http://localhost:8087",
          authToken: process.env.AUTH_TOKEN || "123",
        },
        maestro: {
          url: process.env.INDEX_URL || "http://localhost:11235",
        },
      };
    }
    return this._services;
  }

  /**
   * Get default configuration values
   */
  static get defaults(): DefaultValues {
    if (!this._defaults) {
      this._defaults = {
        elasticsearch: {
          index: process.env.ELASTICSEARCH_INDEX || "conductor-data",
          batchSize: parseInt(process.env.BATCH_SIZE || "1000"),
          delimiter: process.env.CSV_DELIMITER || ",",
        },
        lyric: {
          maxRetries: parseInt(process.env.MAX_RETRIES || "10"),
          retryDelay: parseInt(process.env.RETRY_DELAY || "20000"),
        },
        timeouts: {
          default: parseInt(process.env.DEFAULT_TIMEOUT || "10000"),
          upload: parseInt(process.env.UPLOAD_TIMEOUT || "30000"),
          healthCheck: parseInt(process.env.HEALTH_CHECK_TIMEOUT || "5000"),
        },
      };
    }
    return this._defaults;
  }

  /**
   * Check if we're in debug mode
   */
  static get isDebug(): boolean {
    return process.env.DEBUG === "true" || process.argv.includes("--debug");
  }

  /**
   * Get log level
   */
  static get logLevel(): string {
    return process.env.LOG_LEVEL || "info";
  }

  /**
   * Validate that required environment variables are set
   * Enhanced with ErrorFactory for better user guidance
   */
  static validateRequired(requiredVars: string[]): void {
    const missing = requiredVars.filter((varName) => !process.env[varName]);
    if (missing.length > 0) {
      // UPDATED: Use ErrorFactory instead of generic Error
      throw ErrorFactory.config(
        `Missing required environment variables: ${missing.join(", ")}`,
        "environment",
        [
          `Set missing variables: ${missing.join(", ")}`,
          "Check your .env file or environment configuration",
          "Ensure all required services are configured",
          "Use export VARIABLE_NAME=value to set variables",
          "Example: export ELASTICSEARCH_URL=http://localhost:9200",
          "Restart the application after setting variables",
        ]
      );
    }
  }

  /**
   * Get a specific service configuration with overrides
   */
  static getServiceConfig(
    serviceName: keyof ServiceEndpoints,
    overrides: Partial<any> = {}
  ) {
    const baseConfig = this.services[serviceName];
    return {
      ...baseConfig,
      timeout: this.defaults.timeouts.default,
      retries: 3,
      ...overrides,
    };
  }

  /**
   * Validate URL format for a service
   * Enhanced with ErrorFactory for better error messages
   */
  static validateServiceUrl(serviceName: string, url: string): void {
    if (!url) {
      throw ErrorFactory.config(
        `${serviceName} service URL not configured`,
        `${serviceName.toLowerCase()}Url`,
        [
          `Set ${serviceName.toUpperCase()}_URL environment variable`,
          `Use --${serviceName.toLowerCase()}-url parameter`,
          "Verify the service is running and accessible",
          "Check network connectivity",
          `Example: export ${serviceName.toUpperCase()}_URL=http://localhost:8080`,
        ]
      );
    }

    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw ErrorFactory.config(
          `Invalid ${serviceName} URL protocol - must be http or https`,
          `${serviceName.toLowerCase()}Url`,
          [
            "Use http:// or https:// protocol",
            `Check URL format: http://localhost:8080`,
            "Verify the service URL is correct",
            "Include protocol in the URL",
          ]
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.config(
        `Invalid ${serviceName} URL format: ${url}`,
        `${serviceName.toLowerCase()}Url`,
        [
          "Use a valid URL format: http://localhost:8080",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct",
          "Ensure no extra spaces or characters",
        ]
      );
    }
  }

  /**
   * Validate numeric environment variable
   * Enhanced with ErrorFactory for better error messages
   */
  static validateNumericEnv(
    varName: string,
    value: string,
    min?: number,
    max?: number
  ): number {
    const parsed = parseInt(value);

    if (isNaN(parsed)) {
      throw ErrorFactory.config(
        `Invalid numeric value for ${varName}: ${value}`,
        varName.toLowerCase(),
        [
          `Set ${varName} to a valid number`,
          "Check environment variable format",
          "Use only numeric values (no letters or symbols)",
          `Example: export ${varName}=1000`,
        ]
      );
    }

    if (min !== undefined && parsed < min) {
      throw ErrorFactory.config(
        `${varName} value ${parsed} is below minimum ${min}`,
        varName.toLowerCase(),
        [
          `Set ${varName} to ${min} or higher`,
          "Check the value meets minimum requirements",
          `Example: export ${varName}=${min}`,
        ]
      );
    }

    if (max !== undefined && parsed > max) {
      throw ErrorFactory.config(
        `${varName} value ${parsed} exceeds maximum ${max}`,
        varName.toLowerCase(),
        [
          `Set ${varName} to ${max} or lower`,
          "Check the value meets maximum requirements",
          `Example: export ${varName}=${max}`,
        ]
      );
    }

    return parsed;
  }

  /**
   * Reset cached values (useful for testing)
   */
  static reset(): void {
    this._services = null;
    this._defaults = null;
  }
}
