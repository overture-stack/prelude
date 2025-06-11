// src/commands/maestroIndexCommand.ts - Enhanced with ErrorFactory patterns
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
 * Enhanced with ErrorFactory patterns for better user feedback
 */
export class MaestroIndexCommand extends Command {
  private readonly TIMEOUT = 30000; // 30 seconds

  constructor() {
    super("maestroIndex");
    this.defaultOutputFileName = "index-repository-results.json";
  }

  /**
   * Enhanced validation with ErrorFactory patterns
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating Maestro indexing parameters`;

    // Enhanced repository code validation
    const repositoryCode = this.getRepositoryCode(options);
    this.validateRepositoryCode(repositoryCode);

    // Enhanced index URL validation
    const indexUrl = this.getIndexUrl(options);
    this.validateIndexUrl(indexUrl);

    // Optional parameter validation
    this.validateOptionalParameters(options);

    Logger.successString("Maestro indexing parameters validated");
  }

  /**
   * Executes the repository indexing process with enhanced error handling
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration with enhanced validation
      const indexUrl = this.getIndexUrl(options);
      const repositoryCode = this.getRepositoryCode(options)!;
      const organization = options.organization || process.env.ORGANIZATION;
      const id = options.id || process.env.ID;

      // Construct the URL based on provided parameters
      const requestUrl = this.buildRequestUrl(
        indexUrl,
        repositoryCode,
        organization,
        id
      );

      // Log indexing information with enhanced context
      this.logIndexingInfo(requestUrl, repositoryCode, organization, id);

      // Make the request with enhanced error handling
      Logger.info`Sending indexing request to Maestro...`;
      const response = await this.makeIndexRequest(requestUrl);

      // Enhanced success logging
      this.logSuccess(response.data, repositoryCode, organization, id);

      return {
        success: true,
        details: {
          repository: repositoryCode,
          organization: organization || "All",
          id: id || "All",
          requestUrl,
          response: response.data,
        },
      };
    } catch (error) {
      return this.handleExecutionError(error, cliOutput);
    }
  }

  /**
   * Enhanced repository code validation
   */
  private validateRepositoryCode(repositoryCode: string | undefined): void {
    if (!repositoryCode) {
      throw ErrorFactory.args(
        "Repository code required for indexing operation",
        "maestroIndex",
        [
          "Provide repository code: conductor maestroIndex --repository-code lyric.overture",
          "Set REPOSITORY_CODE environment variable",
          "Repository codes identify data sources in the system",
          "Contact system administrator for valid repository codes",
          "Common examples: 'lyric.overture', 'song.overture'",
        ]
      );
    }

    if (typeof repositoryCode !== "string" || repositoryCode.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid repository code format",
        { repositoryCode },
        [
          "Repository code must be a non-empty string",
          "Use format like 'service.instance' (e.g., 'lyric.overture')",
          "Check for typos or extra whitespace",
          "Verify the repository code with your administrator",
        ]
      );
    }

    // Basic format validation
    if (!/^[a-zA-Z0-9._-]+$/.test(repositoryCode)) {
      throw ErrorFactory.validation(
        `Repository code contains invalid characters: ${repositoryCode}`,
        { repositoryCode },
        [
          "Use only letters, numbers, dots, hyphens, and underscores",
          "Example format: 'lyric.overture' or 'song_instance'",
          "Avoid spaces and special characters",
          "Check with administrator for valid naming conventions",
        ]
      );
    }

