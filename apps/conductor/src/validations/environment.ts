/**
 * Environment Validation
 *
 * Validates the runtime environment configuration and requirements.
 */

import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";

interface EnvironmentValidationParams {
  elasticsearchUrl: string;
}

/**
 * Validates the environment configuration and requirements
 * @param params - Environment validation parameters
 * @throws ConductorError if validation fails
 */
export async function validateEnvironment(
  params: EnvironmentValidationParams
): Promise<void> {
  try {
    Logger.debug`Starting Environment Validation`;

    // Validate Elasticsearch URL is provided
    if (!params.elasticsearchUrl) {
      throw ErrorFactory.environment(
        "Elasticsearch URL is required",
        { parameter: "elasticsearchUrl" },
        [
          "Set ELASTICSEARCH_URL environment variable",
          "Use --url option to specify Elasticsearch URL",
          "Example: --url http://localhost:9200",
        ]
      );
    }

    // Validate URL format
    try {
      const url = new URL(params.elasticsearchUrl);

      if (!url.protocol || !["http:", "https:"].includes(url.protocol)) {
        throw ErrorFactory.environment(
          "Invalid Elasticsearch URL protocol",
          { url: params.elasticsearchUrl },
          [
            "URL must use http:// or https:// protocol",
            "Example: http://localhost:9200",
          ]
        );
      }

      Logger.debug`Elasticsearch URL is valid: ${params.elasticsearchUrl}`;
    } catch (urlError) {
      if (urlError instanceof Error && urlError.name === "ConductorError") {
        throw urlError;
      }

      throw ErrorFactory.environment(
        "Invalid Elasticsearch URL format",
        { url: params.elasticsearchUrl },
        ["Check URL format and syntax", "Example: http://localhost:9200"]
      );
    }

    Logger.debug`Environment validation passed`;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.environment(
      "Environment validation failed",
      { originalError: error },
      [
        "Check system configuration",
        "Use --debug for detailed error information",
      ]
    );
  }
}
