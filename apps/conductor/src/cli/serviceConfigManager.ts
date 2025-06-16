// src/cli/ServiceConfigManager.ts
/**
 * Unified service configuration management
 * Replaces scattered config objects throughout commands and services
 */

import { Environment } from "./environment";
import { ServiceConfig } from "../services/base/types";
import { ErrorFactory } from "../utils/errors"; // ADDED: Import ErrorFactory

interface StandardServiceConfig extends ServiceConfig {
  name: string;
  retries: number;
  retryDelay: number;
}

interface ElasticsearchConfig extends StandardServiceConfig {
  user: string;
  password: string;
  index: string;
  batchSize: number;
  delimiter: string;
}

interface FileServiceConfig extends StandardServiceConfig {
  dataDir: string;
  outputDir: string;
  manifestFile?: string;
}

interface LyricConfig extends StandardServiceConfig {
  categoryId: string;
  organization: string;
  maxRetries: number;
  retryDelay: number;
}

export class ServiceConfigManager {
  /**
   * Create Elasticsearch configuration
   */
  static createElasticsearchConfig(
    overrides: Partial<ElasticsearchConfig> = {}
  ): ElasticsearchConfig {
    const env = Environment.services.elasticsearch;
    const defaults = Environment.defaults.elasticsearch;

    return {
      name: "Elasticsearch",
      url: env.url,
      authToken: undefined, // ES uses user/password
      timeout: Environment.defaults.timeouts.default,
      retries: 3,
      retryDelay: 1000,
      user: env.user,
      password: env.password,
      index: defaults.index,
      batchSize: defaults.batchSize,
      delimiter: defaults.delimiter,
      ...overrides,
    };
  }

  /**
   * Create Lectern service configuration
   */
  static createLecternConfig(
    overrides: Partial<StandardServiceConfig> = {}
  ): StandardServiceConfig {
    const env = Environment.services.lectern;

    return {
      name: "Lectern",
      url: env.url,
      authToken: env.authToken,
      timeout: Environment.defaults.timeouts.default,
      retries: 3,
      retryDelay: 1000,
      ...overrides,
    };
  }

  /**
   * Create Lyric service configuration
   */
  static createLyricConfig(overrides: Partial<LyricConfig> = {}): LyricConfig {
    const env = Environment.services.lyric;
    const defaults = Environment.defaults.lyric;

    return {
      name: "Lyric",
      url: env.url,
      authToken: undefined,
      timeout: Environment.defaults.timeouts.upload, // Longer timeout for uploads
      retries: 3,
      retryDelay: defaults.retryDelay, // Use the environment default
      categoryId: env.categoryId,
      organization: env.organization,
      maxRetries: defaults.maxRetries,
      ...overrides,
    };
  }

  /**
   * Create SONG service configuration
   */
  static createSongConfig(
    overrides: Partial<StandardServiceConfig> = {}
  ): StandardServiceConfig {
    const env = Environment.services.song;

    return {
      name: "SONG",
      url: env.url,
      authToken: env.authToken,
      timeout: Environment.defaults.timeouts.upload,
      retries: 3,
      retryDelay: 1000,
      ...overrides,
    };
  }

  /**
   * Create Score service configuration
   */
  static createScoreConfig(
    overrides: Partial<StandardServiceConfig> = {}
  ): StandardServiceConfig {
    const env = Environment.services.score;

    return {
      name: "Score",
      url: env.url,
      authToken: env.authToken,
      timeout: Environment.defaults.timeouts.upload,
      retries: 2, // Lower retries for file uploads
      retryDelay: 2000,
      ...overrides,
    };
  }

  /**
   * Create Maestro service configuration
   */
  static createMaestroConfig(
    overrides: Partial<StandardServiceConfig> = {}
  ): StandardServiceConfig {
    const env = Environment.services.maestro;

    return {
      name: "Maestro",
      url: env.url,
      authToken: undefined,
      timeout: Environment.defaults.timeouts.default,
      retries: 3,
      retryDelay: 1000,
      ...overrides,
    };
  }

  /**
   * Create file service configuration (for commands that handle files)
   */
  static createFileServiceConfig(
    baseConfig: StandardServiceConfig,
    fileOptions: Partial<FileServiceConfig> = {}
  ): FileServiceConfig {
    return {
      ...baseConfig,
      dataDir: fileOptions.dataDir || "./data",
      outputDir: fileOptions.outputDir || "./output",
      manifestFile: fileOptions.manifestFile,
      ...fileOptions,
    };
  }

