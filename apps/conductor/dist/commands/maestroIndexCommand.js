"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroIndexCommand = void 0;
// src/commands/maestroIndexCommand.ts - FIXED: Proper error handling for invalid repository codes
const axios_1 = __importDefault(require("axios"));
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const chalk_1 = __importDefault(require("chalk"));
const errors_1 = require("../utils/errors");
/**
 * Command for indexing a repository with optional organization and ID filters
 * FIXED: Better error handling for invalid repository codes and service responses
 */
class MaestroIndexCommand extends baseCommand_1.Command {
    constructor() {
        super("maestroIndex");
        this.TIMEOUT = 30000; // 30 seconds
    }
    /**
     * Override base validation since maestro doesn't need input files
     */
    async validate(cliOutput) {
        const { options } = cliOutput;
        const repositoryCode = options.repositoryCode || process.env.REPOSITORY_CODE;
        if (!repositoryCode) {
            throw errors_1.ErrorFactory.args("Repository code is required", [
                "Use --repository-code option to specify repository",
                "Set REPOSITORY_CODE environment variable",
                "Example: --repository-code lyric.overture",
            ]);
        }
    }
    /**
     * Executes the repository indexing process
     * FIXED: Enhanced error handling and response validation
     */
    async execute(cliOutput) {
        const { options } = cliOutput;
        try {
            // Extract configuration from options or environment variables
            const indexUrl = options.indexUrl || process.env.INDEX_URL || "http://localhost:11235";
            const repositoryCode = options.repositoryCode || process.env.REPOSITORY_CODE;
            const organization = options.organization || process.env.ORGANIZATION;
            const id = options.id || process.env.ID;
            // Validate required parameters
            if (!repositoryCode) {
                throw errors_1.ErrorFactory.args("Repository code not specified", [
                    "Use --repository-code option to specify repository",
                    "Set REPOSITORY_CODE environment variable",
                    "Example: --repository-code lyric.overture",
                ]);
            }
            // Construct the URL based on provided parameters
            let url = `${indexUrl}/index/repository/${repositoryCode}`;
            if (organization) {
                url += `/organization/${organization}`;
                if (id) {
                    url += `/id/${id}`;
                }
            }
            // Log indexing information
            logger_1.Logger.debug `URL: ${url}`;
            logger_1.Logger.debug `Repository Code: ${repositoryCode}`;
            if (organization)
                logger_1.Logger.infoString(`Organization: ${organization}`);
            if (id)
                logger_1.Logger.infoString(`ID: ${id}`);
            // Test connection first with a quick timeout
            logger_1.Logger.debug `Testing connection to indexing service`;
            try {
                await axios_1.default.get(`${indexUrl}/health`, { timeout: 5000 });
                logger_1.Logger.debug `Connection test successful`;
            }
            catch (healthError) {
                // Handle connection issues immediately
                const errorMessage = healthError instanceof Error
                    ? healthError.message
                    : String(healthError);
                if (errorMessage.includes("ECONNREFUSED")) {
                    throw errors_1.ErrorFactory.connection("Cannot connect to indexing service", {
                        serviceUrl: indexUrl,
                        endpoint: `${indexUrl}/health`,
                        originalError: healthError,
                    }, [
                        `Check that the indexing service is running on ${indexUrl}`,
                        "Verify the service URL and port number are correct",
                        "Ensure the service is accessible from your network",
                        `Test manually with: curl ${indexUrl}/health`,
                    ]);
                }
                if (errorMessage.includes("ENOTFOUND")) {
                    throw errors_1.ErrorFactory.connection("Indexing service host not found", {
                        serviceUrl: indexUrl,
                        originalError: healthError,
                    }, [
                        "Check the hostname in the service URL",
                        "Verify DNS resolution for the hostname",
                        "Ensure the service URL is spelled correctly",
                        "Try using an IP address instead of hostname",
                    ]);
                }
                if (errorMessage.includes("ETIMEDOUT")) {
                    throw errors_1.ErrorFactory.connection("Timeout connecting to indexing service", {
                        serviceUrl: indexUrl,
                        timeout: 5000,
                        originalError: healthError,
                    }, [
                        "Check network connectivity to the service",
                        "Verify the service is responding",
                        "Check for network proxy or firewall blocking",
                        "Verify the service port is accessible",
                    ]);
                }
                // Generic connection error
                logger_1.Logger.warnString(`Health check failed, proceeding anyway: ${errorMessage}`);
            }
            // Make the actual indexing request
            logger_1.Logger.infoString("Sending indexing request");
            logger_1.Logger.debug `Making POST request to: ${url}`;
            const response = await axios_1.default.post(url, "", {
                headers: {
                    accept: "application/json",
                },
                timeout: this.TIMEOUT,
                validateStatus: function (status) {
                    // Accept all status codes so we can handle them manually
                    return status < 600;
                },
            });
            logger_1.Logger.debug `Received response - Status: ${response.status}`;
            logger_1.Logger.debug `Response headers: ${JSON.stringify(response.headers)}`;
            logger_1.Logger.debug `Response data: ${JSON.stringify(response.data)}`;
            logger_1.Logger.debug `Response data type: ${typeof response.data}`;
            if (response.data) {
                logger_1.Logger.debug `Response data.successful: ${response.data.successful}`;
                logger_1.Logger.debug `Response data.message: ${response.data.message}`;
            }
            // FIXED: Check response content for error messages BEFORE checking status codes
            const responseData = response.data;
            const responseText = typeof responseData === "string"
                ? responseData
                : JSON.stringify(responseData);
            // Check for specific error messages in the response content
            // The maestro service returns: { "successful": false, "message": "Invalid repository code 'demo'" }
            if ((responseData && responseData.successful === false) ||
                responseText.includes("Invalid repository code") ||
                responseText.includes("Invalid repository information") ||
                (responseData &&
                    responseData.message &&
                    responseData.message.includes("Invalid repository code"))) {
                logger_1.Logger.debug `Detected invalid repository error in response content`;
                const errorMessage = responseData.message || `Repository '${repositoryCode}' not found`;
                throw errors_1.ErrorFactory.validation(errorMessage, {
                    repositoryCode,
                    responseData,
                    status: response.status,
                    errorType: "invalid_repository",
                }, [
                    "Ensure the repository code, '${repositoryCode}' is correct",
                    "Contact administrator to confirm available repositories",
                ]);
            }
            // Handle error status codes
            if (response.status >= 400) {
                logger_1.Logger.debug `Error status detected: ${response.status}`;
                // Create a mock axios error to trigger our error handling
                const error = new Error(`Request failed with status code ${response.status}`);
                error.response = response;
                error.isAxiosError = true;
                throw error;
            }
            // Process successful response
            const successResponseData = response.data;
            // Log success message
            logger_1.Logger.successString(`Repository indexing request successful`);
            logger_1.Logger.generic(chalk_1.default.gray(`    - Repository: ${repositoryCode}`));
            if (organization)
                logger_1.Logger.generic(chalk_1.default.gray(`    - Organization: ${organization}`));
            if (id)
                logger_1.Logger.generic(chalk_1.default.gray(`    - ID: ${id}`));
            if (successResponseData && successResponseData.message) {
                logger_1.Logger.generic(chalk_1.default.gray(`    - Message: ${successResponseData.message}`));
            }
            return {
                success: true,
                details: {
                    repository: repositoryCode,
                    organization: organization || "All",
                    id: id || "All",
                    response: successResponseData,
                },
            };
        }
        catch (error) {
            // Handle errors and return failure result
            return this.handleIndexingError(error, options);
        }
    }
    /**
     * Handle indexing errors with specific categorization
     * FIXED: Better detection of invalid repository errors from response content
     */
    handleIndexingError(error, options) {
        var _a, _b;
        // If it's already a ConductorError, preserve it and ensure it gets logged
        if (error instanceof Error && error.name === "ConductorError") {
            const conductorError = error;
            logger_1.Logger.debug `ConductorError detected - Message: ${conductorError.message}`;
            logger_1.Logger.debug `ConductorError code: ${conductorError.code}`;
            logger_1.Logger.debug `ConductorError suggestions: ${JSON.stringify(conductorError.suggestions)}`;
            // Log the error using Logger
            logger_1.Logger.errorString(conductorError.message);
            // Display suggestions if available
            if (conductorError.suggestions && conductorError.suggestions.length > 0) {
                logger_1.Logger.suggestion("Suggestions");
                conductorError.suggestions.forEach((suggestion) => {
                    logger_1.Logger.tipString(suggestion);
                });
            }
            return {
                success: false,
                errorMessage: conductorError.message,
                errorCode: conductorError.code,
                details: conductorError.details,
            };
        }
        // Handle Axios errors with more detail
        if (this.isAxiosError(error)) {
            const axiosError = error;
            const status = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status;
            const responseData = (_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data;
            const serviceUrl = options.indexUrl || "http://localhost:11235";
            // FIXED: Enhanced detection of repository validation errors
            // Check response content for repository-related errors regardless of status code
            const responseText = typeof responseData === "string"
                ? responseData
                : JSON.stringify(responseData);
            if (responseText.includes("Invalid repository information") ||
                responseText.includes("repository code") ||
                (responseData &&
                    responseData.message &&
                    responseData.message.includes("Invalid repository information"))) {
                const repoNotFoundError = errors_1.ErrorFactory.validation(`Repository '${options.repositoryCode}' not found`, {
                    status,
                    repositoryCode: options.repositoryCode,
                    responseData,
                    errorType: "invalid_repository",
                    serverMessage: responseText,
                }, [
                    "Check that the repository code is correct and exists",
                    "Verify the repository is registered in the indexing service",
                    "Contact administrator to confirm available repositories",
                    `Requested repository: '${options.repositoryCode}'`,
                    "Common repository codes: lyric.overture, song.overture, ego.overture",
                ]);
                return {
                    success: false,
                    errorMessage: repoNotFoundError.message,
                    errorCode: repoNotFoundError.code,
                    details: repoNotFoundError.details,
                };
            }
            // Handle specific HTTP status codes
            if (status === 404) {
                const notFoundError = errors_1.ErrorFactory.validation("Repository not found", {
                    status,
                    repositoryCode: options.repositoryCode,
                    responseData,
                }, [
                    "Verify the repository code is correct",
                    `Check that repository '${options.repositoryCode}' exists`,
                    "Ensure you have access to this repository",
                ]);
                return {
                    success: false,
                    errorMessage: notFoundError.message,
                    errorCode: notFoundError.code,
                    details: notFoundError.details,
                };
            }
            if (status === 401 || status === 403) {
                const authError = errors_1.ErrorFactory.auth("Authentication failed", {
                    status,
                    serviceUrl,
                    responseData,
                }, [
                    "Check your authentication credentials",
                    "Verify you have permissions to index repositories",
                    "Contact administrator for access",
                ]);
                return {
                    success: false,
                    errorMessage: authError.message,
                    errorCode: authError.code,
                    details: authError.details,
                };
            }
            if (status === 400) {
                const badRequestError = errors_1.ErrorFactory.validation("Invalid request parameters", {
                    status,
                    responseData,
                    repositoryCode: options.repositoryCode,
                }, [
                    "Check repository code format and spelling",
                    "Verify organization and ID parameters are valid",
                    (responseData === null || responseData === void 0 ? void 0 : responseData.message)
                        ? `Server message: ${responseData.message}`
                        : null,
                ].filter(Boolean));
                return {
                    success: false,
                    errorMessage: badRequestError.message,
                    errorCode: badRequestError.code,
                    details: badRequestError.details,
                };
            }
            if (status >= 500) {
                const serverError = errors_1.ErrorFactory.connection("Indexing service encountered an error", {
                    status,
                    serviceUrl,
                    responseData,
                }, [
                    "The indexing service is experiencing issues",
                    "Try the request again after a few moments",
                    "Check service logs for more details",
                    "Contact support if the issue persists",
                    (responseData === null || responseData === void 0 ? void 0 : responseData.message)
                        ? `Server message: ${responseData.message}`
                        : null,
                ].filter(Boolean));
                return {
                    success: false,
                    errorMessage: serverError.message,
                    errorCode: serverError.code,
                    details: serverError.details,
                };
            }
            // Handle network-level errors
            if (axiosError.code === "ECONNREFUSED") {
                const connectionError = errors_1.ErrorFactory.connection("Connection refused", {
                    serviceUrl,
                    code: axiosError.code,
                }, [
                    `Ensure the indexing service is running on ${serviceUrl}`,
                    "Check that the service URL and port are correct",
                    "Verify network connectivity",
                    "Review firewall settings",
                ]);
                return {
                    success: false,
                    errorMessage: connectionError.message,
                    errorCode: connectionError.code,
                    details: connectionError.details,
                };
            }
            if (axiosError.code === "ETIMEDOUT") {
                const timeoutError = errors_1.ErrorFactory.connection("Request timeout", {
                    serviceUrl,
                    timeout: this.TIMEOUT,
                    code: axiosError.code,
                }, [
                    `The indexing service did not respond within ${this.TIMEOUT / 1000} seconds`,
                    "Check service performance and load",
                    "Try the request again",
                    "The indexing may still be proceeding in the background",
                ]);
                return {
                    success: false,
                    errorMessage: timeoutError.message,
                    errorCode: timeoutError.code,
                    details: timeoutError.details,
                };
            }
            if (axiosError.code === "ENOTFOUND") {
                const dnsError = errors_1.ErrorFactory.connection("Service host not found", {
                    serviceUrl,
                    code: axiosError.code,
                }, [
                    "Check the service URL spelling and format",
                    "Verify DNS resolution for the hostname",
                    "Ensure network connectivity",
                    "Try using an IP address instead of hostname",
                ]);
                return {
                    success: false,
                    errorMessage: dnsError.message,
                    errorCode: dnsError.code,
                    details: dnsError.details,
                };
            }
            // Generic HTTP error
            const httpError = errors_1.ErrorFactory.connection(`HTTP ${status || "unknown"} error during indexing`, {
                status,
                serviceUrl,
                responseData,
                axiosCode: axiosError.code,
            }, [
                "Check the indexing service status",
                "Verify request parameters",
                "Review service logs for details",
            ]);
            return {
                success: false,
                errorMessage: httpError.message,
                errorCode: httpError.code,
                details: httpError.details,
            };
        }
        // Generic error handling for non-axios errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        const genericError = errors_1.ErrorFactory.connection("Repository indexing failed", { originalError: error }, [
            "Check indexing service availability",
            "Verify network connectivity",
            "Use --debug for detailed error information",
        ]);
        return {
            success: false,
            errorMessage: genericError.message,
            errorCode: genericError.code,
            details: genericError.details,
        };
    }
    /**
     * Type guard to check if an error is an Axios error
     */
    isAxiosError(error) {
        return Boolean(error &&
            typeof error === "object" &&
            "isAxiosError" in error &&
            error.isAxiosError === true);
    }
}
exports.MaestroIndexCommand = MaestroIndexCommand;
