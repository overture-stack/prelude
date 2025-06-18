// src/services/lyric/LyricSubmissionService.ts
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import * as fs from "fs";
import * as path from "path";
// Use require for FormData to avoid TypeScript import issues
const FormData = require("form-data");
import chalk from "chalk";

export interface DataSubmissionParams {
  categoryId: string;
  organization: string;
  dataDirectory: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface DataSubmissionResult {
  submissionId: string;
  status: "COMMITTED" | "PENDING" | "VALID" | "INVALID";
  filesSubmitted: string[];
  message?: string;
}

export class LyricSubmissionService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  get serviceName(): string {
    return "Lyric Data";
  }

  protected get healthEndpoint(): string {
    return "/health";
  }

  /**
   * Complete data submission workflow: validate -> submit -> wait -> commit
   */
  async submitDataWorkflow(
    params: DataSubmissionParams
  ): Promise<DataSubmissionResult> {
    try {
      // Step 1: Find and validate files
      const validFiles = await this.findValidFiles(params.dataDirectory);

      // Step 2: Submit files
      const submission = await this.submitFiles({
        categoryId: params.categoryId,
        organization: params.organization,
        files: validFiles,
      });

      // Step 3: Wait for validation
      const finalStatus = await this.waitForValidation(
        submission.submissionId,
        params.maxRetries || 10,
        params.retryDelay || 20000
      );

      // Step 4: Commit if valid
      if (finalStatus === "VALID") {
        await this.commitSubmission(params.categoryId, submission.submissionId);

        return {
          submissionId: submission.submissionId,
          status: "COMMITTED",
          filesSubmitted: validFiles.map((f) => path.basename(f)),
          message: "Data successfully submitted and committed",
        };
      }

      throw ErrorFactory.validation(
        "Submission validation failed",
        {
          submissionId: submission.submissionId,
          status: finalStatus,
          categoryId: params.categoryId,
        },
        [
          `Submission status: ${finalStatus}`,
          `Check validation details at ${this.config.url}/submission/${submission.submissionId}`,
          "Review data format and required fields",
          "Verify data meets service requirements",
        ]
      );
    } catch (error) {
      // Don't call handleServiceError here - let errors propagate to command layer
      // This ensures the command's error handling gets the original error
      throw error;
    }
  }

  /**
   * Find valid CSV files that match the schema requirements
   */
  private async findValidFiles(dataDirectory: string): Promise<string[]> {
    if (!fs.existsSync(dataDirectory)) {
      throw ErrorFactory.file("Data directory not found", dataDirectory, [
        "Check that the directory exists",
        "Verify the path is correct",
        "Ensure you have access to the directory",
      ]);
    }

    if (!fs.statSync(dataDirectory).isDirectory()) {
      throw ErrorFactory.file("Path is not a directory", dataDirectory, [
        "Provide a directory path, not a file path",
        "Check that the path points to a directory",
      ]);
    }

    // Find all CSV files
    const allFiles = fs
      .readdirSync(dataDirectory)
      .filter((file) => file.endsWith(".csv"))
      .map((file) => path.join(dataDirectory, file))
      .filter((filePath) => {
        try {
          const stats = fs.statSync(filePath);
          return stats.isFile() && stats.size > 0;
        } catch {
          return false;
        }
      });

    if (allFiles.length === 0) {
      throw ErrorFactory.file("No valid CSV files found", dataDirectory, [
        "Ensure the directory contains CSV files",
        "Check that files have .csv extension",
        "Verify files are not empty",
      ]);
    }

    // Log the files found in a nice format
    Logger.debug`Found ${allFiles.length} valid CSV files`;
    Logger.debug`Files found in ${dataDirectory}:`;
    allFiles.forEach((file) => {
      const stats = fs.statSync(file);
      const sizeKB = Math.round((stats.size / 1024) * 10) / 10;
      Logger.debug`  - ${path.basename(file)} (${sizeKB} KB)`;
    });

    return allFiles;
  }

