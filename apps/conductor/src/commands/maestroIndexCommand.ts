import axios from "axios";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";

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
 */
export class MaestroIndexCommand extends Command {
  private readonly TIMEOUT = 30000; // 30 seconds

  constructor() {
    super("maestroIndex");
    this.defaultOutputFileName = "index-repository-results.json";
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
        throw new ConductorError(
          "Repository code not specified. Use --repository-code or set REPOSITORY_CODE environment variable.",
          ErrorCodes.INVALID_ARGS
        );
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
      Logger.info(`\x1b[1;36mIndexing Repository:\x1b[0m`);
      Logger.info(`URL: ${url}`);
      Logger.info(`Repository Code: ${repositoryCode}`);
      if (organization) Logger.info(`Organization: ${organization}`);
      if (id) Logger.info(`ID: ${id}`);

      // Make the request
      Logger.info("Sending indexing request...");
      const response = await axios.post(url, "", {
        headers: {
          accept: "application/json",
        },
        timeout: this.TIMEOUT,
      });

      // Process response
      const responseData = response.data as IndexRepositoryResponse;

      // Log success message
      Logger.success(`Repository indexing request successful`);
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
      if (error instanceof ConductorError) {
        throw error;
      }

      // Handle Axios errors with more detail
      if (this.isAxiosError(error)) {
        const axiosError = error as any;
        const status = axiosError.response?.status;
        const responseData = axiosError.response?.data as
          | Record<string, unknown>
          | undefined;

        let errorMessage = `Repository indexing failed: ${axiosError.message}`;
        let errorDetails: Record<string, unknown> = {
          status,
          responseData,
        };

        // Handle common error cases
        if (status === 404) {
          errorMessage = `Repository not found: The specified repository code may be invalid`;
        } else if (status === 401 || status === 403) {
          errorMessage = `Authentication error: Ensure you have proper permissions`;
        } else if (status === 400) {
          errorMessage = `Bad request: ${
            responseData?.message || "Invalid parameters"
          }`;
        } else if (status === 500) {
          errorMessage = `Server error: The indexing service encountered an internal error`;
        } else if (axiosError.code === "ECONNREFUSED") {
          errorMessage = `Connection refused: The indexing service at ${
            options.indexUrl || "http://localhost:11235"
          } is not available`;
        } else if (axiosError.code === "ETIMEDOUT") {
          errorMessage = `Request timeout: The indexing service did not respond in time`;
        }

        Logger.error(errorMessage);

        // Provide some helpful tips based on error type
        if (status === 404 || status === 400) {
          Logger.tip(
            `Verify that the repository code "${options.repositoryCode}" is correct`
          );
        } else if (axiosError.code === "ECONNREFUSED") {
          Logger.tip(
            `Ensure the indexing service is running on ${
              options.indexUrl || "http://localhost:11235"
            }`
          );
        }

        throw new ConductorError(
          errorMessage,
          ErrorCodes.CONNECTION_ERROR,
          errorDetails
        );
      }

      // Generic error handling
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      throw new ConductorError(
        `Repository indexing failed: ${errorMessage}`,
        ErrorCodes.CONNECTION_ERROR,
        error
      );
    }
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

  /**
   * Validates command line arguments
   * @param cliOutput - The parsed command line arguments
   * @returns Promise that resolves when validation is complete
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;
    const repositoryCode =
      options.repositoryCode || process.env.REPOSITORY_CODE;

    if (!repositoryCode) {
      throw new ConductorError(
        "No repository code provided. Use --repository-code option or set REPOSITORY_CODE environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }
}
