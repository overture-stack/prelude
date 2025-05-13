/**
 * Upload Command
 *
 * Command implementation for uploading CSV data to Elasticsearch.
 */

import { validateBatchSize } from "../validations/elasticsearchValidator";
import { validateDelimiter } from "../validations/utils";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorCodes } from "../utils/errors";
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
   * @returns Promise<CommandResult> with success/failure information
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, filePaths } = cliOutput;

    Logger.info(`Input files specified: ${filePaths.length}`);

    // Validate common settings before processing files
    this.validateCommonSettings(config);

    // Process each file
    let successCount = 0;
    let failureCount = 0;
    const failureDetails: Record<string, any> = {};

    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      Logger.info(`Processing file: ${fileName}`);

      try {
        await this.processFile(filePath, config);
        Logger.success(`Successfully processed ${fileName}`);
        successCount++;
      } catch (error) {
        failureCount++;
        
        // Simplified error format:
        // protein.csv: Failed to process 'protein.csv' - Data format doesn't match index mapping
        if (error instanceof ConductorError) {
          Logger.info(`${fileName}: Failed to process '${fileName}' - ${error.message}`);
          
          failureDetails[filePath] = {
            code: error.code,
            message: error.message,
            details: error.details,
          };
        } else if (error instanceof Error) {
          console.log(`${fileName}: Failed to process '${fileName}' - ${error.message}`);
          failureDetails[filePath] = {
            message: error.message,
          };
        } else {
          console.log(`${fileName}: Failed to process '${fileName}' - Unknown error`);
          failureDetails[filePath] = {
            message: "Unknown error",
          };
        }
      }
    }

    // Return the CommandResult with appropriate status and details
    if (failureCount === 0) {
      return {
        success: true,
        details: {
          filesProcessed: successCount
        },
      };
    } else if (successCount === 0) {
   
      return {
        success: false,
        errorMessage: `Failed to process all ${failureCount} files`,
        errorCode: ErrorCodes.VALIDATION_FAILED,
        details: {
          failureDetails
        },
      };
    } else {
      // Partial success
      return {
        success: true,
        details: {
          filesProcessed: successCount,
          filesFailed: failureCount,
          failureDetails
        },
      };
    }
  }

  /**
   * Validates common settings that apply to all files
   */
  private validateCommonSettings(config: any): void {
    validateDelimiter(config.delimiter);
    validateBatchSize(config.batchSize);
  }

  /**
   * Processes a single file
   */
  private async processFile(filePath: string, config: any): Promise<void> {
    const fileName = path.basename(filePath);
    
    // Validate file and CSV structure
    await validateFiles([filePath]);
    await this.validateCSVHeaders(filePath, config.delimiter);

    // Set up Elasticsearch client
    const client = createClientFromConfig(config);

    try {
      // Validate Elasticsearch connection
      await validateConnection(client);
    } catch (error) {
      throw new ConductorError(
        `Elasticsearch connection failed: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.CONNECTION_ERROR,
        { originalError: error }
      );
    }

    try {
      // Validate index exists
      await validateIndex(client, config.elasticsearch.index);
    } catch (error) {
      if (error instanceof ConductorError && error.code === ErrorCodes.INDEX_NOT_FOUND) {
        throw new ConductorError(
          `Index "${config.elasticsearch.index}" not found`,
          ErrorCodes.INDEX_NOT_FOUND,
          {
            suggestion: `Create the index first using the indexManagement command`
          }
        );
      }
      throw error;
    }

    // Process the file
    try {
      await processCSVFile(filePath, config, client);
    } catch (error) {
      // For Elasticsearch mapping errors, provide a cleaner error message
      if (error instanceof ConductorError && error.code === ErrorCodes.ES_ERROR) {
        // The message already contains the file name from the processCSVFile function
        throw error;
      }
      
      // For other errors, add file name to error message
      if (error instanceof Error) {
        throw new ConductorError(
          `${error.message}`,
          ErrorCodes.CSV_ERROR,
          { originalError: error }
        );
      }
      
      // Rethrow unknown errors
      throw error;
    }
  }

  /**
   * Validates CSV headers by reading the first line
   */
  private async validateCSVHeaders(
    filePath: string,
    delimiter: string
  ): Promise<boolean> {
    const fileName = path.basename(filePath);
    
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const [headerLine] = fileContent.split("\n");

      if (!headerLine) {
        throw new ConductorError(
          `CSV file is empty or has no headers`,
          ErrorCodes.INVALID_FILE
        );
      }

      const parseResult = parseCSVLine(headerLine, delimiter, true);
      if (!parseResult || !parseResult[0]) {
        throw new ConductorError(
          `Failed to parse CSV headers`,
          ErrorCodes.PARSING_ERROR
        );
      }

      const headers = parseResult[0];

      // Validate CSV structure
      await validateCSVStructure(headers);
      return true;
    } catch (error) {
      if (error instanceof ConductorError) {
        // Add file name to error message
        throw new ConductorError(
          `${error.message}`,
          error.code,
          error.details
        );
      }
      
      throw new ConductorError(
        `Error validating CSV headers`,
        ErrorCodes.VALIDATION_FAILED,
        { originalError: error }
      );
    }
  }
}