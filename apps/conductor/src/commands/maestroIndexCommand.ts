import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";

/**
 * Response from index repository request
 */
interface IndexRepositoryResponse {
  message?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Command for indexing a repository with optional organization and ID filters
 * Updated to use error factory pattern for consistent error handling
 */
export class MaestroIndexCommand extends Command {
  private readonly TIMEOUT = 30000; // 30 seconds

  constructor() {
    super("maestroIndex");
  }

  /**
   * Override base validation since maestro doesn't need input files
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;
    const repositoryCode =
      options.repositoryCode || process.env.REPOSITORY_CODE;

    if (!repositoryCode) {
      throw ErrorFactory.args("Repository code is required", [
        "Use --repository-code option to specify repository",
        "Set REPOSITORY_CODE environment variable",
        "Example: --repository-code lyric.overture",
      ]);
    }
  }

  /**
   * Executes the repository indexing process
   * @param cliOutput The CLI configuration and inputs
   * @returns A CommandResult indicating success or failure
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration from options or environment variables
      const indexUrl =
        options.indexUrl || process.env.INDEX_URL || "http://localhost:11235";
      const repositoryCode =
        options.repositoryCode || process.env.REPOSITORY_CODE;
      const organization = options.organization || process.env.ORGANIZATION;
      const id = options.id || process.env.ID;

      // Validate required parameters
      if (!repositoryCode) {
        throw ErrorFactory.args("Repository code not specified", [
          "Use --repository-code option to specify repository",
          "Set REPOSITORY_CODE environment variable",
          "Example: --repository-code lyric.overture",
        ]);
      }

      // Construct the URL based on provided parameters
      let url = `${indexUrl}/index/repository/${repositoryCode}`;
      if (organization) {
        url += `/organization/${organization}`;
        if (id) {
          url += `/id/${id}`;
        }
      }

      // Log indexing information
      Logger.info`${chalk.bold.cyan("Indexing Repository:")}`;
      Logger.infoString(`URL: ${url}`);
      Logger.infoString(`Repository Code: ${repositoryCode}`);
      if (organization) Logger.infoString(`Organization: ${organization}`);
      if (id) Logger.infoString(`ID: ${id}`);

      // Make the request
      Logger.infoString("Sending indexing request...");
      const response = await axios.post(url, "", {
        headers: {
          accept: "application/json",
        },
        timeout: this.TIMEOUT,
      });

      // Process response
      const responseData = response.data as IndexRepositoryResponse;

      // Log success message
      Logger.successString(`Repository indexing request successful`);
      Logger.generic(" ");
      Logger.generic(chalk.gray(`    - Repository: ${repositoryCode}`));
      if (organization)
        Logger.generic(chalk.gray(`    - Organization: ${organization}`));
      if (id) Logger.generic(chalk.gray(`    - ID: ${id}`));
      if (responseData && responseData.message) {
        Logger.generic(chalk.gray(`    - Message: ${responseData.message}`));
      }
      Logger.generic(" ");

      return {
        success: true,
        details: {
          repository: repositoryCode,
          organization: organization || "All",
          id: id || "All",
          response: responseData,
        },
      };
    } catch (error: unknown) {
      // Handle errors and return failure result
      return this.handleIndexingError(error, options);
    }
  }

  /**
   * Handle indexing errors with specific categorization
   */
  private handleIndexingError(error: unknown, options: any): CommandResult {
    // If it's already a ConductorError, preserve it
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;
      return {
        success: false,
        errorMessage: conductorError.message,
        errorCode: conductorError.code,
        details: conductorError.details,
      };
    }

