// src/services/lyric/LyricSubmissionService.ts - Enhanced with ErrorFactory patterns
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import * as fs from "fs";
import * as path from "path";

export interface DataSubmissionParams {
  categoryId: string;
  organization: string;
  dataDirectory: string;
  maxRetries?: number;
  retryDelay?: number;
  [key: string]: any;
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
   * Enhanced with ErrorFactory patterns
   */
  async submitDataWorkflow(
    params: DataSubmissionParams
  ): Promise<DataSubmissionResult> {
    try {
      // Enhanced parameter validation
      this.validateSubmissionParams(params);

      // Step 1: Find and validate files with enhanced feedback
      const validFiles = await this.findValidFiles(params.dataDirectory);

      // Step 2: Submit files with enhanced error handling
      const submission = await this.submitFiles({
        categoryId: params.categoryId,
        organization: params.organization,
        files: validFiles,
      });

      // Step 3: Wait for validation with enhanced progress tracking
      const finalStatus = await this.waitForValidation(
        submission.submissionId,
        params.maxRetries || 10,
        params.retryDelay || 20000
      );

      // Step 4: Commit if valid
      if (finalStatus === "VALID") {
        await this.commitSubmission(params.categoryId, submission.submissionId);

        Logger.success`Lyric data submission workflow completed successfully`;

        return {
          submissionId: submission.submissionId,
          status: "COMMITTED",
          filesSubmitted: validFiles.map((f) => path.basename(f)),
          message: "Data successfully submitted and committed",
        };
      }

      throw ErrorFactory.validation(
        `Lyric submission validation failed with status: ${finalStatus}`,
        { submissionId: submission.submissionId, status: finalStatus },
        [
          "Check data format and content validity",
          "Verify files match the registered dictionary schema",
          "Review validation errors in Lyric service logs",
          `Check submission status at ${this.config.url}/submission/${submission.submissionId}`,
          "Ensure all required fields are present and properly formatted",
        ]
      );
    } catch (error) {
      this.handleServiceError(error, "data submission workflow");
    }
  }

  /**
   * Enhanced parameter validation
   */
  private validateSubmissionParams(params: DataSubmissionParams): void {
    this.validateRequired(
      params,
      ["categoryId", "organization", "dataDirectory"],
      "data submission"
    );

    // Enhanced category ID validation
    if (!/^\d+$/.test(params.categoryId)) {
      throw ErrorFactory.validation(
        `Invalid category ID format: ${params.categoryId}`,
        { categoryId: params.categoryId },
        [
          "Category ID must be a positive integer",
          "Examples: '1', '2', '3'",
          "Check with Lyric administrator for valid category IDs",
          "Ensure the category exists in Lyric",
        ]
      );
    }

    // Enhanced organization validation
    if (
      typeof params.organization !== "string" ||
      params.organization.trim() === ""
    ) {
      throw ErrorFactory.validation(
        "Invalid organization for Lyric data submission",
        { organization: params.organization, type: typeof params.organization },
        [
          "Organization must be a non-empty string",
          "Use your institution's identifier",
          "Examples: 'OICR', 'NIH', 'University-Toronto'",
          "Match the organization used in dictionary registration",
        ]
      );
    }

    // Enhanced retry parameters validation
    if (params.maxRetries !== undefined) {
      if (
        !Number.isInteger(params.maxRetries) ||
        params.maxRetries < 1 ||
        params.maxRetries > 50
      ) {
        throw ErrorFactory.validation(
          `Invalid maxRetries value: ${params.maxRetries}`,
          { maxRetries: params.maxRetries },
          [
            "Max retries must be an integer between 1 and 50",
            "Recommended: 5-15 for most use cases",
            "Higher values for unstable connections",
            "Default is 10 if not specified",
          ]
        );
      }
    }

    if (params.retryDelay !== undefined) {
      if (
        !Number.isInteger(params.retryDelay) ||
        params.retryDelay < 1000 ||
        params.retryDelay > 300000
      ) {
        throw ErrorFactory.validation(
          `Invalid retryDelay value: ${params.retryDelay}ms`,
          { retryDelay: params.retryDelay },
          [
            "Retry delay must be between 1000ms (1s) and 300000ms (5min)",
            "Recommended: 10000-30000ms for most use cases",
            "Longer delays for heavily loaded services",
            "Default is 20000ms if not specified",
          ]
        );
      }
    }

    Logger.debug`Submission parameters validated successfully`;
  }

