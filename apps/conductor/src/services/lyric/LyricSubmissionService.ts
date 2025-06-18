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

    Logger.debug`Found ${allFiles.length} valid CSV files`;
    allFiles.forEach((file) =>
      Logger.debugString(`  - ${path.basename(file)}`)
    );

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
      Logger.info`Submitting ${params.files.length} files to Lyric...`;

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

      Logger.success`Submission created with ID: ${submissionId}`;
      return { submissionId: submissionId.toString() };
    } catch (error) {
      // Enhanced error handling for submission failures
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      Logger.debug`Submission error: ${errorMessage}`;

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

              // Create error but mark it as already logged to prevent duplicate messages
              const error = ErrorFactory.validation(
                "Category not found",
                {
                  requestedCategoryId: params.categoryId,
                  availableCategories,
                  alreadyLogged: true, // Add marker
                },
                [
                  `Use a valid category ID: ${availableCategories
                    .map((c) => c.id)
                    .join(", ")}`,
                  "Check the category name and ID match",
                  "Ensure you have access to this category",
                ]
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
                [
                  "Verify Lyric service is properly configured",
                  "Categories may need to be created first",
                  "Contact the service administrator",
                ]
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

      // For other errors, create a generic connection error
      throw ErrorFactory.connection(
        `File submission failed: ${errorMessage}`,
        { originalError: error },
        [
          "Check Lyric service status and connectivity",
          "Verify file formats and permissions",
          "Review service logs for more details",
          "Try again with --debug for detailed error information",
        ]
      );
    }
  }

  /**
   * Wait for submission validation with progress updates
   */
  private async waitForValidation(
    submissionId: string,
    maxRetries: number,
    retryDelay: number
  ): Promise<string> {
    Logger.info`Waiting for submission ${submissionId} validation...`;
    Logger.infoString(
      "This may take a few minutes depending on file size and complexity."
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.http.get<{ status?: string }>(
          `/submission/${submissionId}`
        );

        const status = response.data?.status;
        if (!status) {
          throw ErrorFactory.connection(
            "Could not extract status from response",
            {
              response: response.data,
              submissionId,
            },
            [
              "Check Lyric service response format",
              "Verify submission ID is valid",
              "Review service logs for errors",
            ]
          );
        }

        Logger.info`Validation check ${attempt}/${maxRetries}: ${status}`;

        if (status === "VALID") {
          Logger.success`Submission validation passed`;
          return status;
        } else if (status === "INVALID") {
          throw ErrorFactory.validation(
            "Submission validation failed",
            {
              submissionId,
              status,
            },
            [
              "Review data format and structure",
              "Check validation error details",
              `Visit ${this.config.url}/submission/${submissionId} for details`,
              "Verify CSV files meet schema requirements",
            ]
          );
        }

        // Still processing, wait before next check
        if (attempt < maxRetries) {
          Logger.info`Waiting ${
            retryDelay / 1000
          } seconds before next check...`;
          await this.delay(retryDelay);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "ConductorError") {
          throw error;
        }

        if (attempt === maxRetries) {
          // If we're out of retries, rethrow with better error info
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
    Logger.info`Committing submission: ${submissionId}`;

    try {
      // Send empty object instead of null
      await this.http.post(
        `/submission/category/${categoryId}/commit/${submissionId}`,
        {}
      );

      Logger.success`Submission committed successfully`;
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
