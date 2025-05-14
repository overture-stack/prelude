import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Lectern dictionary information
 */
interface LecternDictionaryInfo {
  /** Dictionary ID */
  id: string;

  /** Dictionary name */
  name: string;

  /** Schema name */
  schemaName: string;
}

/**
 * Parameters for data submission to Lyric
 */
export interface LyricDataSubmissionParams {
  /** Category ID */
  categoryId: string;

  /** Organization name */
  organization: string;

  /** Data directory path */
  dataDirectory: string;

  /** Max retry attempts for validation check */
  maxRetries?: number;

  /** Delay between retry attempts in milliseconds */
  retryDelay?: number;
}

/**
 * Response from Lyric data submission
 */
export interface LyricSubmissionResponse {
  /** Submission ID */
  submissionId: string;

  /** Submission status */
  status: string;

  /** Additional response details */
  [key: string]: any;
}

/**
 * Lectern schema response type
 */
interface LecternSchemaResponse {
  schemas?: Array<{
    name: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Lyric submission status response type
 */
interface LyricSubmissionStatusResponse {
  status?: string;
  [key: string]: any;
}

/**
 * Helper function to safely extract error message
 * @param err - Any error object
 * @returns String representation of the error
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

/**
 * Enhanced LyricService with data loading functionality
 */
export class LyricDataService {
  private lyricUrl: string;
  private lecternUrl: string;
  private readonly MAX_RETRIES: number = 0;
  private readonly RETRY_DELAY: number = 20000; // 20 seconds
  private readonly TIMEOUT: number = 10000; // 10 seconds

  // Cache for dictionary information
  private dictionaryInfo: LecternDictionaryInfo | null = null;

  /**
   * Creates a new LyricDataService instance
   *
   * @param lyricUrl - Lyric service URL
   * @param lecternUrl - Lectern service URL
   */
  constructor(lyricUrl: string, lecternUrl: string) {
    if (!lyricUrl) {
      throw new ConductorError(
        "Lyric URL is required for service initialization",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (!lecternUrl) {
      throw new ConductorError(
        "Lectern URL is required for dictionary information",
        ErrorCodes.INVALID_ARGS
      );
    }

    this.lyricUrl = this.normalizeUrl(lyricUrl);
    this.lecternUrl = this.normalizeUrl(lecternUrl);
  }

  /**
   * Gets dictionary information from Lectern
   *
   * @returns Promise resolving to dictionary information
   */
  async getDictionaryInfo(): Promise<LecternDictionaryInfo> {
    // Return cached info if available
    if (this.dictionaryInfo) {
      return this.dictionaryInfo;
    }

    Logger.info("Fetching dictionary information from Lectern...");

    try {
      // Get dictionary list
      const dictResponse = await axios.get(`${this.lecternUrl}/dictionaries`, {
        headers: { accept: "application/json" },
        timeout: this.TIMEOUT,
      });

      // Make sure we have dictionary data
      if (!dictResponse.data || !Array.isArray(dictResponse.data)) {
        throw new ConductorError(
          "Invalid response from Lectern - no dictionaries found",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      // Get the first dictionary (matching the bash script behavior)
      const dictionary = dictResponse.data[0];

      if (!dictionary || !dictionary._id || !dictionary.name) {
        throw new ConductorError(
          "Could not find dictionary in Lectern",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      const dictId = dictionary._id;
      const dictName = dictionary.name;

      Logger.debug(`Found dictionary: ${dictName} (ID: ${dictId})`);

      // Get schema details
      const schemaResponse = await axios.get<LecternSchemaResponse>(
        `${this.lecternUrl}/dictionaries/${dictId}`,
        {
          headers: { accept: "application/json" },
          timeout: this.TIMEOUT,
        }
      );

      const schemaData = schemaResponse.data;

      if (
        !schemaData ||
        !schemaData.schemas ||
        !Array.isArray(schemaData.schemas) ||
        schemaData.schemas.length === 0
      ) {
        throw new ConductorError(
          "Could not find schema in dictionary",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      const schemaName = schemaData.schemas[0].name;

      if (!schemaName) {
        throw new ConductorError(
          "Could not find schema name in dictionary",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      Logger.debug(`Found schema name: ${schemaName}`);

      // Cache and return the dictionary info
      this.dictionaryInfo = {
        id: dictId,
        name: dictName,
        schemaName: schemaName,
      };

      return this.dictionaryInfo;
    } catch (unknownError) {
      if (unknownError instanceof ConductorError) {
        throw unknownError;
      }

      throw new ConductorError(
        `Failed to fetch dictionary information from Lectern: ${getErrorMessage(
          unknownError
        )}`,
        ErrorCodes.CONNECTION_ERROR,
        unknownError
      );
    }
  }

  /**
   * Validates and finds files matching the schema name in the data directory
   *
   * @param dataDirectory - Directory containing CSV files
   * @returns Promise resolving to an array of valid file paths
   */
  async findValidFiles(dataDirectory: string): Promise<string[]> {
    // Verify directory exists
    if (!fs.existsSync(dataDirectory)) {
      throw new ConductorError(
        `Directory not found: ${dataDirectory}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Get dictionary info to check schema name
    const dictInfo = await this.getDictionaryInfo();
    const schemaName = dictInfo.schemaName;

    Logger.info(`Valid schema name from dictionary: ${schemaName}`);

    // Find all CSV files in the directory
    const files = fs
      .readdirSync(dataDirectory)
      .filter(
        (file) =>
          file.endsWith(".csv") &&
          fs.statSync(path.join(dataDirectory, file)).isFile()
      );

    if (files.length === 0) {
      throw new ConductorError(
        `No CSV files found in ${dataDirectory}`,
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate each file against schema name
    const validFiles: string[] = [];
    const renamedFiles: string[] = [];

    for (const file of files) {
      const basename = path.basename(file, ".csv");

      if (basename === schemaName) {
        // Exact match
        validFiles.push(file);
      } else if (basename.startsWith(schemaName)) {
        // File starts with schema name - rename it
        const oldPath = path.join(dataDirectory, file);
        const newFileName = `${schemaName}.csv`;
        const newPath = path.join(dataDirectory, newFileName);

        try {
          fs.renameSync(oldPath, newPath);
          Logger.info(`Renamed ${file} to ${newFileName}`);
          validFiles.push(newFileName);
          renamedFiles.push(newFileName);
        } catch (unknownError) {
          Logger.warn(
            `Failed to rename ${file} to ${newFileName}: ${getErrorMessage(
              unknownError
            )}`
          );
        }
      } else {
        Logger.warn(`File '${file}' does not match schema name.`);
      }
    }

    if (validFiles.length === 0) {
      throw new ConductorError(
        `No valid schema-matching files found in ${dataDirectory}`,
        ErrorCodes.INVALID_ARGS,
        {
          suggestion: `Please rename your files to match the valid schema name: ${schemaName}.csv`,
        }
      );
    }

    Logger.info(
      `Found ${validFiles.length} valid CSV files matching schema: ${schemaName}`
    );
    for (const file of validFiles) {
      Logger.info(`- ${file}`);
    }

    return validFiles;
  }

  /**
   * Submits data files to Lyric
   *
   * @param params - Data submission parameters
   * @returns Promise resolving to submission response
   */
  async submitData(
    params: LyricDataSubmissionParams
  ): Promise<LyricSubmissionResponse> {
    const { categoryId, organization, dataDirectory } = params;

    try {
      // Find valid files
      const validFiles = await this.findValidFiles(dataDirectory);

      // Prepare form data
      const formData = new FormData();

      // Add each file to form data
      for (const file of validFiles) {
        const filePath = path.join(dataDirectory, file);
        const fileData = fs.readFileSync(filePath);
        const blob = new Blob([fileData], { type: "text/csv" });
        formData.append("files", blob, file);
      }

      // Add organization
      formData.append("organization", organization);

      // Log submission information
      Logger.info(`\x1b[1;36mSubmitting Data:\x1b[0m`);
      Logger.info(`API URL: ${this.lyricUrl}`);
      Logger.info(`Category ID: ${categoryId}`);
      Logger.info(`Organization: ${organization}`);
      Logger.info(`Data Directory: ${dataDirectory}`);
      Logger.info(`Files to submit: ${validFiles.join(", ")}`);

      // Submit data
      const response = await axios.post<{ submissionId?: string }>(
        `${this.lyricUrl}/submission/category/${categoryId}/data`,
        formData,
        {
          headers: {
            accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const responseData = response.data;

      // Extract submission ID
      const submissionId = responseData?.submissionId;

      if (!submissionId) {
        throw new ConductorError(
          "Could not extract submission ID from response",
          ErrorCodes.CONNECTION_ERROR,
          {
            response: responseData,
          }
        );
      }

      Logger.success(`Submission ID: ${submissionId}`);

      return {
        submissionId: submissionId.toString(),
        status: "PENDING",
        ...(responseData && typeof responseData === "object"
          ? responseData
          : {}),
      };
    } catch (unknownError) {
      if (unknownError instanceof ConductorError) {
        throw unknownError;
      }

      if (this.isAxiosError(unknownError)) {
        const error = unknownError as any;
        const errorMessage =
          (error.response?.data?.message
            ? String(error.response.data.message)
            : "") || (error.message ? String(error.message) : "Unknown error");

        throw new ConductorError(
          `Data submission failed: ${errorMessage}`,
          ErrorCodes.CONNECTION_ERROR,
          {
            status: error.response?.status,
            response: error.response?.data,
          }
        );
      }

      throw new ConductorError(
        `Data submission failed: ${getErrorMessage(unknownError)}`,
        ErrorCodes.CONNECTION_ERROR,
        unknownError
      );
    }
  }

  /**
   * Checks submission status
   *
   * @param categoryId - Category ID
   * @param submissionId - Submission ID
   * @returns Promise resolving to the submission status
   */
  async checkSubmissionStatus(
    categoryId: string,
    submissionId: string
  ): Promise<string> {
    try {
      const response = await axios.get<LyricSubmissionStatusResponse>(
        `${this.lyricUrl}/submission/${submissionId}`,
        {
          headers: { accept: "application/json" },
        }
      );

      const responseData = response.data;
      const status = responseData?.status;

      if (!status) {
        throw new ConductorError(
          "Could not extract status from response",
          ErrorCodes.CONNECTION_ERROR,
          {
            response: responseData,
          }
        );
      }

      Logger.info(`Current status: ${status}`);
      return status;
    } catch (unknownError) {
      if (unknownError instanceof ConductorError) {
        throw unknownError;
      }

      throw new ConductorError(
        `Failed to check submission status: ${getErrorMessage(unknownError)}`,
        ErrorCodes.CONNECTION_ERROR,
        unknownError
      );
    }
  }

  /**
   * Waits for submission validation to complete
   *
   * @param categoryId - Category ID
   * @param submissionId - Submission ID
   * @param maxRetries - Maximum number of retry attempts
   * @param retryDelay - Delay between retries in milliseconds
   * @returns Promise resolving to the final submission status
   */
  async waitForValidation(
    categoryId: string,
    submissionId: string,
    maxRetries: number = 10,
    retryDelay: number = 20000
  ): Promise<string> {
    let retries = 0;

    while (retries < maxRetries) {
      Logger.info(
        `Checking submission status (attempt ${retries + 1}/${maxRetries})...`
      );

      try {
        const status = await this.checkSubmissionStatus(
          categoryId,
          submissionId
        );

        if (status === "VALID") {
          Logger.success(`Submission is valid`);
          return status;
        } else if (status === "INVALID") {
          throw new ConductorError(
            "Submission validation failed",
            ErrorCodes.VALIDATION_FAILED,
            {
              submissionId,
              status,
            }
          );
        }

        // Wait for next check
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retries++;
      } catch (unknownError) {
        if (unknownError instanceof ConductorError) {
          throw unknownError;
        }

        throw new ConductorError(
          `Error checking submission status: ${getErrorMessage(unknownError)}`,
          ErrorCodes.CONNECTION_ERROR,
          unknownError
        );
      }
    }

    throw new ConductorError(
      `Validation timed out after ${maxRetries} attempts`,
      ErrorCodes.CONNECTION_ERROR,
      {
        submissionId,
        attempts: maxRetries,
      }
    );
  }

  /**
   * Commits a validated submission
   *
   * @param categoryId - Category ID
   * @param submissionId - Submission ID
   * @returns Promise resolving to true if commit successful
   */
  async commitSubmission(
    categoryId: string,
    submissionId: string
  ): Promise<boolean> {
    try {
      Logger.info(`\x1b[1;36mCommitting Submission:\x1b[0m ${submissionId}`);

      const response = await axios.post(
        `${this.lyricUrl}/submission/category/${categoryId}/commit/${submissionId}`,
        "",
        {
          headers: { accept: "application/json" },
        }
      );

      Logger.success(`Submission committed successfully`);
      return true;
    } catch (unknownError) {
      throw new ConductorError(
        `Failed to commit submission: ${getErrorMessage(unknownError)}`,
        ErrorCodes.CONNECTION_ERROR,
        unknownError
      );
    }
  }

  /**
   * Loads data into Lyric by submitting, validating, and committing in one operation
   *
   * @param params - Data submission parameters
   * @returns Promise resolving to the final submission response
   */
  async loadData(
    params: LyricDataSubmissionParams
  ): Promise<LyricSubmissionResponse> {
    const { categoryId, maxRetries, retryDelay } = params;

    try {
      // Submit data
      const submission = await this.submitData(params);
      const submissionId = submission.submissionId;

      // Wait for validation to complete
      const status = await this.waitForValidation(
        categoryId,
        submissionId,
        maxRetries || this.MAX_RETRIES,
        retryDelay || this.RETRY_DELAY
      );

      // Commit the submission if valid
      if (status === "VALID") {
        await this.commitSubmission(categoryId, submissionId);

        return {
          ...submission,
          status: "COMMITTED",
        };
      } else {
        throw new ConductorError(
          `Submission has unexpected status: ${status}`,
          ErrorCodes.VALIDATION_FAILED,
          {
            submissionId,
            status,
          }
        );
      }
    } catch (unknownError) {
      if (unknownError instanceof ConductorError) {
        throw unknownError;
      }

      throw new ConductorError(
        `Data loading failed: ${getErrorMessage(unknownError)}`,
        ErrorCodes.CONNECTION_ERROR,
        unknownError
      );
    }
  }

  /**
   * Normalizes a URL by removing trailing slash
   *
   * @param url - URL to normalize
   * @returns Normalized URL
   */
  private normalizeUrl(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  /**
   * Type guard to check if an error is an Axios error
   *
   * @param error - Error to check
   * @returns Whether the error is an Axios error
   */
  private isAxiosError(error: any): boolean {
    return Boolean(
      error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        error.isAxiosError === true
    );
  }
}
