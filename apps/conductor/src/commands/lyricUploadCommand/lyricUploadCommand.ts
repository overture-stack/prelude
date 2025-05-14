import { Command, CommandResult } from "../baseCommand";
import { CLIOutput } from "../../types/cli";
import { Logger } from "../../utils/logger";
import chalk from "chalk";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

import { ConductorError, ErrorCodes } from "../../utils/errors";

// Import services and utilities
import { LyricCategoriesService } from "./services/lyric-categories.service";
import { LecternSchemasService } from "./services/lectern-schemas.service";
import { FilePreparationService } from "./services/file-preparation.service";
import { ErrorHandlerUtility } from "./utils/error-handler";

// Import interfaces
// Import interfaces
import { LyricSubmissionResponse } from "./interfaces/submission-error.interface";
import { LyricCategory } from "./interfaces/lyric-category.interface";

/**
 * Command for loading data into Lyric
 */
export class LyricUploadCommand extends Command {
  private readonly MAX_RETRIES = 0;
  private readonly RETRY_DELAY = 20000; // 20 seconds

  constructor() {
    super("Lyric Data Loading");
  }

  /**
   * Executes the Lyric data loading process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    // Ensure config exists
    if (!cliOutput.config) {
      throw new ConductorError(
        "Configuration is missing",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Extract configuration with fallbacks
    const lyricUrl =
      cliOutput.config.lyric?.url ||
      process.env.LYRIC_URL ||
      "http://localhost:3030";
    const lecternUrl =
      cliOutput.config.lectern?.url ||
      process.env.LECTERN_URL ||
      "http://localhost:3031";
    const dataDirectoryOrFile =
      FilePreparationService.resolveDataPath(cliOutput);
    const categoryId =
      cliOutput.config.lyric?.categoryId || process.env.CATEGORY_ID || "1";
    const organization =
      cliOutput.config.lyric?.organization ||
      process.env.ORGANIZATION ||
      "OICR";
    const maxRetries = parseInt(
      String(
        cliOutput.config.lyric?.maxRetries || process.env.MAX_RETRIES || "0"
      )
    );
    const retryDelay = parseInt(
      String(
        cliOutput.config.lyric?.retryDelay || process.env.RETRY_DELAY || "20000"
      )
    );

    try {
      // Print data loading information
      Logger.info(`\x1b[1;36mStarting data loading process...\x1b[0m`);
      Logger.info(`Lyric URL: ${lyricUrl}`);
      Logger.info(`Lectern URL: ${lecternUrl}`);
      Logger.info(`Data Source: ${dataDirectoryOrFile}`);
      Logger.info(`Category ID: ${categoryId}`);
      Logger.info(`Organization: ${organization}`);
      Logger.info(`Max Retries: ${maxRetries}`);

      // 1. Get available cacdtegories from Lyric (for better error handling)
      const availableCategories = await LyricCategoriesService.fetchCategories(
        lyricUrl
      );

      // 2. Validate the category ID early
      const isValidCategory = LyricCategoriesService.validateCategoryId(
        categoryId,
        availableCategories
      );
      if (!isValidCategory) {
        throw new ConductorError(
          `Invalid category ID: ${categoryId}`,
          ErrorCodes.INVALID_ARGS,
          {
            availableCategories,
            suggestion: `Please use a valid category ID. Available categories are: ${LyricCategoriesService.formatCategories(
              availableCategories
            )}`,
          }
        );
      }

      // 3. Get available schemas from Lectern
      Logger.info(`Fetching available schemas from Lectern...`);
      const schemas = await LecternSchemasService.fetchSchemas(lecternUrl);

      if (schemas.length === 0) {
        throw new ConductorError(
          "No schemas found in Lectern. Cannot proceed without valid schemas.",
          ErrorCodes.CONNECTION_ERROR,
          {
            suggestion:
              "Make sure your Lectern instance is properly configured with at least one dictionary and schema.",
          }
        );
      }

      // Display available schemas
      Logger.info(`Available schemas in Lectern:`);
      schemas.forEach((schema, index) => {
        Logger.info(`${index + 1}. ${schema.name}`);
      });

      // 4. Find all CSV files to upload
      const originalCsvFilePaths =
        FilePreparationService.findCSVFiles(dataDirectoryOrFile);

      if (originalCsvFilePaths.length === 0) {
        throw new ConductorError(
          `No CSV files found at path: ${dataDirectoryOrFile}`,
          ErrorCodes.FILE_NOT_FOUND,
          {
            suggestion:
              "Make sure you have valid CSV files at the specified path.",
          }
        );
      }

      Logger.info(`Found ${originalCsvFilePaths.length} CSV files:`);
      originalCsvFilePaths.forEach((file) => {
        Logger.info(`- ${path.basename(file)}`);
      });

      // 5. Rename files if needed to match schema names
      const csvFilePaths = await FilePreparationService.prepareFilesForUpload(
        originalCsvFilePaths,
        schemas
      );

      if (csvFilePaths.length === 0) {
        throw new ConductorError(
          "No valid files to submit after schema matching.",
          ErrorCodes.INVALID_ARGS,
          {
            suggestion:
              "Rename your CSV files to match one of the available schemas or use the auto-rename feature.",
          }
        );
      }

      // 6. Submit the properly named files to Lyric
      const result = await this.submitFiles({
        categoryId,
        organization,
        csvFilePaths,
        lyricUrl,
        maxRetries,
        retryDelay,
      });

      // Log success message
      Logger.success(`Data loading completed successfully`);
      Logger.generic(" ");
      Logger.generic(chalk.gray(`    - Submission ID: ${result.submissionId}`));
      Logger.generic(chalk.gray(`    - Status: ${result.status}`));
      Logger.generic(" ");

      return {
        success: true,
        details: result,
      };
    } catch (error) {
      // Handle errors and provide helpful messages
      return this.handleExecutionError(error, lyricUrl);
    }
  }

  /**
   * Submit files to Lyric service
   */
  private async submitFiles(params: {
    categoryId: string;
    organization: string;
    csvFilePaths: string[];
    lyricUrl: string;
    maxRetries: number;
    retryDelay: number;
  }): Promise<LyricSubmissionResponse> {
    const {
      categoryId,
      organization,
      csvFilePaths,
      lyricUrl,
      maxRetries,
      retryDelay,
    } = params;

    try {
      // Normalize URL
      const url = `${lyricUrl.replace(
        /\/$/,
        ""
      )}/submission/category/${categoryId}/data`;

      // Filter out any invalid CSV files
      const validFiles = csvFilePaths.filter((filePath) => {
        try {
          const stats = fs.statSync(filePath);
          return (
            stats.isFile() &&
            stats.size > 0 &&
            path.extname(filePath).toLowerCase() === ".csv"
          );
        } catch (err) {
          Logger.warn(
            `Skipping ${path.basename(filePath)} - error accessing file: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          return false;
        }
      });

      if (validFiles.length === 0) {
        throw new ConductorError(
          "No valid CSV files to submit after filtering",
          ErrorCodes.INVALID_ARGS,
          {
            suggestion: "Ensure your CSV files are valid and not empty.",
          }
        );
      }

      // Create a FormData object for the submission
      const formData = new FormData();

      // Add each file to the form data
      for (const filePath of validFiles) {
        try {
          const fileContent = fs.readFileSync(filePath);
          const fileName = path.basename(filePath);
          const blob = new Blob([fileContent], { type: "text/csv" });
          formData.append("files", blob, fileName);
          Logger.debug(`Added file to submission: ${fileName}`);
        } catch (error) {
          Logger.warn(
            `Error reading file ${filePath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Add organization
      formData.append("organization", organization);

      // Log the submission information
      Logger.info(`\x1b[1;36mSubmitting Data:\x1b[0m`);
      Logger.info(`API URL: ${url}`);
      Logger.info(
        `Files to submit: ${validFiles
          .map((file) => path.basename(file))
          .join(", ")}`
      );
      Logger.info(`Organization: ${organization}`);

      // Submit the data
      const response = await axios.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      });

      // Type the response data properly
      const responseData = response.data as { submissionId?: string };

      // Extract submission ID from response
      const submissionId = responseData?.submissionId;
      if (!submissionId) {
        throw new ConductorError(
          "Could not extract submission ID from response",
          ErrorCodes.CONNECTION_ERROR,
          { response: responseData }
        );
      }

      Logger.success(`Submission created with ID: ${submissionId}`);

      // Wait for validation to complete
      const status = await this.waitForValidation(
        submissionId,
        lyricUrl,
        maxRetries,
        retryDelay
      );

      // Commit the submission if valid
      if (status === "VALID") {
        await this.commitSubmission(categoryId, submissionId, lyricUrl);
        return {
          submissionId: submissionId.toString(),
          status: "COMMITTED",
        };
      } else {
        // Fetch and display detailed validation errors
        const errorDetails =
          await ErrorHandlerUtility.fetchDetailedValidationErrors(
            submissionId,
            lyricUrl
          );
        // Try to log and process errors with more context
        Logger.error(
          `Detailed validation errors for submission ${submissionId}:`
        );
        Logger.error(`Total Errors: ${errorDetails.totalErrors || 0}`);
        // Display the detailed validation errors
        ErrorHandlerUtility.displayValidationErrors(
          errorDetails,
          path.basename(validFiles[0]),
          lyricUrl
        );
        // Try to extract more context from raw error data if available
        const additionalContext = errorDetails.rawErrorData
          ? { rawErrorData: errorDetails.rawErrorData }
          : {};
        throw new ConductorError(
          `Submission has unexpected status: ${status}. Validation failed.`,
          ErrorCodes.VALIDATION_FAILED,
          {
            submissionId,
            status,
            totalErrors: errorDetails.totalErrors,
            errorSamples: errorDetails.errorSamples,
            suggestion:
              "Check the detailed error report above to correct your data file.",
            ...additionalContext,
          }
        );
      }
    } catch (error) {
      if (error instanceof ConductorError) {
        throw error;
      }

      // Handle axios errors specifically
      if (this.isAxiosError(error)) {
        const axiosError = error as any;

        // Check for category ID errors
        if (
          axiosError.response?.status === 400 &&
          axiosError.response?.data?.message?.includes("categoryId is invalid")
        ) {
          // Fetch available categories to provide in the error message
          try {
            const availableCategories =
              await LyricCategoriesService.fetchCategories(params.lyricUrl);
            throw new ConductorError(
              "Invalid category ID",
              ErrorCodes.INVALID_ARGS,
              {
                providedCategoryId: categoryId,
                availableCategories,
                suggestion: `Please use a valid category ID. Available categories are: ${LyricCategoriesService.formatCategories(
                  availableCategories
                )}`,
              }
            );
          } catch (innerError) {
            // Fall back to generic error if we can't fetch categories
            throw new ConductorError(
              "Invalid category ID",
              ErrorCodes.INVALID_ARGS,
              {
                providedCategoryId: categoryId,
                suggestion:
                  "Please use a valid category ID. Use the numeric ID instead of the name.",
              }
            );
          }
        }

        throw new ConductorError(
          `Data submission failed: ${axiosError.response?.status || ""} ${
            axiosError.message
          }`,
          ErrorCodes.CONNECTION_ERROR,
          {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            suggestion: "Check network connection and Lyric server status.",
          }
        );
      }

      throw new ConductorError(
        `Data submission failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.CONNECTION_ERROR,
        {
          error: error instanceof Error ? error.stack : String(error),
          suggestion: "Check your network connection and Lyric server status.",
        }
      );
    }
  }

  /**
   * Wait for validation to complete
   */
  private async waitForValidation(
    submissionId: string,
    lyricUrl: string,
    maxRetries: number,
    retryDelay: number
  ): Promise<string> {
    let retries = 0;

    Logger.info(`Waiting for server to validate submission ${submissionId}...`);
    Logger.info(
      `This may take a few minutes depending on file size and complexity.`
    );

    while (retries < maxRetries) {
      Logger.info(
        `Checking validation status (attempt ${retries + 1}/${maxRetries})...`
      );

      try {
        const response = await axios.get(
          `${lyricUrl}/submission/${submissionId}`,
          {
            headers: { accept: "application/json" },
            timeout: 10000, // 10 second timeout for status check
          }
        );

        const responseData = response.data as { status?: string };
        const status = responseData?.status;

        if (!status) {
          throw new ConductorError(
            "Could not extract status from response",
            ErrorCodes.CONNECTION_ERROR,
            {
              response: responseData,
              suggestion:
                "Response format may have changed. Check Lyric server documentation.",
            }
          );
        }

        Logger.info(`Current status: ${status}`);

        if (status === "VALID") {
          Logger.success(`Submission validation passed`);
          return status;
        } else if (status === "INVALID") {
          throw new ConductorError(
            "Submission validation failed",
            ErrorCodes.VALIDATION_FAILED,
            {
              submissionId,
              status,
              suggestion: `Check validation details at ${lyricUrl}/submission/${submissionId} in your browser`,
            }
          );
        }

        // Wait for next check
        Logger.info(
          `Waiting ${retryDelay / 1000} seconds before next check...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retries++;
      } catch (error) {
        if (error instanceof ConductorError) {
          throw error;
        }

        if (
          this.isAxiosError(error) &&
          (error as any).response?.status === 404
        ) {
          throw new ConductorError(
            `Submission ${submissionId} not found. It may have been deleted or never created.`,
            ErrorCodes.CONNECTION_ERROR,
            {
              submissionId,
              suggestion: "Check the submission ID and Lyric server status.",
            }
          );
        }

        throw new ConductorError(
          `Error checking submission status: ${
            error instanceof Error ? error.message : String(error)
          }`,
          ErrorCodes.CONNECTION_ERROR,
          {
            error: error instanceof Error ? error.stack : String(error),
            submissionId,
            retryCount: retries,
            suggestion:
              "Check your network connection and Lyric server status.",
          }
        );
      }
    }

    throw new ConductorError(
      `Validation timed out after ${maxRetries} attempts`,
      ErrorCodes.CONNECTION_ERROR,
      {
        submissionId,
        attempts: maxRetries,
        totalWaitTime: `${(maxRetries * retryDelay) / 1000} seconds`,
        suggestion: `Your submission may still be processing. Check status manually at ${lyricUrl}/submission/${submissionId}`,
      }
    );
  }

  /**
   * Commit a submission
   */
  private async commitSubmission(
    categoryId: string,
    submissionId: string,
    lyricUrl: string
  ): Promise<boolean> {
    try {
      Logger.info(`\x1b[1;36mCommitting Submission:\x1b[0m ${submissionId}`);

      // Make commit request
      const commitUrl = `${lyricUrl}/submission/category/${categoryId}/commit/${submissionId}`;
      await axios.post(commitUrl, null, {
        headers: {
          accept: "application/json",
        },
        timeout: 20000,
      });

      Logger.success(`Submission committed successfully`);
      return true;
    } catch (error) {
      // Handle commit errors with more context
      if (this.isAxiosError(error)) {
        const axiosError = error as any;

        // Special handling for 409 Conflict (already committed)
        if (axiosError.response?.status === 409) {
          Logger.warn(`Submission may already be committed`);
          return true;
        }

        throw new ConductorError(
          `Failed to commit submission: ${axiosError.response?.status || ""} ${
            axiosError.message
          }`,
          ErrorCodes.CONNECTION_ERROR,
          {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            submissionId,
            categoryId,
            suggestion: "Check Lyric server logs for more details.",
          }
        );
      }

      throw new ConductorError(
        `Failed to commit submission: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.CONNECTION_ERROR,
        {
          error: error instanceof Error ? error.stack : String(error),
          submissionId,
          categoryId,
          suggestion: "Check your network connection and Lyric server status.",
        }
      );
    }
  }

  /**
   * Type guard to check if an error is an Axios error
   */
  private isAxiosError(error: any): boolean {
    return Boolean(
      error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        error.isAxiosError === true
    );
  }

  /**
   * Handle execution errors with helpful user feedback
   */
  private handleExecutionError(
    error: unknown,
    lyricUrl: string
  ): CommandResult {
    // Special handling for common error scenarios
    if (error instanceof ConductorError) {
      // Category validation errors
      if (
        error.code === ErrorCodes.INVALID_ARGS &&
        error.details?.availableCategories
      ) {
        ErrorHandlerUtility.handleCategoryError(
          error,
          error.details.availableCategories as LyricCategory[]
        );
      }
      // Validation failures
      else if (error.code === ErrorCodes.VALIDATION_FAILED) {
        Logger.info(
          "\nSubmission validation failed. Please check your data files for errors."
        );

        if (error.details?.status) {
          Logger.info(`Status: ${error.details.status}`);
        }

        if (error.details?.submissionId) {
          Logger.info(`Submission ID: ${error.details.submissionId}`);
          Logger.info(
            `You can check the submission details at: ${lyricUrl}/submission/${error.details.submissionId}`
          );
        }

        if (error.details?.errors) {
          Logger.info(`\nErrors found during submission:`);
          error.details.errors.forEach((err: any) => {
            Logger.info(`- ${err.type}: ${err.message}`);
            if (err.batchName) {
              Logger.info(`  File: ${err.batchName}`);
            }
          });
        }
      }
      // File not found
      else if (error.code === ErrorCodes.FILE_NOT_FOUND) {
        Logger.info(
          "\nFile or directory issue detected. Check paths and permissions."
        );

        if (error.details?.suggestion) {
          Logger.info(`Suggestion: ${error.details.suggestion}`);
        }
      }
      // Connection errors
      else if (error.code === ErrorCodes.CONNECTION_ERROR) {
        Logger.info(
          "\nConnection error. Check network and server availability."
        );

        if (error.details?.suggestion) {
          Logger.info(`Suggestion: ${error.details.suggestion}`);
        }
      }

      return {
        success: false,
        errorMessage: error.message,
        errorCode: error.code,
        details: error.details,
      };
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      errorMessage,
      errorCode: ErrorCodes.CONNECTION_ERROR,
      details: {
        error: error instanceof Error ? error.stack : String(error),
        suggestion:
          "An unexpected error occurred. Try running with --debug for more information.",
      },
    };
  }

  /**
   * Validates command line arguments
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    // Ensure config exists
    if (!cliOutput.config) {
      throw new ConductorError(
        "Configuration is missing",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Extract key parameters
    const lyricUrl = cliOutput.config.lyric?.url || process.env.LYRIC_URL;
    const lecternUrl = cliOutput.config.lectern?.url || process.env.LECTERN_URL;

    // Try to get data path from CLI first, then config, then env
    const dataPathFromCli = cliOutput.options?.dataDirectory;
    const dataPathFromConfig = cliOutput.config.lyric?.dataDirectory;
    const dataPathFromEnv = process.env.LYRIC_DATA;
    const dataPath = dataPathFromCli || dataPathFromConfig || dataPathFromEnv;

    // Validate required parameters
    if (!lyricUrl) {
      throw new ConductorError(
        "No Lyric URL provided. Use --lyric-url option or set LYRIC_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (!lecternUrl) {
      throw new ConductorError(
        "No Lectern URL provided. Use --lectern-url option or set LECTERN_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (!dataPath) {
      throw new ConductorError(
        "No data directory or file provided. Use --data-directory (-d) option or set LYRIC_DATA environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }
}
