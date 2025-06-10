// src/config/ServiceConfigManager.ts
/**
 * Unified service configuration management
 * Replaces scattered config objects throughout commands and services
 */

import { Environment } from "./environment";
import { ServiceConfig } from "../services/base/types";

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
   */
  static validateConfig(config: StandardServiceConfig): void {
    if (!config.url) {
      throw new Error(`Missing URL for ${config.name} service`);
    }

    if (config.timeout && config.timeout < 1000) {
      throw new Error(
        `Timeout too low for ${config.name} service (minimum 1000ms)`
      );
    }

    if (config.retries && config.retries < 0) {
      throw new Error(`Invalid retries value for ${config.name} service`);
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
