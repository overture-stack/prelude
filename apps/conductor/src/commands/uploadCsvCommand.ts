/**
 * Upload Command
 *
 * Command implementation for uploading CSV data to Elasticsearch.
 * Enhanced with ErrorFactory and improved user feedback.
 */

import { validateBatchSize } from "../validations/elasticsearchValidator";
import { validateDelimiter } from "../validations/utils";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import {
  createClientFromConfig,
  validateConnection,
} from "../services/elasticsearch";
import { processCSVFile } from "../services/csvProcessor";
import {
  validateCSVStructure,
  validateElasticsearchConnection,
  validateIndex,
  validateFiles,
} from "../validations";
import { parseCSVLine } from "../services/csvProcessor/csvParser";
import * as fs from "fs";
import * as path from "path";

export class UploadCommand extends Command {
  /**
   * Creates a new UploadCommand instance.
   */
  constructor() {
    super("upload");
    this.defaultOutputFileName = "upload-results.json";
  }

  /**
   * Executes the upload process for all specified files
   * @param cliOutput The CLI configuration and inputs
   */
  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const { config, filePaths } = cliOutput;

    Logger.info`Starting CSV upload process for ${filePaths.length} file(s)`;

    // Process each file
    let successCount = 0;
    let failureCount = 0;
    const failureDetails: Record<string, any> = {};

    for (const filePath of filePaths) {
      Logger.debug`Processing file: ${filePath}`;

      try {
        await this.processFile(filePath, config);
        Logger.success`Successfully processed: ${path.basename(filePath)}`;
        successCount++;
      } catch (error) {
        failureCount++;
        const fileName = path.basename(filePath);

        // Enhanced error logging with file context
        if (error instanceof Error) {
          Logger.error`Failed to process ${fileName}: ${error.message}`;
          failureDetails[filePath] = {
            fileName,
            message: error.message,
            suggestion: "Check file format and Elasticsearch connectivity",
          };
        } else {
          Logger.error`Failed to process ${fileName} due to unknown error`;
          failureDetails[filePath] = {
            fileName,
            message: "Unknown error occurred",
          };
        }
      }
    }

