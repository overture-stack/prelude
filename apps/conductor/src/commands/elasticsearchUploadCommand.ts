// src/commands/elasticsearchUploadCommand.ts
/**
 * Elasticsearch Upload Command - CLEAN & FOCUSED
 *
 * Handles uploading CSV data to Elasticsearch indices.
 * Uses shared base class for common functionality.
 * FIXED: Correct imports - validateHeadersMatchMappings is in csvValidator
 */

import { DataUploadCommand } from "./dataUploadCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import {
  createClientFromConfig,
  validateConnection,
} from "../services/elasticsearch";
import { validateIndex } from "../validations/elasticsearchValidator";
import { validateHeadersMatchMappings } from "../validations/csvValidator";
import { processCSVFile } from "../services/csvProcessor";
import { parseCSVLine } from "../services/csvProcessor/csvParser";
import * as fs from "fs";

export class UploadCommand extends DataUploadCommand {
  constructor() {
    super("elasticsearchUpload");
  }

  /**
   * Validates Elasticsearch-specific configuration
   */
  protected async validateSpecific(cliOutput: CLIOutput): Promise<void> {
    const { config } = cliOutput;

    // Check Elasticsearch configuration
    if (!config.elasticsearch) {
      throw ErrorFactory.args("Elasticsearch configuration is required", [
        "Provide Elasticsearch connection details",
        "Example: --host localhost:9200 --index myindex",
      ]);
    }

    if (!config.elasticsearch.index) {
      throw ErrorFactory.args("Elasticsearch index name is required", [
        "Use -i <indexName> to specify the target index",
        "Example: --index documents",
      ]);
    }
  }

  /**
   * Processes a single CSV file to Elasticsearch
   * Validates index and headers before processing
   */
  protected async processFile(filePath: string, config: any): Promise<void> {
    try {
      // Create Elasticsearch client
      const client = createClientFromConfig(config);

      // Validate connection and index
      await validateConnection(client);
      await validateIndex(client, config.elasticsearch.index);

      // Validate CSV headers against index mapping
      await this.validateFileHeaders(filePath, config, client);

      // Process the CSV file
      await processCSVFile(filePath, config, client);
    } catch (error) {
      // Re-throw ConductorErrors as-is (they have proper formatting)
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Wrap other errors with context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw ErrorFactory.validation(
        `Elasticsearch upload failed: ${errorMessage}`,
        {
          filePath,
          indexName: config.elasticsearch.index,
          originalError: error,
        },
        [
          "Check Elasticsearch connection and status",
          "Verify index exists and has correct mapping",
          "Review CSV file format and headers",
        ]
      );
    }
  }

  /**
   * Validates that CSV headers match the Elasticsearch index mapping
   */
  private async validateFileHeaders(
    filePath: string,
    config: any,
    client: any
  ): Promise<void> {
    try {
      Logger.debug`Validating headers against Elasticsearch mapping`;

      // Read and parse CSV headers
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const [headerLine] = fileContent.split("\n");

      if (!headerLine || headerLine.trim().length === 0) {
        throw ErrorFactory.parsing(
          "CSV file appears to be empty or has no headers"
        );
      }

      const parseResult = parseCSVLine(headerLine, config.delimiter, true);
      const headers = parseResult[0];

      if (!headers || headers.length === 0) {
        throw ErrorFactory.parsing(
          "Failed to parse CSV headers",
          {
            headerLine: headerLine.substring(0, 100),
            delimiter: config.delimiter,
          },
          [
            "Check if the first line contains valid headers",
            `Verify '${config.delimiter}' is the correct delimiter`,
            "Ensure headers are properly formatted",
          ]
        );
      }

      // Validate headers against index mapping
      await validateHeadersMatchMappings(
        client,
        headers,
        config.elasticsearch.index
      );

      Logger.debug`Headers validated successfully: ${headers.join(", ")}`;
    } catch (error) {
      // Re-throw ConductorErrors as-is
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Wrap other errors
      throw ErrorFactory.validation(
        "Error validating CSV headers",
        { filePath, originalError: error },
        [
          "Check CSV file format and structure",
          "Ensure headers follow naming conventions",
          "Verify file encoding is UTF-8",
        ]
      );
    }
  }
}
