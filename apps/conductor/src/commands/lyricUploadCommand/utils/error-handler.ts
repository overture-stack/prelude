import axios from "axios";
import { Logger } from "../../../utils/logger";
import { ConductorError, ErrorCodes } from "../../../utils/errors";
import chalk from "chalk";
import {
  ValidationErrorDetails,
  DetailedSubmissionError,
} from "../interfaces/submission-error.interface";
import { LyricCategory } from "../interfaces/lyric-category.interface";

/**
 * Represents a structured error response from Lyric
 */
interface LyricErrorResponse {
  entityName?: string;
  errorLocation?: string;
  errorType?: string;
  errorMessage?: string;
  errorDetails?: string;
  totalErrorCount?: number;
  errors?: Array<{
    type?: string;
    message?: string;
    path?: string[];
    details?: string;
  }>;
}

/**
 * Utility for handling and displaying errors in Lyric uploads
 */
export class ErrorHandlerUtility {
  /**
   * Fetch detailed validation errors from Lyric service
   * @param submissionId Submission ID to check
   * @param lyricUrl Lyric service URL
   * @returns Detailed validation error information
   */
  static async fetchDetailedValidationErrors(
    submissionId: string,
    lyricUrl: string
  ): Promise<ValidationErrorDetails> {
    try {
      // Fetch detailed submission error information
      const errorResponse = await axios.get(
        `${lyricUrl}/submission/${submissionId}/errors`,
        {
          headers: { accept: "application/json" },
          timeout: 10000,
        }
      );

      // Log raw error response for debugging
      Logger.debug(`Raw error response: ${JSON.stringify(errorResponse.data)}`);

      // Try multiple possible error response formats
      const errorData =
        this.normalizeLyricErrorResponse(errorResponse.data) ||
        this.extractAlternativeErrorFormat(errorResponse.data);

      // Enrich error details with more context
      return {
        submissionId,
        totalErrors:
          errorData.totalErrorCount ||
          (Array.isArray(errorData.errors) ? errorData.errors.length : 0),
        errorSamples: errorData.errors || [],
        rawErrorData: errorResponse.data, // Include raw error data for potential manual inspection
        entityName: errorData.entityName,
        errorLocation: errorData.errorLocation,
      };
    } catch (error) {
      // Log the full error for debugging
      Logger.error(
        `Error fetching validation errors: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // If we can't fetch detailed errors, return basic information
      return {
        submissionId,
        totalErrors: 0,
        errorSamples: [],
        rawErrorData: error instanceof Error ? { message: error.message } : {},
      };
    }
  }

  /**
   * Try to extract errors from alternative response formats
   */
  private static extractAlternativeErrorFormat(
    rawData: unknown
  ): LyricErrorResponse {
    // Some Lyric servers might return errors in different structures
    if (!rawData || typeof rawData !== "object") return {};

    const data = rawData as Record<string, unknown>;

    // Check for nested error structures
    if (data.validationErrors && Array.isArray(data.validationErrors)) {
      return {
        totalErrorCount: data.validationErrors.length,
        errors: (data.validationErrors as unknown[]).map(this.normalizeError),
      };
    }

    // Check for direct error array
    if (Array.isArray(data)) {
      return {
        totalErrorCount: data.length,
        errors: data.map(this.normalizeError),
      };
    }

    return {};
  }

  /**
   * Normalize Lyric error response to a consistent format
   * @param rawErrorData Raw error data from Lyric service
   * @returns Normalized error response
   */
  private static normalizeLyricErrorResponse(
    rawErrorData: unknown
  ): LyricErrorResponse {
    // If no data or not an object, return empty error response
    if (!rawErrorData || typeof rawErrorData !== "object") {
      return {};
    }

    const errorData = rawErrorData as Record<string, unknown>;

    // Extract total error count
    const totalErrorCount =
      typeof errorData.totalErrorCount === "number"
        ? errorData.totalErrorCount
        : 0;

    // Normalize errors
    const errors = Array.isArray(errorData.errors)
      ? errorData.errors.slice(0, 10).map(this.normalizeError)
      : [];

    return {
      totalErrorCount,
      errors,
      entityName:
        typeof errorData.entityName === "string"
          ? errorData.entityName
          : undefined,
      errorLocation:
        typeof errorData.errorLocation === "string"
          ? errorData.errorLocation
          : undefined,
    };
  }

  /**
   * Normalize a single error object
   * @param error Raw error object
   * @returns Normalized error object
   */
  private static normalizeError(error: unknown): DetailedSubmissionError {
    if (!error || typeof error !== "object") {
      return {
        type: "Unknown Error",
        message: "Unspecified validation error",
      };
    }

    const errorObj = error as Record<string, unknown>;

    return {
      type:
        typeof errorObj.type === "string" ? errorObj.type : "Validation Error",
      message:
        typeof errorObj.message === "string"
          ? errorObj.message
          : "Unspecified error",
      path: Array.isArray(errorObj.path)
        ? errorObj.path.map(String)
        : undefined,
      details:
        typeof errorObj.details === "string" ? errorObj.details : undefined,
    };
  }

  /**
   * Display validation errors in a user-friendly way
   * @param errorDetails Validation error details
   * @param fileName Name of the file with errors
   * @param lyricUrl Lyric service URL
   */
  static displayValidationErrors(
    errorDetails: ValidationErrorDetails,
    fileName: string,
    lyricUrl: string
  ): void {
    // Error summary section
    Logger.section("Validation Error Summary");

    // Total error count
    Logger.generic(
      chalk.red.bold(
        `Total Errors: ${(errorDetails.totalErrors || 0).toLocaleString()}`
      )
    );
    Logger.generic(chalk.gray(`File: ${fileName}`));
    Logger.generic("");

    // Display detailed error samples
    if (errorDetails.errorSamples && errorDetails.errorSamples.length > 0) {
      Logger.generic(chalk.bold("Error Details:"));

      errorDetails.errorSamples.forEach((error, index) => {
        // Error type and message
        Logger.generic(
          chalk.yellow(
            `${index + 1}. ${error.type || "Validation Error"}: ${
              error.message
            }`
          )
        );

        // Path/Location information
        if (error.path && error.path.length > 0) {
          Logger.generic(chalk.gray(`   Location: ${error.path.join(" > ")}`));
        }

        // Additional details
        if (error.details) {
          Logger.generic(chalk.gray(`   Details: ${error.details}`));
        }

        // Add a blank line between errors for readability
        Logger.generic("");
      });
    }

    // Troubleshooting guidance
    this.displayTroubleshootingGuidance(errorDetails, fileName, lyricUrl);
  }

  /**
   * Display troubleshooting guidance for validation errors
   * @param errorDetails Validation error details
   * @param fileName Name of the file with errors
   * @param lyricUrl Lyric service URL
   */
  private static displayTroubleshootingGuidance(
    errorDetails: ValidationErrorDetails,
    fileName: string,
    lyricUrl: string
  ): void {
    Logger.section("Troubleshooting Recommendations");

    // General validation advice
    Logger.generic(chalk.blue("To resolve these validation errors, consider:"));
    Logger.generic(chalk.gray("1. Check column names and structure"));
    Logger.generic(
      chalk.gray("2. Verify data types match schema requirements")
    );
    Logger.generic(chalk.gray("3. Ensure required fields are not empty"));
    Logger.generic(chalk.gray("4. Remove or escape special characters"));

    // Specific file and submission information
    Logger.generic("");
    Logger.generic(chalk.gray(`Problematic File: ${fileName}`));
    Logger.generic(
      chalk.gray(`Total Validation Errors: ${errorDetails.totalErrors}`)
    );

    // Link to full error details
    if (errorDetails.submissionId) {
      Logger.tip(
        `For complete error details, visit: ${lyricUrl}/submission/${errorDetails.submissionId}`
      );
    }
  }

  /**
   * Handle category-related errors
   * @param error The caught error
   * @param availableCategories List of available categories
   */
  static handleCategoryError(
    error: ConductorError,
    availableCategories: LyricCategory[]
  ): void {
    Logger.section("Category Selection");

    Logger.info("Invalid category ID. Available categories:");

    availableCategories.forEach((cat, index) => {
      Logger.generic(
        chalk.cyan(`${index + 1}. ID: ${cat.id}, Name: ${cat.name}`)
      );
    });

    Logger.tip(
      `Example: conductor lyricUpload -d ./data/yourfile.csv -c ${
        availableCategories[0]?.id || 1
      }`
    );
  }
}
