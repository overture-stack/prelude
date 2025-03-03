/**
 * Elasticsearch Templates Module
 *
 * Provides functions for managing Elasticsearch index templates.
 */

import { Client } from "@elastic/elasticsearch";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Interface for template extraction results
 */
export interface TemplateInfo {
  /** Default index name derived from template pattern */
  defaultIndexName?: string;

  /** Default alias name from template */
  defaultAliasName?: string;

  /** Number of shards from template settings */
  numberOfShards?: number;

  /** Number of replicas from template settings */
  numberOfReplicas?: number;
}

/**
 * Checks if a template exists in Elasticsearch
 *
 * @param client - Elasticsearch client
 * @param templateName - Name of the template to check
 * @returns Promise resolving to true if template exists, false otherwise
 * @throws ConductorError if the check fails
 */
export async function templateExists(
  client: Client,
  templateName: string
): Promise<boolean> {
  try {
    const response = await client.indices.existsTemplate({
      name: templateName,
    });
    return response.body;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `Failed to check if template ${templateName} exists: ${errorMessage}`,
      ErrorCodes.ES_ERROR,
      error
    );
  }
}

/**
 * Creates a template in Elasticsearch
 *
 * @param client - Elasticsearch client
 * @param templateName - Name of the template to create
 * @param templateBody - Template configuration object
 * @throws ConductorError if template creation fails
 */
export async function createTemplate(
  client: Client,
  templateName: string,
  templateBody: Record<string, any>
): Promise<void> {
  try {
    await client.indices.putTemplate({
      name: templateName,
      body: templateBody,
    });
    Logger.info(`Created template: ${templateName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `Failed to create template ${templateName}: ${errorMessage}`,
      ErrorCodes.ES_ERROR,
      error
    );
  }
}

/**
 * Updates an existing template in Elasticsearch
 *
 * @param client - Elasticsearch client
 * @param templateName - Name of the template to update
 * @param templateBody - Template configuration object
 * @throws ConductorError if template update fails
 */
export async function updateTemplate(
  client: Client,
  templateName: string,
  templateBody: Record<string, any>
): Promise<void> {
  try {
    // Check if template exists first
    const exists = await templateExists(client, templateName);
    if (!exists) {
      throw new ConductorError(
        `Template ${templateName} does not exist`,
        ErrorCodes.ES_ERROR
      );
    }

    // Update the template
    await client.indices.putTemplate({
      name: templateName,
      body: templateBody,
    });
    Logger.info(`Updated template: ${templateName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `Failed to update template ${templateName}: ${errorMessage}`,
      ErrorCodes.ES_ERROR,
      error
    );
  }
}

/**
 * Deletes a template from Elasticsearch
 *
 * @param client - Elasticsearch client
 * @param templateName - Name of the template to delete
 * @throws ConductorError if template deletion fails
 */
export async function deleteTemplate(
  client: Client,
  templateName: string
): Promise<void> {
  try {
    await client.indices.deleteTemplate({
      name: templateName,
    });
    Logger.info(`Deleted template: ${templateName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConductorError(
      `Failed to delete template ${templateName}: ${errorMessage}`,
      ErrorCodes.ES_ERROR,
      error
    );
  }
}

/**
 * Extracts useful information from a template body
 *
 * @param templateBody - Template configuration object
 * @returns Template information including default index name and alias
 */
export function extractTemplateInfo(
  templateBody: Record<string, any>
): TemplateInfo {
  const info: TemplateInfo = {};

  try {
    // Extract default index name from index patterns
    if (
      templateBody.index_patterns &&
      Array.isArray(templateBody.index_patterns) &&
      templateBody.index_patterns.length > 0
    ) {
      const pattern = templateBody.index_patterns[0];
      // Replace wildcard with timestamp
      info.defaultIndexName = pattern.replace(/\*$/, Date.now());
      Logger.debug(
        `Extracted default index name: ${info.defaultIndexName} from pattern: ${pattern}`
      );
    }

    // Extract default alias from aliases
    if (templateBody.aliases && typeof templateBody.aliases === "object") {
      const aliasNames = Object.keys(templateBody.aliases);
      if (aliasNames.length > 0) {
        info.defaultAliasName = aliasNames[0];
        Logger.debug(`Extracted default alias name: ${info.defaultAliasName}`);
      }
    }

    // Extract settings information
    if (templateBody.settings) {
      if (templateBody.settings.number_of_shards) {
        info.numberOfShards = parseInt(
          templateBody.settings.number_of_shards,
          10
        );
      }

      if (templateBody.settings.number_of_replicas) {
        info.numberOfReplicas = parseInt(
          templateBody.settings.number_of_replicas,
          10
        );
      }
    }
  } catch (error) {
    Logger.warn(
      `Failed to extract template information: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return info;
}
