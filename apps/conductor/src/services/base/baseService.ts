// src/services/base/BaseService.ts
import { HttpService } from "./HttpService";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import { ServiceConfig, HealthCheckResult } from "./types";

export abstract class BaseService {
  protected http: HttpService;
  protected config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.http = new HttpService(config);
  }

  abstract get serviceName(): string;

  protected abstract get healthEndpoint(): string;

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      Logger.debug`Checking ${this.serviceName} health...`;

      const response = await this.http.get(this.healthEndpoint, {
        timeout: 5000,
        retries: 1,
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = this.isHealthyResponse(response.data, response.status);

      if (isHealthy) {
        Logger.debug`${this.serviceName} is healthy (${responseTime}ms)`;
      } else {
        Logger.warnString(
          `⚠ ${this.serviceName} health check returned unhealthy status`
        );
      }

      return {
        healthy: isHealthy,
        status: this.extractHealthStatus(response.data),
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      Logger.error`${this.serviceName} failed to connect`;

      return {
        healthy: false,
        message: error instanceof Error ? error.message : String(error),
        responseTime,
      };
    }
  }

  protected isHealthyResponse(data: unknown, status: number): boolean {
    // Default implementation - override in subclasses for service-specific logic
    if (status !== 200) return false;

    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      const statusField = obj.status || obj.appStatus;

      if (typeof statusField === "string") {
        return ["UP", "HEALTHY", "OK"].includes(statusField.toUpperCase());
      }
    }

    return true; // If no status field, assume healthy if 200 OK
  }

  protected extractHealthStatus(data: unknown): string | undefined {
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      const status = obj.status || obj.appStatus;
      return typeof status === "string" ? status : undefined;
    }
    return undefined;
  }

  protected handleServiceError(error: unknown, operation: string): never {
    // If it's already a ConductorError, rethrow it
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Categorize errors based on their content
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND")
    ) {
      throw ErrorFactory.connection(
        `${this.serviceName} ${operation} failed: Connection refused`,
        {
          service: this.serviceName,
          operation,
          serviceUrl: this.config.url,
          originalError: error,
        },
        [
          `Check that ${this.serviceName} service is running`,
          `Verify the service URL: ${this.config.url}`,
          "Check network connectivity",
          "Review firewall and security settings",
        ]
      );
    }

    if (errorMessage.includes("ETIMEDOUT")) {
      throw ErrorFactory.connection(
        `${this.serviceName} ${operation} failed: Request timeout`,
        {
          service: this.serviceName,
          operation,
          timeout: this.config.timeout,
          originalError: error,
        },
        [
          `${this.serviceName} service is taking too long to respond`,
          "Check service performance and load",
          "Consider increasing timeout value",
          "Verify network stability",
        ]
      );
    }

    if (errorMessage.includes("401") || errorMessage.includes("403")) {
      throw ErrorFactory.auth(
        `${this.serviceName} ${operation} failed: Authentication error`,
        {
          service: this.serviceName,
          operation,
          originalError: error,
        },
        [
          "Check authentication credentials",
          "Verify API token is valid and not expired",
          "Ensure you have proper permissions",
          "Contact administrator for access",
        ]
      );
    }

    if (errorMessage.includes("404")) {
      throw ErrorFactory.validation(
        `${this.serviceName} ${operation} failed: Resource not found`,
        {
          service: this.serviceName,
          operation,
          originalError: error,
        },
        [
          "Check that the requested resource exists",
          "Verify the resource ID or name",
          "Ensure the service endpoint is correct",
        ]
      );
    }

    if (errorMessage.includes("400")) {
      throw ErrorFactory.validation(
        `${this.serviceName} ${operation} failed: Bad request`,
        {
          service: this.serviceName,
          operation,
          originalError: error,
        }
      );
    }

    // Generic service error
    throw ErrorFactory.connection(
      `${this.serviceName} ${operation} failed`,
      {
        service: this.serviceName,
        operation,
        originalError: error,
      },
      [
        `Check ${this.serviceName} service logs for details`,
        "Verify service configuration",
        "Try the operation again after a few moments",
        "Use --debug for detailed error information",
      ]
    );
  }

  protected normalizeUrl(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  // Updated validation method with better type support
  protected validateRequiredFields<T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[]
  ): void {
    const missingFields = fields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === ""
    );

    if (missingFields.length > 0) {
      throw ErrorFactory.validation(
        "Missing required fields",
        {
          missingFields: missingFields.map(String),
          provided: Object.keys(data),
          serviceName: this.serviceName,
        },
        [
          `Required fields: ${missingFields.join(", ")}`,
          "Check request parameters",
          "Ensure all required data is provided",
        ]
      );
    }
  }

  // Alternative validation method for simple objects
  protected validateRequired(
    data: Record<string, unknown>,
    fields: string[]
  ): void {
    const missingFields = fields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === ""
    );

    if (missingFields.length > 0) {
      throw ErrorFactory.validation(
        "Missing required fields",
        {
          missingFields,
          provided: Object.keys(data),
          serviceName: this.serviceName,
        },
        [
          `Required fields: ${missingFields.join(", ")}`,
          "Check request parameters",
          "Ensure all required data is provided",
        ]
      );
    }
  }

  /**
   * Validate service configuration on initialization
   */
  protected validateServiceConfig(): void {
    if (!this.config.url) {
      throw ErrorFactory.args(`${this.serviceName} service URL is required`, [
        "Provide service URL in configuration",
        "Set appropriate environment variable",
        "Use command line option to specify URL",
      ]);
    }

    try {
      new URL(this.config.url);
    } catch (error) {
      throw ErrorFactory.validation(
        `Invalid ${this.serviceName} service URL`,
        { url: this.config.url, originalError: error },
        [
          "Ensure URL includes protocol (http:// or https://)",
          "Check URL format and spelling",
          "Verify port number if specified",
        ]
      );
    }

    if (
      this.config.timeout &&
      (this.config.timeout < 1000 || this.config.timeout > 300000)
    ) {
      Logger.warnString(
        `${this.serviceName} timeout ${this.config.timeout}ms is outside recommended range (1000-300000ms)`
      );
    }

    if (
      this.config.retries &&
      (this.config.retries < 0 || this.config.retries > 10)
    ) {
      Logger.warnString(
        `${this.serviceName} retry count ${this.config.retries} is outside recommended range (0-10)`
      );
    }
  }

  /**
   * Log service operation for debugging
   */
  protected logOperation(
    operation: string,
    details?: Record<string, any>
  ): void {
    Logger.debug`${this.serviceName} ${operation}`;
    if (details) {
      Logger.debugString(
        `Operation details: ${JSON.stringify(details, null, 2)}`
      );
    }
  }
}
