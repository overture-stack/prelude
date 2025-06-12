// src/services/base/BaseService.ts
import { HttpService } from "./HttpService";
import { Logger } from "../../utils/logger";
import { ConductorError, ErrorCodes } from "../../utils/errors";
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
      Logger.info(`Checking ${this.serviceName} health...`);

      const response = await this.http.get(this.healthEndpoint, {
        timeout: 5000,
        retries: 1,
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = this.isHealthyResponse(response.data, response.status);

      if (isHealthy) {
        Logger.info(`✓ ${this.serviceName} is healthy (${responseTime}ms)`);
      } else {
        Logger.warn(
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
      Logger.error(
        `✗ ${this.serviceName} health check failed (${responseTime}ms)`
      );

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
    if (error instanceof ConductorError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `${this.serviceName} ${operation} failed: ${errorMessage}`,
      ErrorCodes.CONNECTION_ERROR,
      { service: this.serviceName, operation, originalError: error }
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
      throw new ConductorError(
        `Missing required fields: ${missingFields.join(", ")}`,
        ErrorCodes.VALIDATION_FAILED,
        { missingFields, provided: Object.keys(data) }
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
      throw new ConductorError(
        `Missing required fields: ${missingFields.join(", ")}`,
        ErrorCodes.VALIDATION_FAILED,
        { missingFields, provided: Object.keys(data) }
      );
    }
  }
}
