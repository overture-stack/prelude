// src/services/lyric/LyricSubmissionService.ts
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
      this.handleServiceError(error, "data submission workflow");
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

    Logger.info`Found ${allFiles.length} valid CSV files`;
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
    Logger.info`Submitting ${params.files.length} files to Lyric...`;

    // Create FormData for file upload
    const formData = new FormData();

    // Add files
    for (const filePath of params.files) {
      const fileData = fs.readFileSync(filePath);
      const blob = new Blob([fileData], { type: "text/csv" });
      formData.append("files", blob, path.basename(filePath));
    }

    // Add organization
    formData.append("organization", params.organization);

    const response = await this.http.post<{ submissionId?: string }>(
      `/submission/category/${params.categoryId}/data`,
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
          Logger.successString("Submission validation passed");
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
      },
      [
        `Validation did not complete after ${maxRetries} attempts`,
        `Check status manually at ${this.config.url}/submission/${submissionId}`,
        "Consider increasing max retries or retry delay",
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

    // Send empty object instead of null
    await this.http.post(
      `/submission/category/${categoryId}/commit/${submissionId}`,
      {}
    );

    Logger.successString("Submission committed successfully");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
