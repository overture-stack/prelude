/**
 * SONG Schema Validator
 *
 * Validates schema files against SONG-specific requirements based on SONG documentation.
 */
import { ConductorError, ErrorCodes } from "../../utils/errors";

/**
 * Required fields for SONG analysis schemas
 */
const REQUIRED_FIELDS = ["name", "schema"];

/**
 * Validates a schema against SONG-specific requirements
 *
 * @param schema - The schema object to validate
 * @returns Validation result with warnings
 * @throws ConductorError if validation fails with critical issues
 */
export function validateSongSchema(schema: any): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check if schema is an object
  if (!schema || typeof schema !== "object") {
    throw new ConductorError(
      "Invalid schema format: Schema must be a JSON object",
      ErrorCodes.INVALID_FILE
    );
  }

  // Check for required fields
  for (const field of REQUIRED_FIELDS) {
    if (typeof schema[field] === "undefined" || schema[field] === null) {
      throw new ConductorError(
        `Invalid schema: Missing required field '${field}'`,
        ErrorCodes.INVALID_FILE,
        {
          details: `The SONG server requires '${field}' to be present`,
          suggestion: `Add a '${field}' field to your schema`,
        }
      );
    }
  }

  // Validate the "schema" field is an object
  if (typeof schema.schema !== "object") {
    throw new ConductorError(
      "Invalid schema: The 'schema' field must be an object",
      ErrorCodes.INVALID_FILE,
      {
        details:
          "The 'schema' field defines the JSON schema for this analysis type",
        suggestion:
          "Make sure 'schema' is an object containing at least 'type' and 'properties'",
      }
    );
  }

  // Check schema.schema has required properties for a JSON schema
  if (!schema.schema.type) {
    warnings.push(
      "The schema should specify a 'type' property (usually 'object')"
    );
  }

  // Validate schema name format if present
  if (schema.name && typeof schema.name === "string") {
    if (!/^[a-zA-Z0-9_-]+$/.test(schema.name)) {
      warnings.push(
        "Schema name should contain only letters, numbers, hyphens, and underscores"
      );
    }
  }

  // Validate options if provided
  if (schema.options) {
    // Options should be an object
    if (typeof schema.options !== "object") {
      warnings.push("The 'options' field should be an object");
    } else {
      // Check fileTypes if present
      if (schema.options.fileTypes !== undefined) {
        if (!Array.isArray(schema.options.fileTypes)) {
          warnings.push(
            "The 'options.fileTypes' should be an array of strings"
          );
        } else {
          // Check if each fileType is a string
          for (const fileType of schema.options.fileTypes) {
            if (typeof fileType !== "string") {
              warnings.push(
                "Each fileType in 'options.fileTypes' should be a string"
              );
              break;
            }
          }
        }
      }

      // Check externalValidations if present
      if (schema.options.externalValidations !== undefined) {
        if (!Array.isArray(schema.options.externalValidations)) {
          warnings.push(
            "The 'options.externalValidations' should be an array of validation objects"
          );
        } else {
          // Check each external validation
          for (const validation of schema.options.externalValidations) {
            if (typeof validation !== "object") {
              warnings.push(
                "Each validation in 'options.externalValidations' should be an object"
              );
              continue;
            }

            // Check for required fields in each validation
            if (!validation.url) {
              warnings.push(
                "Each external validation should have a 'url' property"
              );
            } else if (typeof validation.url !== "string") {
              warnings.push(
                "The 'url' in external validation should be a string"
              );
            } else {
              // Check for valid URL format with valid placeholders
              const urlPlaceholders =
                validation.url.match(/\{([^}]+)\}/g) || [];
              for (const placeholder of urlPlaceholders) {
                const placeholderName = placeholder.slice(1, -1); // Remove { and }
                if (
                  placeholderName !== "study" &&
                  placeholderName !== "value"
                ) {
                  warnings.push(
                    `URL placeholder ${placeholder} is not valid. Only {study} and {value} are allowed.`
                  );
                }
              }
            }

            if (!validation.jsonPath) {
              warnings.push(
                "Each external validation should have a 'jsonPath' property"
              );
            } else if (typeof validation.jsonPath !== "string") {
              warnings.push(
                "The 'jsonPath' in external validation should be a string"
              );
            }
          }
        }
      }
    }
  }

  // Check if schema.schema has a properties field
  if (!schema.schema.properties) {
    warnings.push(
      "The schema should have a 'properties' field defining the structure"
    );
  } else if (typeof schema.schema.properties !== "object") {
    warnings.push("The 'properties' field should be an object");
  }

  return {
    isValid: true,
    warnings,
  };
}