  /**
   * Find valid CSV files that match the schema requirements
   * Enhanced with detailed validation and feedback
   */
  private async findValidFiles(dataDirectory: string): Promise<string[]> {
    if (!fs.existsSync(dataDirectory)) {
      throw ErrorFactory.file(
        `Data directory not found: ${path.basename(dataDirectory)}`,
        dataDirectory,
        [
          "Check that the directory path is correct",
          "Ensure the directory exists",
          "Verify permissions allow access",
          `Current directory: ${process.cwd()}`,
          "Create the directory if it doesn't exist",
        ]
      );
    }

    if (!fs.statSync(dataDirectory).isDirectory()) {
      throw ErrorFactory.file(
        `Path is not a directory: ${path.basename(dataDirectory)}`,
        dataDirectory,
        [
          "Provide a directory path, not a file path",
          "Check the path points to a directory",
          "Ensure the path is correct",
        ]
      );
    }

    // Enhanced file discovery and validation
    let allFiles: string[];
    try {
      allFiles = fs.readdirSync(dataDirectory);
    } catch (error) {
      throw ErrorFactory.file(
        `Cannot read data directory: ${path.basename(dataDirectory)}`,
        dataDirectory,
        [
          "Check directory permissions",
          "Ensure directory is accessible",
          "Verify directory is not corrupted",
          "Try running with elevated permissions",
        ]
      );
    }

    // Filter and validate CSV files
    const csvFiles = allFiles
      .filter((file) => file.toLowerCase().endsWith(".csv"))
      .map((file) => path.join(dataDirectory, file))
      .filter((filePath) => {
        try {
          const stats = fs.statSync(filePath);
          return stats.isFile() && stats.size > 0;
        } catch {
          return false;
        }
      });

    if (csvFiles.length === 0) {
      const nonCsvFiles = allFiles.filter(
        (file) => !file.toLowerCase().endsWith(".csv")
      );

      throw ErrorFactory.file(
        `No valid CSV files found in data directory: ${path.basename(
          dataDirectory
        )}`,
        dataDirectory,
        [
          "Ensure the directory contains CSV files",
          "Check file extensions are .csv (case sensitive)",
          "Verify files are not in subdirectories",
          `Directory contains: ${allFiles.slice(0, 5).join(", ")}${
            allFiles.length > 5 ? "..." : ""
          }`,
          nonCsvFiles.length > 0
            ? `Non-CSV files found: ${nonCsvFiles.slice(0, 3).join(", ")}`
            : "",
          "Only CSV files are supported for Lyric upload",
        ].filter(Boolean)
      );
    }

    // Validate individual CSV files
    const fileValidationErrors: string[] = [];
    csvFiles.forEach((filePath) => {
      try {
        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);

        if (stats.size === 0) {
          fileValidationErrors.push(`${fileName} (empty file)`);
        } else if (stats.size > 100 * 1024 * 1024) {
          // 100MB
          Logger.warn`Large CSV file detected: ${fileName} (${(
            stats.size /
            1024 /
            1024
          ).toFixed(1)}MB)`;
          Logger.tipString("Large files may take longer to process");
        }
      } catch (error) {
        fileValidationErrors.push(`${path.basename(filePath)} (cannot read)`);
      }
    });

    if (fileValidationErrors.length > 0) {
      throw ErrorFactory.file(
        `Invalid CSV files found in data directory`,
        dataDirectory,
        [
          `Fix these files: ${fileValidationErrors.join(", ")}`,
          "Ensure all CSV files contain data",
          "Check file permissions",
          "Remove or fix empty or corrupted files",
        ]
      );
    }

    Logger.success`Found ${csvFiles.length} valid CSV file(s) for upload`;
    csvFiles.forEach((file) => Logger.debug`  - ${path.basename(file)}`);

