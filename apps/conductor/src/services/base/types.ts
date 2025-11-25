// src/services/base/types.ts
export interface ServiceConfig {
  url: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  authToken?: string;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
}

export interface ServiceResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface HealthCheckResult {
  healthy: boolean;
  status?: string;
  message?: string;
  responseTime?: number;
}