  /**
   * Submit files to Lyric
   */
  private async submitFiles(params: {
    categoryId: string;
    organization: string;
    files: string[];
  }): Promise<{ submissionId: string }> {
    try {
      Logger.info`Submitting ${params.files.length} files to Lyric:`;

      // List the files being submitted
      params.files.forEach((file) => {
        Logger.generic(`  ▸ ${path.basename(file)}`);
      });
      Logger.generic("");
      // Create FormData for file upload - use Node.js FormData implementation
      const formData = new FormData();

      // Add files
      for (const filePath of params.files) {
        Logger.debug`Adding file: ${path.basename(filePath)}`;
        const fileStream = fs.createReadStream(filePath);
        formData.append("files", fileStream, {
          filename: path.basename(filePath),
          contentType: "text/csv",
        });
      }

      // Add organization
      formData.append("organization", params.organization);

      // Log headers for debugging
      Logger.debug`Form headers: ${JSON.stringify(formData.getHeaders())}`;

      // Make the request with proper FormData headers
      const response = await this.http.post<{ submissionId?: string }>(
        `/submission/category/${params.categoryId}/data`,
        formData,
        {
          headers: {
            ...formData.getHeaders(), // This ensures content-type and boundaries are set correctly
          },
        }
      );

      const submissionId = response.data?.submissionId;
      if (!submissionId) {
        // Check if this is a file validation error (invalid schema names)
        await this.handleFileValidationError(response.data, params);

        throw ErrorFactory.connection(
          "Could not extract submission ID from response",
          {
            response: response.data,
            categoryId: params.categoryId,
          },
          [
            "Check Lyric service response format",
            "Verify the submission was processed",
            "Review service logs for errors",
          ]
        );
      }

      Logger.debug`Submission created with ID: ${submissionId}`;
      return { submissionId: submissionId.toString() };
    } catch (error) {
      // Enhanced error handling for submission failures
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      Logger.debug`Submission error: ${errorMessage}`;

      // IMPORTANT: If this is already a properly formatted schema validation error,
      // just rethrow it without adding generic suggestions
      if (error instanceof Error && error.name === "ConductorError") {
        const conductorError = error as any;

        // Check if this is a schema validation error that was already properly handled
        if (
          conductorError.message === "File names do not match schema names" ||
          conductorError.message ===
            "File names do not match schema names in dictionary" ||
          conductorError.alreadyLogged
        ) {
          // This error already has proper context and suggestions, just rethrow it
          throw error;
        }
      }

      // Special handling for category not found errors
      if (
        errorMessage.includes("Dictionary in category") ||
        (errorMessage.includes("400") && errorMessage.includes("category"))
      ) {
        // Try to fetch available categories to help the user
        try {
          Logger.debug`Fetching available categories to help with suggestions`;
          const categoriesResponse = await this.http.get("/category");

          // Check if we got a valid response with categories
          if (
            categoriesResponse.data &&
            Array.isArray(categoriesResponse.data)
          ) {
            const availableCategories = categoriesResponse.data;

            // Display the list of available categories ONLY ONCE
            Logger.errorString(`Category ID '${params.categoryId}' not found`);

            if (availableCategories.length > 0) {
              Logger.generic("");
              Logger.generic(chalk.bold.cyan("🔍 Available categories:"));
              availableCategories.forEach((cat) => {
                Logger.generic(
                  `   ▸ ID: ${cat.id} - Name: ${cat.name || "Unnamed"}`
                );
              });
              Logger.generic("");

              // Create error but mark it as already logged to prevent duplicate messages
              const error = ErrorFactory.validation(
                "Category not found",
                {
                  requestedCategoryId: params.categoryId,
                  availableCategories,
                  alreadyLogged: true, // Add marker
                },
                [] // Empty suggestions since we showed the fix above
              );

              // Add a property to indicate this error was already logged
              (error as any).alreadyLogged = true;

              throw error;
            } else {
              Logger.warnString("No categories found in Lyric service");
              const error = ErrorFactory.validation(
                "No categories available in the Lyric service",
                {
                  categoryId: params.categoryId,
                  alreadyLogged: true,
                },
                [] // Empty suggestions
              );

              // Mark as already logged
              (error as any).alreadyLogged = true;

              throw error;
            }
          }
        } catch (catError) {
          // If this is already a properly formatted error with a marker, just rethrow it
          if (
            catError instanceof Error &&
            catError.name === "ConductorError" &&
            (catError as any).alreadyLogged
          ) {
            throw catError;
          }

          // If we couldn't fetch categories, log and continue with generic error
          Logger.debug`Failed to fetch categories: ${catError}`;
        }

        // Fallback error if we couldn't fetch categories
        throw ErrorFactory.validation(
          "Category not found or bad request during file submission",
          { originalError: error, categoryId: params.categoryId },
          [
            "Check that category ID is valid",
            "Verify the Lyric service configuration",
            "Ensure you have permission to access categories",
          ]
        );
      }

      // Handle other specific error types with relevant suggestions
      if (errorMessage.includes("413")) {
        throw ErrorFactory.validation(
          "Files are too large for submission",
          { originalError: error, fileCount: params.files.length },
          [
            "Reduce file sizes or split large files",
            "Check service upload limits",
            "Try submitting fewer files at once",
          ]
        );
      }

      if (errorMessage.includes("422")) {
        throw ErrorFactory.validation(
          "File validation failed during submission",
          { originalError: error },
          [
            "Check CSV file format and structure",
            "Verify data meets service requirements",
            "Review column names and data types",
          ]
        );
      }

      if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ENOTFOUND")
      ) {
        throw ErrorFactory.connection(
          "Failed to connect to Lyric service",
          { originalError: error, serviceUrl: this.config.url },
          [
            "Check that Lyric service is running",
            `Verify the service URL: ${this.config.url}`,
            "Check network connectivity",
            "Review firewall settings",
          ]
        );
      }

      // For other unknown errors, provide generic but relevant suggestions
      throw ErrorFactory.connection(
        `File submission failed: ${errorMessage}`,
        { originalError: error },
        [
          "Check Lyric service status and connectivity",
          "Verify your authentication and permissions",
          "Review service logs for more details",
        ]
      );
    }
  }
  /**
   * Handle file validation errors (invalid schema names) with helpful suggestions
   */
  private async handleFileValidationError(
    responseData: any,
    params: { files: string[]; categoryId: string }
  ): Promise<void> {
    // Check if the response indicates file validation errors
    // Since Lyric doesn't return a submissionId when files are invalid, we should assume this is a file validation error
    // Look for common indicators or just proceed with file validation logic

    Logger.debug`Checking for file validation errors. Response: ${JSON.stringify(
      responseData
    )}`;

    try {
      // Extract invalid filenames from the response or derive from file list
      const invalidFiles = params.files.map((f) => path.basename(f));

      Logger.errorString(
        `Invalid file names detected - files must match schema names`
      );
      Logger.suggestion("Invalid Files");
      invalidFiles.forEach((filename) => {
        const schemaName = path.basename(filename, ".csv");
        Logger.generic(`   ▸ ${filename}`);
      });

      // Try to get available schema names from the dictionary
      const availableSchemas = await this.getAvailableSchemaNames(
        params.categoryId
      );

      if (availableSchemas.length > 0) {
        Logger.suggestion("Available Schema Names");
        availableSchemas.forEach((schemaName) => {
          Logger.generic(`   ▸ ${schemaName}.csv`);
        });
      } else {
        Logger.suggestion("Could not fetch available schema names");
        Logger.generic("   ▸ Check your dictionary configuration in Lyric");
        Logger.generic("   ▸ Verify category has a dictionary assigned");
        Logger.generic(
          "   ▸ Common schema names might include: donor, diagnosis, treatment, followup"
        );
      }

      Logger.suggestion("Suggestions");
      Logger.generic(
        "   ▸ Rename your CSV files to match the relevant schema name(s)"
      );
      Logger.generic("   ▸ Schema names are case-sensitive");
      Logger.generic("   ▸ Use --debug flag to see detailed error information");

      // Throw a specific error for this case
      throw ErrorFactory.validation(
        "File names do not match schema names",
        {
          invalidFiles,
          availableSchemas,
          categoryId: params.categoryId,
          alreadyLogged: true, // Mark as already logged to prevent duplicate messages
        },
        [] // Empty suggestions since we already displayed them above
      );
    } catch (schemaError) {
      // If this is our validation error, rethrow it
      if (
        schemaError instanceof Error &&
        schemaError.name === "ConductorError"
      ) {
        throw schemaError;
      }

      // If we couldn't get schema info, provide basic guidance
      Logger.errorString(`Invalid file names - files must match schema names`);
      Logger.suggestion("Invalid Files");
      params.files.forEach((file) => {
        Logger.generic(`   ▸ ${path.basename(file)}`);
      });
      Logger.suggestion("Solutions");
      Logger.generic(
        "   ▸ Rename your CSV files to match the exact schema names from your dictionary"
      );
      Logger.generic(
        "   ▸ File names must be: [schema_name].csv (case-sensitive)"
      );
      Logger.generic(
        "   ▸ Check your dictionary definition for the correct schema names"
      );
      Logger.generic("   ▸ Use --debug flag to see detailed error information");

      throw ErrorFactory.validation(
        "File names do not match schema names in dictionary",
        {
          invalidFiles: params.files.map((f) => path.basename(f)),
          categoryId: params.categoryId,
          alreadyLogged: true,
        },
        []
      );
    }
  }

  /**
   * Get available schema names from the dictionary for the given category
   */
  /**
   * Get available schema names from the dictionary for the given category
   */
  private async getAvailableSchemaNames(categoryId: string): Promise<string[]> {
    try {
      Logger.debug`Fetching schema names for category ${categoryId}`;

      // First, get the category information to find the dictionary
      const categoryResponse = await this.http.get(`/category/${categoryId}`);
      const category: any = categoryResponse.data;

      Logger.debug`Category response: ${JSON.stringify(category)}`;

      // Check for dictionary information in the category response
      // The structure appears to be category.dictionary with name and version
      if (!category?.dictionary?.name || !category?.dictionary?.version) {
        Logger.debug`No dictionary information found for category ${categoryId}`;
        Logger.debug`Expected category.dictionary.name and category.dictionary.version`;
        return [];
      }

      const dictionaryName = category.dictionary.name;
      const dictionaryVersion = category.dictionary.version;

      Logger.debug`Found dictionary: ${dictionaryName} v${dictionaryVersion}`;

      // Now we need to get the dictionary details from Lectern
      // Since we have the name and version, we can query Lectern directly
      const lecternUrl = process.env.LECTERN_URL || "http://localhost:3031";

      try {
        // Create a simple HTTP client for Lectern
        const axios = require("axios");

        // Get all dictionaries from Lectern
        const dictionariesResponse = await axios.get(
          `${lecternUrl}/dictionaries`
        );
        const dictionaries = Array.isArray(dictionariesResponse.data)
          ? dictionariesResponse.data
          : [];

        Logger.debug`Found ${dictionaries.length} dictionaries in Lectern`;

        // Find the specific dictionary by name and version
        const targetDictionary = dictionaries.find(
          (dict: any) =>
            dict.name === dictionaryName && dict.version === dictionaryVersion
        );

        if (!targetDictionary) {
          Logger.debug`Dictionary ${dictionaryName} v${dictionaryVersion} not found in Lectern`;
          return [];
        }

        Logger.debug`Found target dictionary: ${JSON.stringify(
          targetDictionary
        )}`;

        // Get detailed dictionary information
        const detailedDictResponse = await axios.get(
          `${lecternUrl}/dictionaries/${targetDictionary._id}`
        );
        const detailedDict = detailedDictResponse.data;

        Logger.debug`Detailed dictionary response: ${JSON.stringify(
          detailedDict
        )}`;

        if (!detailedDict?.schemas || !Array.isArray(detailedDict.schemas)) {
          Logger.debug`No schemas found in dictionary ${dictionaryName} v${dictionaryVersion}`;
          return [];
        }

        Logger.debug`Found ${detailedDict.schemas.length} schemas`;

        // Extract schema names (these are the entity names)
        const schemaNames = detailedDict.schemas
          .map((schema: any) => schema?.name)
          .filter((name: any) => typeof name === "string" && name.length > 0);

        Logger.debug`Found ${
          schemaNames.length
        } schema names: ${schemaNames.join(", ")}`;
        return schemaNames;
      } catch (lecternError) {
        Logger.debug`Error connecting to Lectern: ${lecternError}`;

        // If we can't connect to Lectern, we can't get the schema names
        // This is expected if Lectern is not running or not accessible
        Logger.debug`Could not fetch schema names from Lectern service`;
        return [];
      }
    } catch (error) {
      Logger.debug`Could not fetch schema names: ${error}`;

      // Enhanced error logging for troubleshooting
      if (error instanceof Error) {
        Logger.debug`Error name: ${error.name}`;
        Logger.debug`Error message: ${error.message}`;
        if ((error as any).response) {
          Logger.debug`Error response status: ${
            (error as any).response.status
          }`;
          Logger.debug`Error response data: ${JSON.stringify(
            (error as any).response.data
          )}`;
        }
      }

      return [];
    }
  }

  /**
   * Parse and display Lyric validation errors in a user-friendly way
   * Focuses on common scenarios like duplicate submissions
   */
  private parseAndDisplayLyricErrors(
    submissionId: string,
    responseData: any
  ): void {
    try {
      if (!responseData?.errors?.inserts) {
        Logger.errorString(
          "Data validation failed - see submission details for more information"
        );
        return;
      }

      const errorsByTable: Record<string, any[]> = responseData.errors.inserts;
      const totalErrors = Object.values(errorsByTable).reduce(
        (sum: number, errors: any[]) =>
          sum + (Array.isArray(errors) ? errors.length : 0),
        0
      );

      // Quick analysis to detect common patterns
      const isDuplicateSubmission =
        this.isDuplicateSubmissionError(errorsByTable);

      if (isDuplicateSubmission) {
        this.displayDuplicateSubmissionError(errorsByTable, totalErrors);
      } else {
        this.displayGenericValidationErrors(errorsByTable, totalErrors);
      }
    } catch (parseError) {
      Logger.warnString("Could not parse detailed error information");
      Logger.debugString(`Parse error: ${parseError}`);
    }
  }

  /**
   * Detect if this is a duplicate submission (all errors are INVALID_BY_UNIQUE)
   */
  private isDuplicateSubmissionError(
    errorsByTable: Record<string, any[]>
  ): boolean {
    const allErrors = Object.values(errorsByTable).flat();
    return (
      allErrors.length > 0 &&
      allErrors.every((error: any) => error.reason === "INVALID_BY_UNIQUE")
    );
  }

  /**
   * Display error message specifically for duplicate submissions
   */
  private displayDuplicateSubmissionError(
    errorsByTable: Record<string, any[]>,
    totalErrors: number
  ): void {
    const tableCount = Object.keys(errorsByTable).length;

    Logger.errorString(
      `Duplicate submission detected - ${totalErrors} duplicate records across ${tableCount} tables`
    );
    Logger.suggestion("This appears to be a resubmission of existing data");

    // Show which tables have duplicates
    Object.entries(errorsByTable).forEach(([tableName, errors]) => {
      if (Array.isArray(errors) && errors.length > 0) {
        Logger.generic(
          `   ▸ ${tableName.toUpperCase()}: ${errors.length} duplicate records`
        );
      }
    });
  }

  /**
   * Display error message for other validation issues
   */
  private displayGenericValidationErrors(
    errorsByTable: Record<string, any[]>,
    totalErrors: number
  ): void {
    const tableCount = Object.keys(errorsByTable).length;

    Logger.errorString(
      `Data validation failed with ${totalErrors} errors across ${tableCount} tables`
    );
    Logger.generic("");

    // Group errors by type across all tables
    const errorSummary = this.summarizeErrorTypes(errorsByTable);

    Logger.suggestion("Error Summary");
    Object.entries(errorSummary).forEach(([reason, count]) => {
      const description = this.getErrorDescription(reason);
      Logger.generic(`   ▸ ${description}: ${count} errors`);
    });

    Logger.generic("");

    // Show affected tables
    Logger.suggestion("Affected Tables");
    Object.entries(errorsByTable).forEach(([tableName, errors]) => {
      if (Array.isArray(errors) && errors.length > 0) {
        Logger.generic(
          `   ▸ ${tableName.toUpperCase()}: ${errors.length} errors`
        );
      }
    });

    Logger.generic("");
    this.displayGenericSolutions(errorSummary);
  }

  /**
   * Summarize error types across all tables
   */
  private summarizeErrorTypes(
    errorsByTable: Record<string, any[]>
  ): Record<string, number> {
    const summary: Record<string, number> = {};

    Object.values(errorsByTable)
      .flat()
      .forEach((error: any) => {
        const reason = error?.reason || "UNKNOWN";
        summary[reason] = (summary[reason] || 0) + 1;
      });

    return summary;
  }

  /**
   * Get user-friendly description for error codes
   */
  private getErrorDescription(reason: string): string {
    switch (reason) {
      case "INVALID_BY_UNIQUE":
        return "Duplicate values in unique fields";
      case "INVALID_BY_MISSING_RELATION":
        return "Missing references to related records";
      case "INVALID_BY_REGEX":
        return "Invalid format or pattern";
      case "INVALID_BY_SCRIPT":
        return "Custom validation failures";
      default:
        return reason;
    }
  }

  /**
   * Display solutions based on error types
   */
  private displayGenericSolutions(errorSummary: Record<string, number>): void {
    Logger.suggestion("How to Fix");

    Object.keys(errorSummary).forEach((reason) => {
      switch (reason) {
        case "INVALID_BY_UNIQUE":
          Logger.generic("   ▸ Remove duplicate ID values from your CSV files");
          Logger.generic("   ▸ Ensure each record has a unique identifier");
          break;
        case "INVALID_BY_MISSING_RELATION":
          Logger.generic(
            "   ▸ Verify foreign key values exist in referenced tables"
          );
          Logger.generic(
            "   ▸ Check the order of file uploads (dependencies first)"
          );
          break;
        case "INVALID_BY_REGEX":
          Logger.generic(
            "   ▸ Check data format requirements in the dictionary schema"
          );
          Logger.generic("   ▸ Fix values that don't match expected patterns");
          break;
        case "INVALID_BY_SCRIPT":
          Logger.generic(
            "   ▸ Review custom validation rules in the dictionary"
          );
          Logger.generic("   ▸ Ensure data meets business logic constraints");
          break;
      }
    });

    Logger.generic("   ▸ Fix the issues in your CSV files and resubmit");
  }

  /**
   * Wait for submission validation with progress updates and enhanced error parsing
   */
  private async waitForValidation(
    submissionId: string,
    maxRetries: number,
    retryDelay: number
  ): Promise<string> {
    Logger.debug`Waiting for submission Id ${submissionId} validation`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.http.get<any>(
          `/submission/${submissionId}`
        );

        const status = response.data?.status;
        if (!status) {
          throw ErrorFactory.connection(
            "Could not extract status from response",
            { response: response.data, submissionId },
            [
              "Check Lyric service response format",
              "Verify submission ID is valid",
              "Review service logs for errors",
            ]
          );
        }

        Logger.info`Validation check ${attempt}/${maxRetries}: ${status}`;

        if (status === "VALID") {
          Logger.debug`Submission validation passed`;
          return status;
        } else if (status === "INVALID") {
          // Parse and display detailed errors based on the response
          this.parseAndDisplayLyricErrors(submissionId, response.data);

          throw ErrorFactory.validation(
            "Data validation failed - see detailed errors above",
            {
              submissionId,
              status,
              errorCount: response.data?.errors
                ? Object.values(response.data.errors.inserts || {}).reduce(
                    (sum: number, errors: any) =>
                      sum + (Array.isArray(errors) ? errors.length : 0),
                    0
                  )
                : 0,
            },
            [
              "Fix the validation errors identified above",
              `Complete error details: ${this.config.url}/submission/${submissionId}`,
              "Correct your CSV data and resubmit",
            ]
          );
        }

        // Still processing, wait before next check
        if (attempt < maxRetries) {
          Logger.info`Waiting ${retryDelay / 1000} seconds before next check`;
          await this.delay(retryDelay);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "ConductorError") {
          throw error;
        }

        if (attempt === maxRetries) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw ErrorFactory.connection(
            `Status check failed after ${maxRetries} attempts: ${errorMessage}`,
            { submissionId, originalError: error },
            [
              "Check Lyric service connectivity",
              "Verify submission ID is valid",
              "Review service logs for details",
            ]
          );
        }

        Logger.warnString(
          `Status check failed, retrying... (${attempt}/${maxRetries})`
        );
        await this.delay(retryDelay);
      }
    }

    throw ErrorFactory.connection(
      "Validation timed out",
      {
        submissionId,
        attempts: maxRetries,
        totalWaitTime: (maxRetries * retryDelay) / 1000,
      },
      [
        `Validation did not complete after ${maxRetries} attempts (${
          (maxRetries * retryDelay) / 1000
        } seconds)`,
        `Check status manually at ${this.config.url}/submission/${submissionId}`,
        "Consider increasing max retries or retry delay",
        "Review service logs for processing issues",
      ]
    );
  }

  /**
   * Commit a validated submission
   */
  private async commitSubmission(
    categoryId: string,
    submissionId: string
  ): Promise<void> {
    Logger.debug`Committing submission: ${submissionId}`;

    try {
      // Send empty object instead of null
      await this.http.post(
        `/submission/category/${categoryId}/commit/${submissionId}`,
        {}
      );

      Logger.debug`Submission committed successfully`;
    } catch (error) {
      // Enhanced error handling for commit failures
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("404")) {
        throw ErrorFactory.validation(
          "Submission not found for commit",
          { submissionId, categoryId },
          [
            "Verify submission ID is correct",
            "Check that submission exists and is in VALID status",
            "Ensure category ID matches the original submission",
          ]
        );
      }

      if (errorMessage.includes("409")) {
        throw ErrorFactory.validation(
          "Submission cannot be committed in current state",
          { submissionId, categoryId },
          [
            "Submission may already be committed",
            "Check submission status before committing",
            "Verify submission passed validation",
          ]
        );
      }

      throw ErrorFactory.connection(
        `Failed to commit submission: ${errorMessage}`,
        { submissionId, categoryId, originalError: error },
        [
          "Check Lyric service connectivity",
          "Verify submission is in valid state",
          "Review service logs for details",
        ]
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