    // Enhanced result reporting with error throwing
    if (failureCount === 0) {
      Logger.success`All ${successCount} file(s) processed successfully`;
      // Success - method completes normally
    } else if (successCount === 0) {
      // Throw error with suggestions instead of returning failure result
      throw ErrorFactory.validation(
        `Failed to process ${failureCount} file(s)`,
        {
          totalFiles: filePaths.length,
          failureDetails,
          suggestions: [
            "Check that files exist and are readable",
            "Verify CSV format and headers",
            "Ensure Elasticsearch is accessible",
            "Use --debug for detailed error information",
          ],
        }
      );
    } else {
      // Partial success - log warning but don't fail
      Logger.warn`Processed ${successCount} of ${filePaths.length} files successfully`;
      Logger.infoString(`${failureCount} files failed - see details above`);

      // For partial success, we could either succeed or fail depending on requirements
      // Here we'll succeed but warn about partial failures
      Logger.tipString(
        "Some files failed to process - check error details above"
      );
    }
  }

  /**
   * Validates command line arguments and configuration
   * @param cliOutput The CLI configuration and inputs
   * @throws Enhanced errors with specific guidance
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { config, filePaths } = cliOutput;

    // Enhanced file validation
    if (!filePaths || filePaths.length === 0) {
      throw ErrorFactory.args("No CSV files specified for upload", "upload", [
        "Provide one or more CSV files: conductor upload -f data.csv",
        "Use wildcards for multiple files: conductor upload -f *.csv",
        "Specify multiple files: conductor upload -f file1.csv file2.csv",
      ]);
    }

    Logger.debug`Validating ${filePaths.length} input file(s)`;

    // Validate files with enhanced error messages
    const fileValidationResult = await validateFiles(filePaths);
    if (!fileValidationResult.valid) {
      const invalidFiles = filePaths.filter((fp) => !fs.existsSync(fp));
      const nonCsvFiles = filePaths.filter(
        (fp) =>
          fs.existsSync(fp) &&
          !fp.toLowerCase().endsWith(".csv") &&
          !fp.toLowerCase().endsWith(".tsv")
      );

      const suggestions = [
        "Check that file paths are correct",
        "Ensure files exist and are readable",
      ];

      if (invalidFiles.length > 0) {
        suggestions.push(
          `Missing files: ${invalidFiles
            .map((f) => path.basename(f))
            .join(", ")}`
        );
      }

      if (nonCsvFiles.length > 0) {
        suggestions.push("Only CSV and TSV files are supported");
        suggestions.push(
          `Invalid extensions found: ${nonCsvFiles
            .map((f) => path.extname(f))
            .join(", ")}`
        );
      }

      suggestions.push(`Current directory: ${process.cwd()}`);

      throw ErrorFactory.file(
        "Invalid or missing input files",
        filePaths[0],
        suggestions
      );
    }

    // Enhanced delimiter validation
    try {
      validateDelimiter(config.delimiter);
      Logger.debug`Using delimiter: '${config.delimiter}'`;
    } catch (error) {
      throw ErrorFactory.config(
        "Invalid CSV delimiter specified",
        "delimiter",
        [
          "Use a single character delimiter (comma, tab, semicolon, etc.)",
          "Common delimiters: ',' (comma), '\\t' (tab), ';' (semicolon)",
          "Example: conductor upload -f data.csv --delimiter ';'",
        ]
      );
    }

    // Enhanced batch size validation
    try {
      validateBatchSize(config.batchSize);
      Logger.debug`Using batch size: ${config.batchSize}`;
    } catch (error) {
      throw ErrorFactory.config("Invalid batch size specified", "batchSize", [
        "Use a positive number between 1 and 10000",
        "Recommended values: 500-2000 for most files",
        "Smaller batches for large documents, larger for simple data",
        "Example: conductor upload -f data.csv --batch-size 1000",
      ]);
    }

    // Enhanced CSV header validation for each file
    for (const filePath of filePaths) {
      try {
        await this.validateFileHeaders(filePath, config.delimiter);
        Logger.debug`Validated headers for: ${path.basename(filePath)}`;
      } catch (error) {
        if (error instanceof Error) {
          throw ErrorFactory.csv(
            `Invalid CSV structure in file: ${path.basename(filePath)}`,
            filePath,
            undefined,
            [
              "Check that the first row contains valid column headers",
              "Ensure headers use only letters, numbers, and underscores",
              "Remove special characters from column names",
              `Verify delimiter '${config.delimiter}' is correct for this file`,
              "Check file encoding (should be UTF-8)",
            ]
          );
        }
        throw error;
      }
    }

    Logger.debugString("Input validation completed");
  }

  /**
   * Validates headers for a single file with enhanced error context
   */
  private async validateFileHeaders(
    filePath: string,
    delimiter: string
  ): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw ErrorFactory.file(
          `CSV file not found: ${path.basename(filePath)}`,
          filePath
        );
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      const lines = fileContent.split("\n");

      if (lines.length === 0 || !lines[0].trim()) {
        throw ErrorFactory.csv(
          `CSV file is empty or has no headers: ${path.basename(filePath)}`,
          filePath,
          1,
          [
            "Ensure the file contains data",
            "Check that the first row has column headers",
            "Verify file is not corrupted",
          ]
        );
      }

      const headerLine = lines[0];
      const parseResult = parseCSVLine(headerLine, delimiter, true);

      if (!parseResult || !parseResult[0] || parseResult[0].length === 0) {
        throw ErrorFactory.csv(
          `Failed to parse CSV headers in: ${path.basename(filePath)}`,
          filePath,
          1,
          [
            `Check that delimiter '${delimiter}' is correct for this file`,
            "Ensure headers are properly formatted",
            "Verify file encoding (should be UTF-8)",
            "Try a different delimiter if needed: --delimiter ';' or --delimiter '\\t'",
          ]
        );
      }

      const headers = parseResult[0];
      Logger.debug`Found ${headers.length} headers in ${path.basename(
        filePath
      )}`;

      // Validate CSV structure using our validation function
      await validateCSVStructure(headers);
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        // Re-throw our enhanced errors as-is
        throw error;
      }

      // Wrap other errors with enhanced context
      throw ErrorFactory.csv(
        `Error validating CSV headers: ${
          error instanceof Error ? error.message : String(error)
        }`,
        filePath,
        1,
        [
          "Check file format and structure",
          "Ensure proper CSV formatting",
          "Verify file is not corrupted",
          "Try opening the file in a text editor to inspect manually",
        ]
      );
    }
  }

  /**
   * Processes a single file with enhanced error handling
   */
  private async processFile(filePath: string, config: any): Promise<void> {
    const fileName = path.basename(filePath);

    try {
      Logger.info`Processing: ${fileName}`;

      // Set up Elasticsearch client with enhanced error handling
      let client;
      try {
        client = createClientFromConfig(config);
        Logger.debug`Created Elasticsearch client for ${config.elasticsearch.url}`;
      } catch (error) {
        throw ErrorFactory.connection(
          "Failed to create Elasticsearch client",
          "Elasticsearch",
          config.elasticsearch.url,
          [
            "Check Elasticsearch URL format",
            "Verify authentication credentials",
            "Ensure Elasticsearch is running",
            `Test connection: curl ${config.elasticsearch.url}`,
          ]
        );
      }

      // Validate connection with enhanced error handling
      try {
        await validateConnection(client);
        Logger.debug`Validated connection to Elasticsearch`;
      } catch (error) {
        throw ErrorFactory.connection(
          "Cannot connect to Elasticsearch",
          "Elasticsearch",
          config.elasticsearch.url,
          [
            "Check that Elasticsearch is running and accessible",
            "Verify network connectivity",
            "Confirm authentication credentials are correct",
            "Check firewall and security group settings",
            `Test manually: curl ${config.elasticsearch.url}/_cluster/health`,
          ]
        );
      }

      // Validate index with enhanced error handling
      try {
        await validateIndex(client, config.elasticsearch.index);
        Logger.debug`Validated index: ${config.elasticsearch.index}`;
      } catch (error) {
        throw ErrorFactory.index(
          `Target index '${config.elasticsearch.index}' is not accessible`,
          config.elasticsearch.index,
          [
            `Create the index first: PUT /${config.elasticsearch.index}`,
            "Check index permissions and mappings",
            "Verify index name is correct",
            `List available indices: GET /_cat/indices`,
            "Use a different index name with --index parameter",
          ]
        );
      }

      // Process the file with enhanced progress tracking
      Logger.info`Uploading data from ${fileName} to index '${config.elasticsearch.index}'`;
      await processCSVFile(filePath, config, client);
    } catch (error) {
      // Add file context to any errors that bubble up
      if (error instanceof Error && error.name === "ConductorError") {
        // Re-throw our enhanced errors
        throw error;
      }

      // Wrap unexpected errors with file context
      throw ErrorFactory.file(
        `Failed to process CSV file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        filePath,
        [
          "Check file format and content",
          "Verify Elasticsearch connectivity",
          "Ensure sufficient permissions",
          "Use --debug flag for detailed error information",
        ]
      );
    }
  }
}
