import axios from "axios";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";

// Type definition for Axios error (since direct import isn't working)
interface AxiosErrorResponse {
  response?: {
    status?: number;
    data?: unknown;
  };
  message: string;
}

/**
 * Response from Lectern schema upload
 */
export interface LecternUploadResponse {
  /** The unique identifier for the uploaded schema */
  id?: string;

  /** The name of the schema */
  name?: string;

  /** The version of the schema */
  version?: string;

  /** Any error message returned by Lectern */
  error?: string;

  /** Additional response details */
  [key: string]: any;
}

/**
 * Formats and logs detailed error information
 * @param errorData Error details from Lectern API
 */
function formatLecternError(errorData: any): void {
  // Handle different error scenarios with more descriptive messages
  switch (errorData.error) {
    case "BadRequest":
      Logger.generic(chalk.gray("   "));
      Logger.generic(chalk.gray("    Possible reasons:"));
      Logger.generic(chalk.gray("   "));
      Logger.generic(chalk.gray("        - Schema might already exist"));
      Logger.generic(chalk.gray("        - Invalid schema format"));
      Logger.generic(chalk.gray("        - Duplicate upload attempt"));
      break;
    case "SchemaParsingError":
      Logger.generic(chalk.gray("Schema validation failed:"));
      if (Array.isArray(errorData.message)) {
        errorData.message.forEach((validationError: any, index: number) => {
          Logger.generic(
            chalk.gray(
              `  ${index + 1}. Field: ${validationError.path?.join(".")} `
            )
          );
          Logger.generic(
            chalk.gray(`     - Validation: ${validationError.validation}`)
          );
          Logger.generic(chalk.gray(`     - Code: ${validationError.code}`));
          Logger.generic(
            chalk.gray(`     - Message: ${validationError.message}`)
          );
        });
      }
      break;
    default:
      Logger.generic(
        chalk.gray(`Error Details: ${JSON.stringify(errorData, null, 2)}`)
      );
  }
}

/**
 * Service class for Lectern operations
 */
export class LecternService {
  private url: string;
  private authToken: string;

  /**
   * Creates a new LecternService instance
   *
   * @param baseUrl - Base URL for the Lectern service
   * @param authToken - Authentication token for API access
   */
  constructor(baseUrl: string, authToken: string) {
    this.url = this.normalizeUrl(baseUrl);
    this.authToken = authToken;
  }

  /**
   * Gets the normalized Lectern URL
   *
   * @returns The normalized URL for the Lectern dictionaries endpoint
   */
  getUrl(): string {
    return this.url;
  }

  /**
   * Uploads a schema to the Lectern server
   *
   * @param schemaContent - The schema content as a JSON string
   * @returns Promise resolving to the upload response
   */
  async uploadSchema(schemaContent: string): Promise<LecternUploadResponse> {
    try {
      // Parse schema to validate JSON before sending
      const schemaData = JSON.parse(schemaContent);

      // Make request to Lectern API
      const response = await axios.post<LecternUploadResponse>(
        this.url,
        schemaData,
        {
          headers: {
            Accept: "*/*",
            Authorization: this.authToken,
            "Content-Type": "application/json",
          },
        }
      );

      // Check if response contains error
      if (response.data && "error" in response.data && response.data.error) {
        throw new ConductorError(
          `Lectern API error: ${response.data.error}`,
          ErrorCodes.CONNECTION_ERROR
        );
      }

      return response.data;
    } catch (error: unknown) {
      // Type guard to check if error is an Axios error
      const isAxiosError = (err: unknown): err is AxiosErrorResponse =>
        err !== null &&
        typeof err === "object" &&
        "response" in err &&
        "message" in err;

      // Handle axios errors
      if (isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;

        let errorMessage = `Failed to upload schema: ${error.message}`;

        // Detailed error parsing
        if (responseData && typeof responseData === "object") {
          // Try to extract more detailed error information
          const detailedError = responseData as {
            error?: string;
            message?: string | any[];
            details?: string;
          };

          // Format and log detailed Lectern error
          if (detailedError.error || detailedError.message) {
            // Log error type
            Logger.error(`Type: ${detailedError.error || "Unknown"}`);

            // Provide more context based on error type
            formatLecternError(detailedError);
          }

          errorMessage = `Lectern API error: ${
            detailedError.error ||
            (Array.isArray(detailedError.message)
              ? detailedError.message[0]?.message
              : detailedError.message) ||
            detailedError.details ||
            "Unknown error"
          }`;
        }

        throw new ConductorError(
          errorMessage,
          statusCode === 401 || statusCode === 403
            ? ErrorCodes.AUTH_ERROR
            : ErrorCodes.CONNECTION_ERROR,
          error
        );
      }

      // Re-throw ConductorError as is
      if (error instanceof ConductorError) {
        throw error;
      }

      // Wrap JSON parsing errors
      if (error instanceof SyntaxError) {
        throw new ConductorError(
          `Invalid schema format: ${error.message}`,
          ErrorCodes.INVALID_FILE,
          error
        );
      }

      // Wrap other errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new ConductorError(
        `Failed to upload schema: ${errorMessage}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Normalizes the Lectern URL to ensure it points to the dictionaries endpoint
   *
   * @param url - Input URL
   * @returns Normalized URL
   */
  private normalizeUrl(url: string): string {
    // Remove trailing slash if present
    let normalizedUrl = url.endsWith("/") ? url.slice(0, -1) : url;

    // Ensure URL ends with /dictionaries
    if (!normalizedUrl.endsWith("/dictionaries")) {
      normalizedUrl = `${normalizedUrl}/dictionaries`;
    }

    return normalizedUrl;
  }
}
