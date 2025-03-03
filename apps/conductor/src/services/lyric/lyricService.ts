import axios from "axios";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Response from Lyric dictionary registration
 */
export interface LyricRegistrationResponse {
  /** Whether the registration was successful */
  success: boolean;

  /** Status message */
  message?: string;

  /** Error message if registration failed */
  error?: string;

  /** Additional response details */
  [key: string]: any;
}

/**
 * Parameters for dictionary registration
 */
export interface DictionaryRegistrationParams {
  /** Category name for the dictionary */
  categoryName: string;

  /** Dictionary name */
  dictionaryName: string;

  /** Dictionary version */
  dictionaryVersion: string;

  /** Default centric entity */
  defaultCentricEntity: string;
}

/**
 * Type definition for API response data
 */
interface ApiResponseData {
  error?: string;
  message?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Service class for Lyric operations
 */
export class LyricService {
  private url: string;

  /**
   * Creates a new LyricService instance
   *
   * @param baseUrl - Base URL for the Lyric service
   */
  constructor(baseUrl: string) {
    if (!baseUrl) {
      throw new ConductorError(
        "Lyric URL is required for service initialization",
        ErrorCodes.INVALID_ARGS
      );
    }

    this.url = this.normalizeUrl(baseUrl);
  }

  /**
   * Gets the normalized Lyric URL
   *
   * @returns The normalized URL for the Lyric service
   */
  getUrl(): string {
    return this.url;
  }

  /**
   * Registers a dictionary with the Lyric service
   *
   * @param params - Dictionary registration parameters
   * @returns Promise resolving to the registration response
   */
  async registerDictionary(
    params: DictionaryRegistrationParams
  ): Promise<LyricRegistrationResponse> {
    try {
      const {
        categoryName,
        dictionaryName,
        dictionaryVersion,
        defaultCentricEntity,
      } = params;

      // Validate required parameters
      if (
        !categoryName ||
        !dictionaryName ||
        !dictionaryVersion ||
        !defaultCentricEntity
      ) {
        throw new ConductorError(
          "Missing required parameters for dictionary registration",
          ErrorCodes.INVALID_ARGS
        );
      }

      // Construct the registration endpoint URL
      const registerUrl = `${this.url}/dictionary/register`;

      Logger.info(`Registering dictionary to ${registerUrl}`, {
        categoryName,
        dictionaryName,
        dictionaryVersion,
        defaultCentricEntity,
      });

      // Construct form data (as URLSearchParams for application/x-www-form-urlencoded)
      const formData = new URLSearchParams();
      formData.append("categoryName", categoryName);
      formData.append("dictionaryName", dictionaryName);
      formData.append("dictionaryVersion", dictionaryVersion);
      formData.append("defaultCentricEntity", defaultCentricEntity);

      // Make the API call
      const response = await axios.post<ApiResponseData>(
        registerUrl,
        formData.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
        }
      );

      const responseData = response.data;

      // Check if response contains error
      if (
        responseData &&
        typeof responseData === "object" &&
        "error" in responseData &&
        responseData.error
      ) {
        throw new ConductorError(
          `Lyric API error: ${responseData.error}`,
          ErrorCodes.CONNECTION_ERROR
        );
      }

      Logger.info("Dictionary registration successful", {
        response: responseData,
      });

      return {
        success: true,
        message: "Dictionary registered successfully",
        ...(typeof responseData === "object" ? responseData : {}),
      };
    } catch (error) {
      // Handle axios errors
      if (this.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data as
          | ApiResponseData
          | undefined;

        // Start with a basic error message
        let errorMessage = `Failed to register dictionary: ${error.message}`;
        let errorDetails: any = {};

        // Detailed error parsing
        if (responseData && typeof responseData === "object") {
          // Extract all useful information
          errorDetails = {
            status: statusCode,
            endpoint: `${this.url}/dictionary/register`,
            params: {
              categoryName: params.categoryName,
              dictionaryName: params.dictionaryName,
              dictionaryVersion: params.dictionaryVersion,
              defaultCentricEntity: params.defaultCentricEntity,
            },
          };

          // Add response data to the details if available
          if (responseData.error) errorDetails.error = responseData.error;
          if (responseData.message) errorDetails.message = responseData.message;
          if (responseData.details) errorDetails.details = responseData.details;
          if (responseData.code) errorDetails.code = responseData.code;

          // Format the main error message
          if (statusCode === 400) {
            errorMessage = `Lyric API error: Bad Request - ${
              responseData.message ||
              (responseData.error === "Bad Request"
                ? "The dictionary registration request was rejected by the server"
                : responseData.error) ||
              "Invalid request parameters"
            }`;

            // Add more context for common bad request causes
            if (
              errorMessage.includes("already exists") ||
              (responseData.message &&
                responseData.message.toString().includes("already exists"))
            ) {
              errorDetails.suggestion =
                "A dictionary with these parameters may already exist in the Lyric service";
            } else if (errorMessage.includes("invalid")) {
              errorDetails.suggestion =
                "Check the format and values of all parameters";
            }
          } else {
            errorMessage = `Lyric API error: ${
              responseData.error ||
              responseData.message ||
              `HTTP Error ${statusCode}`
            }`;
          }
        }

        // Log detailed information for debugging
        Logger.debug(
          `Detailed error information: ${JSON.stringify(errorDetails, null, 2)}`
        );

        // Create appropriate error code based on status
        const errorCode =
          statusCode === 401 || statusCode === 403
            ? ErrorCodes.AUTH_ERROR
            : ErrorCodes.CONNECTION_ERROR;

        throw new ConductorError(errorMessage, errorCode, errorDetails);
      }

      // Re-throw ConductorError as is
      if (error instanceof ConductorError) {
        throw error;
      }

      // Wrap other errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new ConductorError(
        `Failed to register dictionary: ${errorMessage}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
  }

  /**
   * Checks the health of the Lyric service
   * @returns Promise resolving to a boolean indicating health status
   */
  async checkHealth(): Promise<boolean> {
    try {
      const healthUrl = `${this.url.replace(
        /\/dictionary\/register$/,
        ""
      )}/health`;

      Logger.info(`Checking Lyric health at ${healthUrl}`);

      const response = await axios.get<ApiResponseData>(healthUrl, {
        timeout: 10000, // 10 seconds timeout
        headers: { accept: "*/*" },
      });

      const responseData = response.data;
      const isHealthy =
        response.status === 200 &&
        (!responseData.status ||
          responseData.status === "UP" ||
          responseData.status === "Healthy");

      if (isHealthy) {
        Logger.info(`\x1b[32mSuccess:\x1b[0m Lyric service is healthy`);
        return true;
      } else {
        Logger.warn(
          `Lyric health check failed. Status: ${JSON.stringify(responseData)}`
        );
        return false;
      }
    } catch (error) {
      Logger.error(
        `Failed to check Lyric health: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Normalizes the Lyric URL
   *
   * @param url - Input URL
   * @returns Normalized URL
   */
  private normalizeUrl(url: string): string {
    // Remove trailing slash if present
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  /**
   * Type guard to check if an error is an Axios error
   *
   * @param error - The error to check
   * @returns Whether the error is an Axios error
   */
  private isAxiosError(error: unknown): error is any {
    return Boolean(
      error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        (error as any).isAxiosError === true
    );
  }
}
