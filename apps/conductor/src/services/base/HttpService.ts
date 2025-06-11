// src/services/base/HttpService.ts - Fixed Logger calls
import axios from "axios";
import { Logger } from "../../utils/logger";
import { ErrorFactory, ErrorCodes } from "../../utils/errors";
import { ServiceConfig, RequestOptions, ServiceResponse } from "./types";

export class HttpService {
  private client: ReturnType<typeof axios.create>;
  private config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;

    // Enhanced configuration validation
    this.validateConfig(config);

    this.client = axios.create({
      baseURL: config.url,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...config.headers,
        ...(config.authToken && {
          Authorization: this.formatAuthToken(config.authToken),
        }),
      },
    });

    // Add response interceptor for consistent error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleAxiosError(error)
    );
  }

  async get<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ServiceResponse<T>> {
    return this.makeRequest<T>("GET", endpoint, undefined, options);
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<ServiceResponse<T>> {
    return this.makeRequest<T>("POST", endpoint, data, options);
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<ServiceResponse<T>> {
    return this.makeRequest<T>("PUT", endpoint, data, options);
  }

  async delete<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ServiceResponse<T>> {
    return this.makeRequest<T>("DELETE", endpoint, undefined, options);
  }

  /**
   * Enhanced configuration validation
   */
  private validateConfig(config: ServiceConfig): void {
    if (!config.url) {
      throw ErrorFactory.config(
        "Service URL is required for HTTP client configuration",
        "url",
        [
          "Provide a valid service URL",
          "Check service configuration",
          "Verify environment variables are set",
        ]
      );
    }

    try {
      const url = new URL(config.url);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw ErrorFactory.config(
          `Invalid service URL protocol: ${url.protocol}`,
          "url",
          [
            "Use HTTP or HTTPS protocol",
            "Example: http://localhost:8080",
            "Example: https://api.service.com",
          ]
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }
      throw ErrorFactory.config(
        `Invalid service URL format: ${config.url}`,
        "url",
        [
          "Use a valid URL format with protocol",
          "Example: http://localhost:8080",
          "Check for typos in the URL",
        ]
      );
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      Logger.warn`Timeout value ${config.timeout}ms is outside recommended range (1000-300000ms)`;
    }
  }

  /**
   * Enhanced request method with better error handling and retry logic
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<ServiceResponse<T>> {
    const config: any = {
      method,
      url: endpoint,
      data,
      timeout: options.timeout || this.config.timeout,
      headers: options.headers,
      params: options.params,
    };

    const maxRetries = options.retries ?? this.config.retries ?? 3;
    const retryDelay = this.config.retryDelay ?? 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.debugString(
          `${method} ${endpoint} (attempt ${attempt}/${maxRetries})`
        );

        const response = await this.client.request<T>(config);

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
        };
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt || !this.isRetryableError(error)) {
          throw error;
        }

        const backoffDelay = retryDelay * attempt; // Exponential backoff
        Logger.warnString(
          `Request failed, retrying in ${backoffDelay}ms... (${attempt}/${maxRetries})`
        );
        await this.delay(backoffDelay);
      }
    }

    throw ErrorFactory.connection(
      "Request failed after all retries",
      "HTTP Service",
      this.config.url,
      [
        "Check service connectivity and availability",
        "Verify network connectivity",
        "Check service health and status",
        "Review request parameters and authentication",
      ]
    );
  }

  private formatAuthToken(token: string): string {
    return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  /**
   * Enhanced error handling with ErrorFactory patterns
   */
  private handleAxiosError(error: any): never {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      const url = error.config?.url || "unknown";

      let errorMessage = `HTTP ${status}`;
      if (data?.message) {
        errorMessage += `: ${data.message}`;
      } else if (data?.error) {
        errorMessage += `: ${data.error}`;
      } else if (typeof data === "string") {
        errorMessage += `: ${data}`;
      }

      // Enhanced error handling based on status codes
      if (status === 401) {
        throw ErrorFactory.connection(
          `Authentication failed: ${errorMessage}`,
          "HTTP Service",
          this.config.url,
          [
            "Check authentication credentials",
            "Verify API token is valid and not expired",
            "Ensure proper authentication headers",
            "Contact service administrator for access",
          ]
        );
      } else if (status === 403) {
        throw ErrorFactory.connection(
          `Access forbidden: ${errorMessage}`,
          "HTTP Service",
          this.config.url,
          [
            "You may not have permission for this operation",
            "Check user roles and privileges",
            "Verify API access permissions",
            "Contact administrator for required permissions",
          ]
        );
      } else if (status === 404) {
        throw ErrorFactory.connection(
          `Resource not found: ${errorMessage}`,
          "HTTP Service",
          this.config.url,
          [
            "Check the endpoint URL is correct",
            "Verify the resource exists",
            `Check service is running at: ${this.config.url}`,
            "Review API documentation for correct endpoints",
          ]
        );
      } else if (status === 400) {
        throw ErrorFactory.validation(
          `Bad request: ${errorMessage}`,
          {
            status,
            responseData: data,
            url,
          },
          [
            "Check request parameters and format",
            "Verify all required fields are provided",
            "Review request payload structure",
            "Check data types and validation rules",
          ]
        );
      } else if (status === 422) {
        throw ErrorFactory.validation(
          `Validation failed: ${errorMessage}`,
          {
            status,
            responseData: data,
            url,
          },
          [
            "Check input data validation",
            "Verify all required fields are present and valid",
            "Review data format and constraints",
            "Check for conflicting or duplicate data",
          ]
        );
      } else if (status === 429) {
        throw ErrorFactory.connection(
          `Rate limit exceeded: ${errorMessage}`,
          "HTTP Service",
          this.config.url,
          [
            "Too many requests sent to the service",
            "Wait before retrying the request",
            "Consider implementing request throttling",
            "Check rate limit policies and quotas",
          ]
        );
      } else if (status >= 500) {
        throw ErrorFactory.connection(
          `Server error: ${errorMessage}`,
          "HTTP Service",
          this.config.url,
          [
            "Service is experiencing internal errors",
            "Check service health and status",
            "Try again later if the service is temporarily down",
            "Contact service administrator if problem persists",
          ]
        );
      }

      // Generic HTTP error
      throw ErrorFactory.connection(
        errorMessage,
        "HTTP Service",
        this.config.url,
        [
          "Check request parameters and format",
          "Verify service connectivity",
          "Review API documentation",
          "Check service status and health",
        ]
      );
    } else if (error.request) {
      // Request made but no response
      const errorCode = error.code || "UNKNOWN";

      if (errorCode === "ECONNREFUSED") {
        throw ErrorFactory.connection(
          "Connection refused - service not accessible",
          "HTTP Service",
          this.config.url,
          [
            "Check that the service is running",
            `Verify service URL: ${this.config.url}`,
            "Check network connectivity",
            "Verify firewall and security settings",
          ]
        );
      } else if (errorCode === "ETIMEDOUT" || errorCode === "ECONNABORTED") {
        throw ErrorFactory.connection(
          "Request timed out",
          "HTTP Service",
          this.config.url,
          [
            "Service may be overloaded or slow",
            "Check network connectivity and latency",
            "Consider increasing timeout settings",
            "Try again later if service is busy",
          ]
        );
      } else if (errorCode === "ENOTFOUND") {
        throw ErrorFactory.connection(
          "Service hostname not found",
          "HTTP Service",
          this.config.url,
          [
            "Check service URL spelling and format",
            "Verify DNS resolution works",
            "Check network connectivity",
            "Try using IP address instead of hostname",
          ]
        );
      }

      throw ErrorFactory.connection(
        `No response received from service (${errorCode})`,
        "HTTP Service",
        this.config.url,
        [
          "Check service connectivity and availability",
          "Verify network configuration",
          "Check firewall and proxy settings",
          "Try again later if service is temporarily unavailable",
        ]
      );
    } else {
      // Request setup error
      throw ErrorFactory.validation(
        `Request configuration error: ${error.message}`,
        { error: error.message },
        [
          "Check request parameters and configuration",
          "Verify data format and structure",
          "Review authentication setup",
          "Check client configuration",
        ]
      );
    }
  }

  /**
   * Enhanced retry logic with better error classification
   */
  private isRetryableError(error: any): boolean {
    if (!error.response) {
      // Network errors are generally retryable
      const retryableCodes = ["ECONNRESET", "ECONNABORTED", "ETIMEDOUT"];
      return retryableCodes.includes(error.code);
    }

    const status = error.response.status;

    // Retry on server errors and rate limiting, but not client errors
    if (status >= 500 || status === 429) {
      return true;
    }

    // Don't retry client errors (4xx)
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