  /**
   * Validate service configuration
   * UPDATED: Enhanced with ErrorFactory for better error messages
   */
  static validateConfig(config: StandardServiceConfig): void {
    if (!config.url) {
      // UPDATED: Use ErrorFactory instead of generic Error
      throw ErrorFactory.config(
        `Missing URL for ${config.name} service`,
        "serviceUrl",
        [
          `Set ${config.name.toUpperCase()}_URL environment variable`,
          `Use --${config.name.toLowerCase()}-url parameter`,
          "Verify service is running and accessible",
          "Check network connectivity",
          `Example: export ${config.name.toUpperCase()}_URL=http://localhost:8080`,
        ]
      );
    }

    if (config.timeout && config.timeout < 1000) {
      // UPDATED: Use ErrorFactory instead of generic Error
      throw ErrorFactory.config(
        `Timeout too low for ${config.name} service (minimum 1000ms)`,
        "timeout",
        [
          "Set timeout to 1000ms or higher",
          "Use reasonable timeout values (5000-30000ms recommended)",
          "Consider network latency and service response times",
          `Example: --timeout 10000 for ${config.name}`,
        ]
      );
    }

    if (config.retries && config.retries < 0) {
      // UPDATED: Use ErrorFactory instead of generic Error
      throw ErrorFactory.config(
        `Invalid retries value for ${config.name} service`,
        "retries",
        [
          "Use a positive integer for retries (0-10 recommended)",
          "Set retries to 0 to disable retry logic",
          "Consider service reliability when setting retry count",
          `Example: --retries 3 for ${config.name}`,
        ]
      );
    }

    // Additional validation for URL format
    if (config.url) {
      try {
        const parsedUrl = new URL(config.url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw ErrorFactory.config(
            `Invalid ${config.name} URL protocol - must be http or https`,
            "serviceUrl",
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
          `Invalid ${config.name} URL format: ${config.url}`,
          "serviceUrl",
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
  }

  /**
   * Validate Elasticsearch-specific configuration
   * ADDED: New validation method for ES-specific settings
   */
  static validateElasticsearchConfig(config: ElasticsearchConfig): void {
    this.validateConfig(config);

    if (
      config.batchSize &&
      (config.batchSize < 1 || config.batchSize > 10000)
    ) {
      throw ErrorFactory.config(
        `Invalid batch size for Elasticsearch: ${config.batchSize}`,
        "batchSize",
        [
          "Use batch size between 1 and 10000",
          "Recommended values: 500-2000 for most files",
          "Smaller batches for large documents, larger for simple data",
          "Example: --batch-size 1000",
        ]
      );
    }

    if (config.delimiter && config.delimiter.length !== 1) {
      throw ErrorFactory.config(
        `Invalid CSV delimiter: ${config.delimiter}`,
        "delimiter",
        [
          "Use a single character delimiter",
          "Common delimiters: ',' (comma), '\\t' (tab), ';' (semicolon)",
          "Example: --delimiter ';'",
          "Ensure delimiter matches your CSV file format",
        ]
      );
    }

    if (!config.index || config.index.trim() === "") {
      throw ErrorFactory.config(
        "Elasticsearch index name is required",
        "index",
        [
          "Provide an index name with --index parameter",
          "Use lowercase names with hyphens or underscores",
          "Example: --index my-data-index",
          "Ensure index exists in Elasticsearch",
        ]
      );
    }
  }

  /**
   * Validate Lyric-specific configuration
   * ADDED: New validation method for Lyric-specific settings
   */
  static validateLyricConfig(config: LyricConfig): void {
    this.validateConfig(config);

    if (
      config.maxRetries &&
      (config.maxRetries < 1 || config.maxRetries > 50)
    ) {
      throw ErrorFactory.config(
        `Invalid max retries for Lyric: ${config.maxRetries}`,
        "maxRetries",
        [
          "Use max retries between 1 and 50",
          "Recommended: 5-15 for most use cases",
          "Higher values for unstable connections",
          "Example: --max-retries 10",
        ]
      );
    }

    if (
      config.retryDelay &&
      (config.retryDelay < 1000 || config.retryDelay > 300000)
    ) {
      throw ErrorFactory.config(
        `Invalid retry delay for Lyric: ${config.retryDelay}ms`,
        "retryDelay",
        [
          "Use retry delay between 1000ms (1s) and 300000ms (5min)",
          "Recommended: 10000-30000ms for most use cases",
          "Longer delays for heavily loaded services",
          "Example: --retry-delay 20000",
        ]
      );
    }

    if (!config.categoryId || config.categoryId.trim() === "") {
      throw ErrorFactory.config("Lyric category ID is required", "categoryId", [
        "Provide category ID with --category-id parameter",
        "Set CATEGORY_ID environment variable",
        "Category ID should match your registered dictionary",
        "Contact administrator for valid category IDs",
      ]);
    }

    if (!config.organization || config.organization.trim() === "") {
      throw ErrorFactory.config(
        "Lyric organization is required",
        "organization",
        [
          "Provide organization with --organization parameter",
          "Set ORGANIZATION environment variable",
          "Use your institution or organization name",
          "Organization should match your Lyric configuration",
        ]
      );
    }
  }

  /**
   * Get all configured services status
   */
  static getServicesOverview() {
    const env = Environment.services;
    return {
      elasticsearch: {
        url: env.elasticsearch.url,
        configured: !!env.elasticsearch.url,
      },
      lectern: { url: env.lectern.url, configured: !!env.lectern.url },
      lyric: { url: env.lyric.url, configured: !!env.lyric.url },
      song: { url: env.song.url, configured: !!env.song.url },
      score: { url: env.score.url, configured: !!env.score.url },
      maestro: { url: env.maestro.url, configured: !!env.maestro.url },
    };
  }
}
