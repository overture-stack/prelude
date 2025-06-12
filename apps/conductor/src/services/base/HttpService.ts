// src/services/base/HttpService.ts
import axios from "axios";
import { Logger } from "../../utils/logger";
import { ConductorError, ErrorCodes } from "../../utils/errors";
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
        Logger.debug(
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

        Logger.warn(
          `Request failed, retrying in ${retryDelay}ms... (${attempt}/${maxRetries})`
        );
        await this.delay(retryDelay * attempt); // Exponential backoff
      }
    }

    throw new ConductorError(
      "Request failed after all retries",
      ErrorCodes.CONNECTION_ERROR
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

      let errorMessage = `HTTP ${status}`;
      if (data?.message) {
        errorMessage += `: ${data.message}`;
      } else if (data?.error) {
        errorMessage += `: ${data.error}`;
      }

      const errorCode = this.getErrorCodeFromStatus(status);
      throw new ConductorError(errorMessage, errorCode, {
        status,
        responseData: data,
        url: error.config?.url,
      });
    } else if (error.request) {
      // Request made but no response
      throw new ConductorError(
        "No response received from server",
        ErrorCodes.CONNECTION_ERROR,
        { url: error.config?.url }
      );
    } else {
      // Request setup error
      throw new ConductorError(
        `Request error: ${error.message}`,
        ErrorCodes.CONNECTION_ERROR
      );
    }
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 401:
      case 403:
        return ErrorCodes.AUTH_ERROR;
      case 404:
        return ErrorCodes.FILE_NOT_FOUND;
      case 400:
        return ErrorCodes.VALIDATION_FAILED;
      default:
        return ErrorCodes.CONNECTION_ERROR;
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error.response) {
      return true; // Network errors are retryable
    }

    const status = error.response.status;
    // Retry on server errors, but not client errors
    return status >= 500 || status === 429; // 429 = Too Many Requests
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
