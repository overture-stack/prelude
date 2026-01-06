"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
class HttpService {
    constructor(config) {
        this.config = config;
        this.client = axios_1.default.create({
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
        this.client.interceptors.response.use((response) => response, (error) => this.handleAxiosError(error));
    }
    async get(endpoint, options = {}) {
        return this.makeRequest("GET", endpoint, undefined, options);
    }
    async post(endpoint, data, options = {}) {
        return this.makeRequest("POST", endpoint, data, options);
    }
    async put(endpoint, data, options = {}) {
        return this.makeRequest("PUT", endpoint, data, options);
    }
    async delete(endpoint, options = {}) {
        return this.makeRequest("DELETE", endpoint, undefined, options);
    }
    async makeRequest(method, endpoint, data, options = {}) {
        var _a, _b, _c;
        const config = {
            method,
            url: endpoint,
            data,
            timeout: options.timeout || this.config.timeout,
            headers: options.headers,
            params: options.params,
        };
        const maxRetries = (_b = (_a = options.retries) !== null && _a !== void 0 ? _a : this.config.retries) !== null && _b !== void 0 ? _b : 3;
        const retryDelay = (_c = this.config.retryDelay) !== null && _c !== void 0 ? _c : 5000;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger_1.Logger.debug `${method} ${endpoint} (attempt ${attempt}/${maxRetries})`;
                const response = await this.client.request(config);
                return {
                    data: response.data,
                    status: response.status,
                    headers: response.headers,
                };
            }
            catch (error) {
                const isLastAttempt = attempt === maxRetries;
                if (isLastAttempt || !this.isRetryableError(error)) {
                    throw error;
                }
                logger_1.Logger.warnString(`Request failed, retrying in ${retryDelay}ms... (${attempt}/${maxRetries})`);
                await this.delay(retryDelay * attempt); // Exponential backoff
            }
        }
        throw errors_1.ErrorFactory.connection("Request failed after all retries", {
            method,
            endpoint,
            maxRetries,
            timeout: config.timeout,
        }, [
            "Check network connectivity",
            "Verify service is running and accessible",
            "Consider increasing timeout or retry values",
        ]);
    }
    formatAuthToken(token) {
        return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }
    /**
     * FIXED: Handle Axios errors without logging
     * Only create and throw structured ConductorErrors - let command layer log
     */
    handleAxiosError(error) {
        var _a, _b, _c;
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const data = error.response.data;
            const url = ((_a = error.config) === null || _a === void 0 ? void 0 : _a.url) || "unknown endpoint";
            let errorMessage = `HTTP ${status}`;
            if (data === null || data === void 0 ? void 0 : data.message) {
                errorMessage += `: ${data.message}`;
            }
            else if (data === null || data === void 0 ? void 0 : data.error) {
                errorMessage += `: ${data.error}`;
            }
            // NO LOGGING - just throw structured errors
            if (status === 401 || status === 403) {
                throw errors_1.ErrorFactory.auth("Authentication failed", {
                    status,
                    responseData: data,
                    url,
                    statusText: error.response.statusText,
                }, [
                    "Check authentication credentials",
                    "Verify API token is valid and not expired",
                    "Ensure you have proper permissions for this operation",
                    "Contact administrator if credentials should be valid",
                ]);
            }
            if (status === 404) {
                throw errors_1.ErrorFactory.validation("Resource not found", {
                    status,
                    responseData: data,
                    url,
                }, [
                    "Check that the requested resource exists",
                    "Verify the resource ID or endpoint path",
                    "Ensure the service endpoint is correct",
                ]);
            }
            if (status === 400) {
                // Use server error message instead of "Bad request"
                const serverMessage = (data === null || data === void 0 ? void 0 : data.message) ||
                    (data === null || data === void 0 ? void 0 : data.error) ||
                    "Bad request - invalid data or format";
                throw errors_1.ErrorFactory.validation(serverMessage, {
                    status,
                    responseData: data,
                    url,
                });
            }
            if (status === 409) {
                throw errors_1.ErrorFactory.validation("Conflict - resource already exists", {
                    status,
                    responseData: data,
                    url,
                }, [
                    "Resource may already exist",
                    "Check for duplicate entries",
                    "Use force flag if available to overwrite",
                ]);
            }
            if (status === 422) {
                throw errors_1.ErrorFactory.validation("Validation failed", {
                    status,
                    responseData: data,
                    url,
                }, [
                    "Check data format and required fields",
                    "Verify data meets service requirements",
                    (data === null || data === void 0 ? void 0 : data.message) ? `Server message: ${data.message}` : null,
                ].filter(Boolean));
            }
            if (status >= 500) {
                throw errors_1.ErrorFactory.connection("Server error", {
                    status,
                    responseData: data,
                    url,
                }, [
                    "The service encountered an internal error",
                    "Try the request again after a few moments",
                    "Check service logs for more details",
                    "Contact support if the issue persists",
                ]);
            }
            // Generic HTTP error
            throw errors_1.ErrorFactory.connection(errorMessage, {
                status,
                responseData: data,
                url,
            }, [
                `HTTP ${status} error occurred`,
                "Check the request and try again",
                "Verify service configuration",
            ]);
        }
        else if (error.request) {
            // Request made but no response
            const url = ((_b = error.config) === null || _b === void 0 ? void 0 : _b.url) || "unknown endpoint";
            if (error.code === "ECONNREFUSED") {
                throw errors_1.ErrorFactory.connection("Connection refused", {
                    url,
                    code: error.code,
                }, [
                    "Check that the service is running",
                    "Verify the service URL and port",
                    "Check network connectivity",
                    "Review firewall settings",
                ]);
            }
            if (error.code === "ENOTFOUND") {
                throw errors_1.ErrorFactory.connection("Service host not found", {
                    url,
                    code: error.code,
                }, [
                    "Check the service hostname/URL",
                    "Verify DNS resolution",
                    "Check network connectivity",
                ]);
            }
            if (error.code === "ETIMEDOUT") {
                throw errors_1.ErrorFactory.connection("Request timeout", {
                    url,
                    code: error.code,
                    timeout: (_c = error.config) === null || _c === void 0 ? void 0 : _c.timeout,
                }, [
                    "The service is taking too long to respond",
                    "Check service performance and load",
                    "Consider increasing timeout value",
                    "Verify network stability",
                ]);
            }
            throw errors_1.ErrorFactory.connection("No response received from server", {
                url,
                code: error.code,
            }, [
                "Check network connectivity",
                "Verify service is running",
                "Check for network interruptions",
            ]);
        }
        else {
            // Request setup error
            throw errors_1.ErrorFactory.connection("Request configuration error", {
                originalError: error,
                message: error.message,
            }, [
                "Check request configuration",
                "Verify parameters are correct",
                "Contact support if issue persists",
            ]);
        }
    }
    isRetryableError(error) {
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
        if (status >= 500)
            return true; // Server errors
        if (status === 502 || status === 504)
            return true; // Bad Gateway, Gateway Timeout
        if (status === 503)
            return true; // Service Unavailable
        return false;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Get current configuration for debugging
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update request headers for this instance
     */
    setHeaders(headers) {
        this.client.defaults.headers = {
            ...this.client.defaults.headers,
            ...headers,
        };
    }
    /**
     * Update auth token for this instance
     */
    setAuthToken(token) {
        this.client.defaults.headers.Authorization = this.formatAuthToken(token);
    }
}
exports.HttpService = HttpService;
