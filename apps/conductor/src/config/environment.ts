// src/config/Environment.ts
/**
 * Centralized environment variable management
 * Replaces scattered process.env reads throughout the codebase
 */

/**
 * Centralized environment variable management
 * Replaces scattered process.env reads throughout the codebase
 */

interface ServiceEndpoints {
  elasticsearch: {
    url: string;
    user: string;
    password: string;
  };
  postgresql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    table: string;
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
        postgresql: {
          host: process.env.POSTGRES_HOST || "localhost",
          port: parseInt(process.env.POSTGRES_PORT || "5432"),
          database: process.env.POSTGRES_DATABASE || "conductor",
          username: process.env.POSTGRES_USERNAME || "postgres",
          password: process.env.POSTGRES_PASSWORD || "password",
          table: process.env.POSTGRES_TABLE || "data",
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
   */
  static validateRequired(requiredVars: string[]): void {
    const missing = requiredVars.filter((varName) => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
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
      retries: 1,
      ...overrides,
    };
  }

  /**
   * Reset cached values (useful for testing)
   */
  static reset(): void {
    this._services = null;
    this._defaults = null;
  }
}