    return csvFiles;
  }

  /**
   * Submit files to Lyric with enhanced error handling
   */
  private async submitFiles(params: {
    categoryId: string;
    organization: string;
    files: string[];
  }): Promise<{ submissionId: string }> {
    Logger.info`Submitting ${params.files.length} files to Lyric...`;

    try {
      // Create FormData for file upload
      const formData = new FormData();

      // Add files with enhanced validation
      for (const filePath of params.files) {
        const fileName = path.basename(filePath);

        try {
          const fileData = fs.readFileSync(filePath);
          const blob = new Blob([fileData], { type: "text/csv" });
          formData.append("files", blob, fileName);
        } catch (error) {
          throw ErrorFactory.file(
            `Cannot read file for upload: ${fileName}`,
            filePath,
            [
              "Check file permissions and accessibility",
              "Ensure file is not locked by another process",
              "Verify file is not corrupted",
              "Try copying the file to a different location",
            ]
          );
        }
      }

      // Add organization
      formData.append("organization", params.organization);

      const response = await this.http.post<{ submissionId?: string }>(
        `/submission/category/${encodeURIComponent(params.categoryId)}/data`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const submissionId = response.data?.submissionId;
      if (!submissionId) {
        throw ErrorFactory.connection(
          "Could not extract submission ID from Lyric response",
          "Lyric",
          this.config.url,
          [
            "Lyric service may not be properly configured",
            "Check Lyric API response format",
            "Verify submission was successful",
            "Review Lyric service logs for errors",
          ]
        );
      }

      Logger.success`Submission created with ID: ${submissionId}`;
      return { submissionId: submissionId.toString() };
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Enhanced error handling for upload failures
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("413") || errorMessage.includes("too large")) {
        throw ErrorFactory.validation(
          "File upload too large for Lyric service",
          { fileCount: params.files.length },
          [
            "Files may be too large for upload",
            "Try uploading smaller batches of files",
            "Check individual file sizes",
            "Contact administrator about upload limits",
          ]
        );
      } else if (
        errorMessage.includes("400") ||
        errorMessage.includes("validation")
      ) {
        throw ErrorFactory.validation(
          "File upload validation failed",
          { categoryId: params.categoryId, organization: params.organization },
          [
            "Check category ID is valid and exists",
            "Verify organization name is correct",
            "Ensure files match the expected format",
            "Review Lyric submission requirements",
          ]
        );
      }

      throw ErrorFactory.connection(
        `File upload to Lyric failed: ${errorMessage}`,
        "Lyric",
        this.config.url,
        [
          "Check Lyric service connectivity",
          "Verify upload endpoint is accessible",
          "Ensure proper network connectivity",
          "Review file sizes and formats",
        ]
      );
    }
  }

  /**
   * Wait for submission validation with enhanced progress tracking
   */
  private async waitForValidation(
    submissionId: string,
    maxRetries: number,
    retryDelay: number
  ): Promise<string> {
    Logger.info`Waiting for submission ${submissionId} validation...`;
    Logger.info`This may take a few minutes depending on file size and complexity.`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.http.get<{ status?: string }>(
          `/submission/${encodeURIComponent(submissionId)}`
        );

        const status = response.data?.status;
        if (!status) {
          throw ErrorFactory.connection(
            "Could not extract status from Lyric validation response",
            "Lyric",
            this.config.url,
            [
              "Lyric service may not be responding correctly",
              "Check Lyric API response format",
              "Verify submission ID is correct",
              "Review Lyric service logs",
            ]
          );
        }

        Logger.info`Validation check ${attempt}/${maxRetries}: ${status}`;

        if (status === "VALID") {
          Logger.success`Submission validation passed`;
          return status;
        } else if (status === "INVALID") {
          throw ErrorFactory.validation(
            "Lyric submission validation failed",
            { submissionId, status },
            [
              "Data validation failed - check CSV file format and content",
              "Verify data matches the registered dictionary schema",
              "Check for required fields and data types",
              `Review validation details at ${this.config.url}/submission/${submissionId}`,
              "Ensure all data follows the expected format",
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
          this.handleServiceError(error, "validation status check");
        }

        Logger.warn`Status check failed, retrying... (${attempt}/${maxRetries})`;
        await this.delay(retryDelay);
      }
    }

    throw ErrorFactory.connection(
      `Validation timed out after ${maxRetries} attempts`,
      "Lyric",
      this.config.url,
      [
        `Validation took longer than expected (${
          (maxRetries * retryDelay) / 1000
        }s)`,
        "Large datasets may require more time to process",
        `Check status manually at ${this.config.url}/submission/${submissionId}`,
        "Consider increasing maxRetries or retryDelay for large datasets",
        "Contact administrator if validation consistently times out",
      ]
    );
  }

  /**
   * Commit a validated submission with enhanced error handling
   */
  private async commitSubmission(
    categoryId: string,
    submissionId: string
  ): Promise<void> {
    Logger.info`Committing submission: ${submissionId}`;

    try {
      // Send empty object instead of null
      await this.http.post(
        `/submission/category/${encodeURIComponent(
          categoryId
        )}/commit/${encodeURIComponent(submissionId)}`,
        {}
      );

      Logger.success`Submission committed successfully`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("404")) {
        throw ErrorFactory.validation(
          `Submission not found for commit: ${submissionId}`,
          { submissionId, categoryId },
          [
            "Submission may have already been committed",
            "Verify submission ID is correct",
            "Check that submission passed validation",
            "Ensure submission belongs to the specified category",
          ]
        );
      } else if (
        errorMessage.includes("400") ||
        errorMessage.includes("conflict")
      ) {
        throw ErrorFactory.validation(
          `Cannot commit submission: ${submissionId}`,
          { submissionId, categoryId },
          [
            "Submission may not be in a committable state",
            "Ensure submission has passed validation",
            "Check that submission hasn't already been committed",
            "Verify all validation steps completed successfully",
          ]
        );
      }

      throw ErrorFactory.connection(
        `Failed to commit submission: ${errorMessage}`,
        "Lyric",
        this.config.url,
        [
          "Check Lyric service connectivity",
          "Verify commit endpoint is accessible",
          "Ensure submission is in valid state",
          "Review Lyric service logs for details",
        ]
      );
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enhanced service error handling with Lyric data submission context
   */
  protected handleServiceError(error: unknown, operation: string): never {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Enhanced error handling with Lyric data submission specific guidance
    const errorMessage = error instanceof Error ? error.message : String(error);

    let suggestions = [
      `Check that Lyric service is running and accessible`,
      `Verify service URL: ${this.config.url}`,
      "Check network connectivity and firewall settings",
      "Confirm Lyric service configuration",
      "Review Lyric service logs for additional details",
    ];

    // Add operation-specific suggestions
    if (operation === "data submission workflow") {
      suggestions = [
        "Verify CSV files format and content",
        "Check data matches the registered dictionary schema",
        "Ensure category ID exists and is accessible",
        "Verify organization has proper permissions",
        ...suggestions,
      ];
    } else if (operation === "validation status check") {
      suggestions = [
        "Lyric validation service may be overloaded",
        "Check if submission ID is correct",
        "Large datasets may require more time to validate",
        "Consider increasing retry delay for better reliability",
        ...suggestions,
      ];
    }

    // Handle specific error patterns
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      suggestions.unshift("Lyric service response timed out");
      suggestions.unshift("Large file uploads may take longer than expected");
      suggestions.unshift("Consider uploading smaller batches of files");
    } else if (
      errorMessage.includes("413") ||
      errorMessage.includes("too large")
    ) {
      suggestions.unshift("File upload size exceeds Lyric service limits");
      suggestions.unshift("Split large files into smaller chunks");
      suggestions.unshift("Contact administrator about upload size limits");
    } else if (
      errorMessage.includes("validation") ||
      errorMessage.includes("INVALID")
    ) {
      suggestions.unshift("Data validation failed against dictionary schema");
      suggestions.unshift("Check CSV format and required fields");
      suggestions.unshift("Verify data types match schema expectations");
    }

    throw ErrorFactory.connection(
      `Lyric ${operation} failed: ${errorMessage}`,
      "Lyric",
      this.config.url,
      suggestions
    );
  }
}
