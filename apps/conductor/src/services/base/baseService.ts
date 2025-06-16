// src/services/base/BaseService.ts - Enhanced with ErrorFactory patterns
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
      Logger.debug`Checking ${this.serviceName} health at ${this.config.url}${this.healthEndpoint}`;

      const response = await this.http.get(this.healthEndpoint, {
        timeout: 5000,
        retries: 1,
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = this.isHealthyResponse(response.data, response.status);

      if (isHealthy) {
        Logger.debug`${this.serviceName} is healthy (${responseTime}ms)`;
      } else {
        Logger.warn`${this.serviceName} health check returned unhealthy status`;
      }

      return {
        healthy: isHealthy,
        status: this.extractHealthStatus(response.data),
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      Logger.error`${this.serviceName} health check failed (${responseTime}ms)`;

      // Enhanced error context for health check failures
      const healthError = this.createHealthCheckError(error, responseTime);

      return {
        healthy: false,
        message: healthError.message,
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
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Enhanced error handling with service context
    throw ErrorFactory.connection(
      `${this.serviceName} ${operation} failed`,
      this.serviceName,
      this.config.url,
      [
        `Check that ${this.serviceName} is running and accessible`,
        `Verify service URL: ${this.config.url}`,
        "Check network connectivity and firewall settings",
        "Confirm authentication credentials if required",
        `Test manually: curl ${this.config.url}${this.healthEndpoint}`,
        "Check service logs for additional details",
      ]
    );
  }

  protected normalizeUrl(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  /**
   * Enhanced validation method with better error messages
   */
  protected validateRequiredFields<T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[],
    context?: string
  ): void {
    const missingFields = fields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === ""
    );

    if (missingFields.length > 0) {
      const contextMsg = context ? ` for ${context}` : "";

      throw ErrorFactory.validation(
        `Missing required fields${contextMsg}`,
        {
          missingFields: missingFields.map(String),
          provided: Object.keys(data),
          context,
        },
        [
          `Provide values for: ${missingFields.map(String).join(", ")}`,
          "Check the request payload structure",
          "Verify all required parameters are included",
          context
            ? `Review ${context} documentation for required fields`
            : "Review API documentation",
        ]
      );
    }
  }

  /**
   * Alternative validation method for simple objects
   */
  protected validateRequired(
    data: Record<string, unknown>,
    fields: string[],
    context?: string
  ): void {
    const missingFields = fields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === ""
    );

    if (missingFields.length > 0) {
      const contextMsg = context ? ` for ${context}` : "";

      throw ErrorFactory.validation(
        `Missing required fields${contextMsg}`,
        {
          missingFields,
          provided: Object.keys(data),
          context,
        },
        [
          `Provide values for: ${missingFields.join(", ")}`,
          "Check the request payload structure",
          "Verify all required parameters are included",
          context
            ? `Review ${context} documentation for required fields`
            : "Review API documentation",
        ]
      );
    }
  }

  /**
   * Enhanced file validation with specific error context
   */
  protected validateFileExists(filePath: string, fileType?: string): void {
    const fs = require("fs");

    if (!filePath) {
      throw ErrorFactory.args(
        `${fileType || "File"} path not provided`,
        undefined,
        [
          `Specify a ${fileType || "file"} path`,
          "Check command line arguments",
          "Verify the parameter is not empty",
        ]
      );
    }

    if (!fs.existsSync(filePath)) {
      throw ErrorFactory.file(
        `${fileType || "File"} not found: ${filePath}`,
        filePath,
        [
          "Check that the file path is correct",
          "Ensure the file exists at the specified location",
          "Verify file permissions allow read access",
          `Current directory: ${process.cwd()}`,
        ]
      );
    }

    // Check if file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file(
        `${fileType || "File"} is not readable: ${filePath}`,
        filePath,
        [
          "Check file permissions",
          "Ensure the file is not locked by another process",
          "Verify you have read access to the file",
          "Try copying the file to a different location",
        ]
      );
    }

    // Check if file has content
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw ErrorFactory.file(
        `${fileType || "File"} is empty: ${filePath}`,
        filePath,
        [
          "Ensure the file contains data",
          "Check if the file was properly created",
          "Verify the file is not corrupted",
        ]
      );
    }
  }

  /**
   * Enhanced JSON parsing with specific error context
   */
  protected parseJsonFile(filePath: string, fileType?: string): any {
    this.validateFileExists(filePath, fileType);

    const fs = require("fs");
    const path = require("path");

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw ErrorFactory.file(
          `Invalid JSON format in ${fileType || "file"}: ${path.basename(
            filePath
          )}`,
          filePath,
          [
            "Check JSON syntax for errors (missing commas, brackets, quotes)",
            "Validate JSON structure using a JSON validator",
            "Ensure file encoding is UTF-8",
            "Try viewing the file in a JSON editor",
            `JSON error: ${error.message}`,
          ]
        );
      }

      throw ErrorFactory.file(
        `Error reading ${fileType || "file"}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        filePath,
        [
          "Check file permissions and accessibility",
          "Verify file is not corrupted",
          "Ensure file is properly formatted",
          "Try opening the file manually to inspect content",
        ]
      );
    }
  }

  /**
   * Create enhanced health check error with service-specific guidance
   */
  private createHealthCheckError(error: unknown, responseTime: number): Error {
    const baseUrl = this.normalizeUrl(this.config.url);

    if (error instanceof Error) {
      // Connection refused
      if (error.message.includes("ECONNREFUSED")) {
        return ErrorFactory.connection(
          `Cannot connect to ${this.serviceName} - connection refused`,
          this.serviceName,
          baseUrl,
          [
            `Check that ${this.serviceName} is running`,
            `Verify service URL: ${baseUrl}`,
            "Check if the service port is correct",
            "Confirm no firewall is blocking the connection",
            `Test connection: curl ${baseUrl}${this.healthEndpoint}`,
          ]
        );
      }

      // Timeout
      if (
        error.message.includes("timeout") ||
        error.message.includes("ETIMEDOUT")
      ) {
        return ErrorFactory.connection(
          `${this.serviceName} health check timed out (${responseTime}ms)`,
          this.serviceName,
          baseUrl,
          [
            "Service may be overloaded or starting up",
            "Check service performance and resource usage",
            "Verify network latency is acceptable",
            "Consider increasing timeout if service is slow",
            "Check service logs for performance issues",
          ]
        );
      }

      // Authentication errors
      if (error.message.includes("401") || error.message.includes("403")) {
        return ErrorFactory.connection(
          `${this.serviceName} authentication failed`,
          this.serviceName,
          baseUrl,
          [
            "Check authentication credentials",
            "Verify API tokens are valid and not expired",
            "Confirm proper authentication headers",
            "Check service authentication configuration",
          ]
        );
      }
    }

    // Generic connection error
    return ErrorFactory.connection(
      `${this.serviceName} health check failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      this.serviceName,
      baseUrl
    );
  }
}
