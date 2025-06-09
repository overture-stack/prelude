// src/services/lyric/LyricSubmissionService.ts
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ConductorError, ErrorCodes } from "../../utils/errors";
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

      throw new ConductorError(
        `Submission validation failed with status: ${finalStatus}`,
        ErrorCodes.VALIDATION_FAILED,
        { submissionId: submission.submissionId, status: finalStatus }
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
      throw new ConductorError(
        `Data directory not found: ${dataDirectory}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    if (!fs.statSync(dataDirectory).isDirectory()) {
      throw new ConductorError(
        `Path is not a directory: ${dataDirectory}`,
        ErrorCodes.INVALID_ARGS
      );
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
      throw new ConductorError(
        `No valid CSV files found in ${dataDirectory}`,
        ErrorCodes.FILE_NOT_FOUND,
        { directory: dataDirectory }
      );
    }

    Logger.info(`Found ${allFiles.length} valid CSV files`);
    allFiles.forEach((file) => Logger.info(`  - ${path.basename(file)}`));

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
    Logger.info(`Submitting ${params.files.length} files to Lyric...`);

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
      throw new ConductorError(
        "Could not extract submission ID from response",
        ErrorCodes.CONNECTION_ERROR,
        { response: response.data }
      );
    }

    Logger.success(`Submission created with ID: ${submissionId}`);
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
    Logger.info(`Waiting for submission ${submissionId} validation...`);
    Logger.info(
      "This may take a few minutes depending on file size and complexity."
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.http.get<{ status?: string }>(
          `/submission/${submissionId}`
        );

        const status = response.data?.status;
        if (!status) {
          throw new ConductorError(
            "Could not extract status from response",
            ErrorCodes.CONNECTION_ERROR,
            { response: response.data }
          );
        }

        Logger.info(`Validation check ${attempt}/${maxRetries}: ${status}`);

        if (status === "VALID") {
          Logger.success("Submission validation passed");
          return status;
        } else if (status === "INVALID") {
          throw new ConductorError(
            "Submission validation failed",
            ErrorCodes.VALIDATION_FAILED,
            {
              submissionId,
              status,
              suggestion: `Check validation details at ${this.config.url}/submission/${submissionId}`,
            }
          );
        }

        // Still processing, wait before next check
        if (attempt < maxRetries) {
          Logger.info(
            `Waiting ${retryDelay / 1000} seconds before next check...`
          );
          await this.delay(retryDelay);
        }
      } catch (error) {
        if (error instanceof ConductorError) {
          throw error;
        }

        if (attempt === maxRetries) {
          this.handleServiceError(error, "validation status check");
        }

        Logger.warn(
          `Status check failed, retrying... (${attempt}/${maxRetries})`
        );
        await this.delay(retryDelay);
      }
    }

    throw new ConductorError(
      `Validation timed out after ${maxRetries} attempts`,
      ErrorCodes.CONNECTION_ERROR,
      {
        submissionId,
        attempts: maxRetries,
        suggestion: `Check status manually at ${this.config.url}/submission/${submissionId}`,
      }
    );
  }

  /**
   * Commit a validated submission
   */
  private async commitSubmission(
    categoryId: string,
    submissionId: string
  ): Promise<void> {
    Logger.info(`Committing submission: ${submissionId}`);

    // Send empty object instead of null
    await this.http.post(
      `/submission/category/${categoryId}/commit/${submissionId}`,
      {}
    );

    Logger.success("Submission committed successfully");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
