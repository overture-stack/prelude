"use strict";
/**
 * Environment Validation
 *
 * Validates the runtime environment configuration and requirements.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
/**
 * Validates the environment configuration and requirements
 * @param params - Environment validation parameters
 * @throws ConductorError if validation fails
 */
async function validateEnvironment(params) {
    try {
        logger_1.Logger.debug `Starting Environment Validation`;
        // Validate Elasticsearch URL is provided
        if (!params.elasticsearchUrl) {
            throw errors_1.ErrorFactory.environment("Elasticsearch URL is required", { parameter: "elasticsearchUrl" }, [
                "Set ELASTICSEARCH_URL environment variable",
                "Use --url option to specify Elasticsearch URL",
                "Example: --url http://localhost:9200",
            ]);
        }
        // Validate URL format
        try {
            const url = new URL(params.elasticsearchUrl);
            if (!url.protocol || !["http:", "https:"].includes(url.protocol)) {
                throw errors_1.ErrorFactory.environment("Invalid Elasticsearch URL protocol", { url: params.elasticsearchUrl }, [
                    "URL must use http:// or https:// protocol",
                    "Example: http://localhost:9200",
                ]);
            }
            logger_1.Logger.debug `Elasticsearch URL is valid: ${params.elasticsearchUrl}`;
        }
        catch (urlError) {
            if (urlError instanceof Error && urlError.name === "ConductorError") {
                throw urlError;
            }
            throw errors_1.ErrorFactory.environment("Invalid Elasticsearch URL format", { url: params.elasticsearchUrl }, ["Check URL format and syntax", "Example: http://localhost:9200"]);
        }
        logger_1.Logger.debug `Environment validation passed`;
    }
    catch (error) {
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        throw errors_1.ErrorFactory.environment("Environment validation failed", { originalError: error }, [
            "Check system configuration",
            "Use --debug for detailed error information",
        ]);
    }
}
exports.validateEnvironment = validateEnvironment;
