// src/services/base/HttpService.ts
// Updated to use error factory pattern for consistent error handling
import axios from "axios";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import { ServiceConfig, RequestOptions, ServiceResponse } from "./types";

export class HttpService {
  private client: ReturnType<typeof axios.create>;
  private config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
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
        Logger.debug`${method} ${endpoint} (attempt ${attempt}/${maxRetries})`;

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

        Logger.warnString(
          `Request failed, retrying in ${retryDelay}ms... (${attempt}/${maxRetries})`
        );
        await this.delay(retryDelay * attempt); // Exponential backoff
      }
    }

    throw ErrorFactory.connection(
      "Request failed after all retries",
      {
        method,
        endpoint,
        maxRetries,
        timeout: config.timeout,
      },
      [
        "Check network connectivity",
        "Verify service is running and accessible",
        "Consider increasing timeout or retry values",
      ]
    );
  }

  private formatAuthToken(token: string): string {
    return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  private handleAxiosError(error: any): never {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      const url = error.config?.url || "unknown endpoint";

      let errorMessage = `HTTP ${status}`;
      if (data?.message) {
        errorMessage += `: ${data.message}`;
      } else if (data?.error) {
        errorMessage += `: ${data.error}`;
      }

      // Categorize errors based on status code
      if (status === 401 || status === 403) {
        throw ErrorFactory.auth(
          "Authentication failed",
          {
            status,
            responseData: data,
            url,
            statusText: error.response.statusText,
          },
          [
            "Check authentication credentials",
            "Verify API token is valid and not expired",
            "Ensure you have proper permissions for this operation",
            "Contact administrator if credentials should be valid",
          ]
        );
      }

      if (status === 404) {
        throw ErrorFactory.validation(
          "Resource not found",
          {
            status,
            responseData: data,
            url,
          },
          [
            "Check that the requested resource exists",
            "Verify the resource ID or endpoint path",
            "Ensure the service endpoint is correct",
          ]
        );
      }

      if (status === 400) {
        // Use server error message instead of "Bad request"
        const serverMessage =
          data?.message ||
          data?.error ||
          "Bad request - invalid data or format";

        throw ErrorFactory.validation(
          serverMessage,
          {
            status,
            responseData: data,
            url,
          },
          [
            "Check request parameters and format",
            "Verify required fields are provided",
            "Ensure data types and values are correct",
            data?.message ? `Server message: ${data.message}` : null,
          ].filter(Boolean) as string[]
        );
      }

      if (status === 409) {
        throw ErrorFactory.validation(
          "Conflict - resource already exists",
          {
            status,
            responseData: data,
            url,
          },
          [
            "Resource may already exist",
            "Check for duplicate entries",
            "Use force flag if available to overwrite",
          ]
        );
      }

      if (status === 422) {
        throw ErrorFactory.validation(
          "Validation failed",
          {
            status,
            responseData: data,
            url,
          },
          [
            "Check data format and required fields",
            "Verify data meets service requirements",
            data?.message ? `Server message: ${data.message}` : null,
          ].filter(Boolean) as string[]
        );
      }

      if (status >= 500) {
        throw ErrorFactory.connection(
          "Server error",
          {
            status,
            responseData: data,
            url,
          },
          [
            "The service encountered an internal error",
            "Try the request again after a few moments",
            "Check service logs for more details",
            "Contact support if the issue persists",
          ]
        );
      }

      // Generic HTTP error
      throw ErrorFactory.connection(
        errorMessage,
        {
          status,
          responseData: data,
          url,
        },
        [
          `HTTP ${status} error occurred`,
          "Check the request and try again",
          "Verify service configuration",
        ]
      );
    } else if (error.request) {
      // Request made but no response
      const url = error.config?.url || "unknown endpoint";

      if (error.code === "ECONNREFUSED") {
        throw ErrorFactory.connection(
          "Connection refused",
          {
            url,
            code: error.code,
          },
          [
            "Check that the service is running",
            "Verify the service URL and port",
            "Check network connectivity",
            "Review firewall settings",
          ]
        );
      }

      if (error.code === "ENOTFOUND") {
        throw ErrorFactory.connection(
          "Service host not found",
          {
            url,
            code: error.code,
          },
          [
            "Check the service hostname/URL",
            "Verify DNS resolution",
            "Check network connectivity",
          ]
        );
      }

      if (error.code === "ETIMEDOUT") {
        throw ErrorFactory.connection(
          "Request timeout",
          {
            url,
            code: error.code,
            timeout: error.config?.timeout,
          },
          [
            "The service is taking too long to respond",
            "Check service performance and load",
            "Consider increasing timeout value",
            "Verify network stability",
          ]
        );
      }

      throw ErrorFactory.connection(
        "No response received from server",
        {
          url,
          code: error.code,
        },
        [
          "Check network connectivity",
          "Verify service is running",
          "Check for network interruptions",
        ]
      );
    } else {
      // Request setup error
      throw ErrorFactory.connection(
        "Request configuration error",
        {
          originalError: error,
          message: error.message,
        },
        [
          "Check request configuration",
          "Verify parameters are correct",
          "Contact support if issue persists",
        ]
      );
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error.response) {
      // Network errors are generally retryable
      return true;
    }

    const status = error.response.status;

    // DON'T retry 4xx client errors - they won't succeed on retry
    if (status >= 400 && status < 500) {
      return status === 429; // Only retry rate limiting (429 Too Many Requests)
    }

    // Retry on server errors (5xx)
    if (status >= 500) return true; // Server errors
    if (status === 502 || status === 504) return true; // Bad Gateway, Gateway Timeout
    if (status === 503) return true; // Service Unavailable

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration for debugging
   */
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Update request headers for this instance
   */
  setHeaders(headers: Record<string, string>): void {
    this.client.defaults.headers = {
      ...this.client.defaults.headers,
      ...headers,
    };
  }

  /**
   * Update auth token for this instance
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.Authorization = this.formatAuthToken(token);
  }
}
