/**
 * Environment Validation
 *
 * Validates the runtime environment configuration and requirements.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";

interface EnvironmentValidationParams {
  elasticsearchUrl: string;
  // Add other relevant environment parameters
}

/**
 * Validates the environment configuration and requirements
 * Enhanced with ErrorFactory for consistent error handling
 */
export async function validateEnvironment(
  params: EnvironmentValidationParams
): Promise<void> {
  Logger.debug`Starting environment validation`;

  // Enhanced Elasticsearch URL validation
  if (!params.elasticsearchUrl) {
    Logger.warn`No Elasticsearch URL provided defaulting to http://localhost:9200`;
    Logger.tip`Set Elasticsearch URL: conductor upload --url http://localhost:9200`;
  }

  // Enhanced URL format validation
  try {
    const url = new URL(params.elasticsearchUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw ErrorFactory.config(
        `Invalid Elasticsearch URL protocol: ${url.protocol}`,
        "elasticsearchUrl",
        [
          "Use HTTP or HTTPS protocol",
          "Example: http://localhost:9200",
          "Example: https://elasticsearch.company.com:9200",
          "Check if SSL/TLS is required for your Elasticsearch instance",
        ]
      );
    }
    Logger.debug`Elasticsearch URL validated: ${params.elasticsearchUrl}`;
  } catch (urlError) {
    if (urlError instanceof Error && urlError.name === "ConductorError") {
      throw urlError;
    }

    throw ErrorFactory.config(
      `Invalid Elasticsearch URL format: ${params.elasticsearchUrl}`,
      "elasticsearchUrl",
      [
        "Use a valid URL format with protocol",
        "Example: http://localhost:9200",
        "Example: https://elasticsearch.company.com:9200",
        "Check for typos in the URL",
        "Ensure proper protocol (http:// or https://)",
      ]
    );
  }

  // Add additional environment validations as needed
  // Example: Node.js version check
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

  if (majorVersion < 14) {
    Logger.warn`Node.js version ${nodeVersion} is quite old`;
    Logger.tipString(
      "Consider upgrading to Node.js 16+ for better performance and security"
    );
  }

  // Example: Memory check for large operations
  const totalMemory = Math.round(require("os").totalmem() / 1024 / 1024 / 1024);
  if (totalMemory < 2) {
    Logger.warn`Low system memory detected: ${totalMemory}GB`;
    Logger.tipString(
      "Large CSV uploads may require more memory - consider using smaller batch sizes"
    );
  }

  Logger.success`Environment validation passed`;
}