    // Handle Axios errors with more detail
    if (this.isAxiosError(error)) {
      const axiosError = error as any;
      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data;
      const serviceUrl = options.indexUrl || "http://localhost:11235";

      // Handle specific HTTP status codes
      if (status === 404) {
        const notFoundError = ErrorFactory.validation(
          "Repository not found",
          {
            status,
            repositoryCode: options.repositoryCode,
            responseData,
          },
          [
            "Verify the repository code is correct",
            `Check that repository '${options.repositoryCode}' exists`,
            "Ensure you have access to this repository",
          ]
        );

        return {
          success: false,
          errorMessage: notFoundError.message,
          errorCode: notFoundError.code,
          details: notFoundError.details,
        };
      }

      if (status === 401 || status === 403) {
        const authError = ErrorFactory.auth(
          "Authentication failed",
          {
            status,
            serviceUrl,
            responseData,
          },
          [
            "Check your authentication credentials",
            "Verify you have permissions to index repositories",
            "Contact administrator for access",
          ]
        );

        return {
          success: false,
          errorMessage: authError.message,
          errorCode: authError.code,
          details: authError.details,
        };
      }

      if (status === 400) {
        const badRequestError = ErrorFactory.validation(
          "Invalid request parameters",
          {
            status,
            responseData,
            repositoryCode: options.repositoryCode,
          },
          [
            "Check repository code format and spelling",
            "Verify organization and ID parameters are valid",
            responseData?.message
              ? `Server message: ${responseData.message}`
              : null,
          ].filter(Boolean) as string[]
        );

        return {
          success: false,
          errorMessage: badRequestError.message,
          errorCode: badRequestError.code,
          details: badRequestError.details,
        };
      }

      if (status >= 500) {
        const serverError = ErrorFactory.connection(
          "Indexing service encountered an error",
          {
            status,
            serviceUrl,
            responseData,
          },
          [
            "The indexing service is experiencing issues",
            "Try the request again after a few moments",
            "Check service logs for more details",
            "Contact support if the issue persists",
          ]
        );

        return {
          success: false,
          errorMessage: serverError.message,
          errorCode: serverError.code,
          details: serverError.details,
        };
      }

      // Handle network-level errors
      if (axiosError.code === "ECONNREFUSED") {
        const connectionError = ErrorFactory.connection(
          "Connection refused",
          {
            serviceUrl,
            code: axiosError.code,
          },
          [
            `Ensure the indexing service is running on ${serviceUrl}`,
            "Check that the service URL and port are correct",
            "Verify network connectivity",
            "Review firewall settings",
          ]
        );

        return {
          success: false,
          errorMessage: connectionError.message,
          errorCode: connectionError.code,
          details: connectionError.details,
        };
      }

      if (axiosError.code === "ETIMEDOUT") {
        const timeoutError = ErrorFactory.connection(
          "Request timeout",
          {
            serviceUrl,
            timeout: this.TIMEOUT,
            code: axiosError.code,
          },
          [
            "The indexing service did not respond in time",
            "Check service performance and load",
            "Try the request again",
            "Consider increasing timeout if needed",
          ]
        );

        return {
          success: false,
          errorMessage: timeoutError.message,
          errorCode: timeoutError.code,
          details: timeoutError.details,
        };
      }

      // Generic HTTP error
      const httpError = ErrorFactory.connection(
        `HTTP ${status || "unknown"} error during indexing`,
        {
          status,
          serviceUrl,
          responseData,
          axiosCode: axiosError.code,
        },
        [
          "Check the indexing service status",
          "Verify request parameters",
          "Review service logs for details",
        ]
      );

      return {
        success: false,
        errorMessage: httpError.message,
        errorCode: httpError.code,
        details: httpError.details,
      };
    }

    // Generic error handling for non-axios errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const genericError = ErrorFactory.connection(
      "Repository indexing failed",
      { originalError: error },
      [
        "Check indexing service availability",
        "Verify network connectivity",
        "Use --debug for detailed error information",
      ]
    );

    return {
      success: false,
      errorMessage: genericError.message,
      errorCode: genericError.code,
      details: genericError.details,
    };
  }

  /**
   * Type guard to check if an error is an Axios error
   * @param error Any error object
   * @returns Whether the error is an Axios error
   */
  private isAxiosError(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        (error as { isAxiosError: boolean }).isAxiosError === true
    );
  }
}