    Logger.debug`Repository code validated: ${repositoryCode}`;
  }

  /**
   * Enhanced index URL validation
   */
  private validateIndexUrl(indexUrl: string): void {
    try {
      const url = new URL(indexUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Protocol must be http or https");
      }
      Logger.debug`Using index service URL: ${indexUrl}`;
    } catch (error) {
      throw ErrorFactory.config(
        `Invalid index service URL format: ${indexUrl}`,
        "indexUrl",
        [
          "Use a valid URL format: http://localhost:11235",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 11235 for Maestro)",
          "Ensure the indexing service is accessible",
        ]
      );
    }
  }

  /**
   * Validate optional parameters
   */
  private validateOptionalParameters(options: any): void {
    const organization = options.organization || process.env.ORGANIZATION;
    const id = options.id || process.env.ID;

    if (organization && typeof organization !== "string") {
      Logger.warn`Invalid organization parameter type, ignoring`;
    }

    if (id && typeof id !== "string") {
      Logger.warn`Invalid ID parameter type, ignoring`;
    }

    if (organization) {
      Logger.debug`Organization filter: ${organization}`;
    }

    if (id) {
      Logger.debug`ID filter: ${id}`;
    }

    Logger.debug`Optional parameters validated`;
  }

  /**
   * Build request URL with proper encoding
   */
  private buildRequestUrl(
    baseUrl: string,
    repositoryCode: string,
    organization?: string,
    id?: string
  ): string {
    // Normalize base URL
    const normalizedBase = baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;

    // Build URL path
    let urlPath = `/index/repository/${encodeURIComponent(repositoryCode)}`;

    if (organization) {
      urlPath += `/organization/${encodeURIComponent(organization)}`;
      if (id) {
        urlPath += `/id/${encodeURIComponent(id)}`;
      }
    }

    return normalizedBase + urlPath;
  }

  /**
   * Make the index request with enhanced error handling
   */
  private async makeIndexRequest(
    url: string
  ): Promise<{ data: IndexRepositoryResponse }> {
    try {
      const response = await axios.post(url, "", {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: this.TIMEOUT,
      });

      return response;
    } catch (error) {
      // Enhanced Axios error handling with specific suggestions
      if (this.isAxiosError(error)) {
        const axiosError = error as any;
        const status = axiosError.response?.status;
        const responseData = axiosError.response?.data;

        // Handle specific HTTP status codes
        if (status === 404) {
          throw ErrorFactory.connection(
            "Repository not found or indexing endpoint not available",
            "Maestro",
            url,
            [
              "Verify the repository code is correct and exists",
              "Check that the indexing service is running",
              "Confirm the API endpoint is available",
              "Verify the repository is registered in the system",
              `Test endpoint availability: curl -X POST ${url}`,
            ]
          );
        } else if (status === 401 || status === 403) {
          throw ErrorFactory.connection(
            "Authentication or authorization failed",
            "Maestro",
            url,
            [
              "Check if authentication is required for indexing",
              "Verify API credentials and permissions",
              "Ensure proper access rights for repository indexing",
              "Contact administrator for indexing permissions",
            ]
          );
        } else if (status === 400) {
          const errorMessage =
            responseData?.message || "Invalid request parameters";
          throw ErrorFactory.validation(
            `Indexing request validation failed: ${errorMessage}`,
            { status, responseData, url },
            [
              "Check repository code format and validity",
              "Verify organization and ID parameters if provided",
              "Ensure request parameters meet API requirements",
              "Review indexing service documentation",
            ]
          );
        } else if (status === 500) {
          throw ErrorFactory.connection(
            "Indexing service encountered an internal error",
            "Maestro",
            url,
            [
              "The indexing service may be experiencing issues",
              "Check indexing service logs for details",
              "Try again later if the service is temporarily unavailable",
              "Contact administrator if the problem persists",
            ]
          );
        } else if (axiosError.code === "ECONNREFUSED") {
          throw ErrorFactory.connection(
            "Cannot connect to indexing service - connection refused",
            "Maestro",
            url,
            [
              "Check that the indexing service is running",
              "Verify the service URL and port are correct",
              "Ensure no firewall is blocking the connection",
              "Confirm the service is accessible from your network",
              `Test connection: curl ${url.split("/index")[0]}/health`,
            ]
          );
        } else if (axiosError.code === "ETIMEDOUT") {
          throw ErrorFactory.connection(
            "Indexing request timed out",
            "Maestro",
            url,
            [
              "The indexing operation may be taking longer than expected",
              "Large repositories may require more time to index",
              "Check network connectivity and service performance",
              "Try again with a specific organization or ID filter",
              "Contact administrator if timeouts persist",
            ]
          );
        }

        // Generic Axios error
        throw ErrorFactory.connection(
          `Indexing request failed: ${axiosError.message}`,
          "Maestro",
          url,
          [
            "Check indexing service connectivity and status",
            "Verify request parameters and format",
            "Review network settings and firewall rules",
            "Try the request again or contact support",
          ]
        );
      }

      // Non-Axios error
      throw error;
    }
  }

  /**
   * Get repository code from various sources
   */
  private getRepositoryCode(options: any): string | undefined {
    return options.repositoryCode || process.env.REPOSITORY_CODE;
  }

  /**
   * Get index URL from various sources
   */
  private getIndexUrl(options: any): string {
    return (
      options.indexUrl || process.env.INDEX_URL || "http://localhost:11235"
    );
  }

  /**
   * Enhanced indexing information logging
   */
  private logIndexingInfo(
    url: string,
    repositoryCode: string,
    organization?: string,
    id?: string
  ): void {
    Logger.info`${chalk.bold.cyan("Maestro Repository Indexing Details:")}`;
    Logger.generic(`  Endpoint: ${url}`);
    Logger.generic(`  Repository Code: ${repositoryCode}`);

    if (organization) {
      Logger.generic(`  Organization Filter: ${organization}`);
    } else {
      Logger.generic(`  Organization Filter: All organizations`);
    }

    if (id) {
      Logger.generic(`  ID Filter: ${id}`);
    } else {
      Logger.generic(`  ID Filter: All IDs`);
    }
  }

  /**
   * Enhanced success logging with detailed information
   */
  private logSuccess(
    responseData: IndexRepositoryResponse,
    repositoryCode: string,
    organization?: string,
    id?: string
  ): void {
    Logger.success`Repository indexing request completed successfully`;
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    ✓ Repository: ${repositoryCode}`));

    if (organization) {
      Logger.generic(chalk.gray(`    ✓ Organization: ${organization}`));
    } else {
      Logger.generic(chalk.gray(`    ✓ Organization: All`));
    }

    if (id) {
      Logger.generic(chalk.gray(`    ✓ ID: ${id}`));
    } else {
      Logger.generic(chalk.gray(`    ✓ ID: All`));
    }

    if (responseData?.message) {
      Logger.generic(chalk.gray(`    ✓ Response: ${responseData.message}`));
    }

    if (responseData?.status) {
      Logger.generic(chalk.gray(`    ✓ Status: ${responseData.status}`));
    }

    Logger.generic(" ");
    Logger.tipString(
      "Indexing operation has been initiated - check indexing service logs for progress"
    );
  }

  /**
   * Enhanced execution error handling with context-specific guidance
   */
  private handleExecutionError(
    error: unknown,
    cliOutput: CLIOutput
  ): CommandResult {
    const options = cliOutput.options;
    const repositoryCode = this.getRepositoryCode(options) || "unknown";
    const indexUrl = this.getIndexUrl(options);

    if (error instanceof Error && error.name === "ConductorError") {
      // Add indexing context to existing errors
      return {
        success: false,
        errorMessage: error.message,
        errorCode: (error as any).code,
        details: {
          ...(error as any).details,
          repositoryCode,
          command: "maestroIndex",
          serviceUrl: indexUrl,
        },
      };
    }

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const suggestions = [
      "Check indexing service connectivity and availability",
      "Verify repository code is correct and exists",
      "Ensure proper network connectivity",
      "Review indexing service configuration",
      "Use --debug flag for detailed error information",
      "Contact administrator if the problem persists",
    ];

    return {
      success: false,
      errorMessage: `Repository indexing failed: ${errorMessage}`,
      errorCode: "CONNECTION_ERROR",
      details: {
        originalError: error,
        repositoryCode,
        suggestions,
        command: "maestroIndex",
        serviceUrl: indexUrl,
      },
    };
  }

  /**
   * Type guard to check if an error is an Axios error
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
