/**
 * Maestro Index Command
 *
 * Command for indexing data using the Maestro service.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { Command } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import axios, { AxiosResponse } from "axios";

/**
 * Command for indexing data using Maestro service
 * Enhanced with comprehensive validation and error handling
 */
export class MaestroIndexCommand extends Command {
  constructor() {
    super("Maestro Index");
  }

  /**
   * Enhanced validation with specific error messages for each parameter
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating Maestro indexing parameters`;

    // Enhanced validation for each required parameter
    this.validateIndexUrl(options);
    this.validateRepositoryCode(options);

    Logger.successString("Maestro indexing parameters validated");
  }

  /**
   * Enhanced execution with detailed logging and error handling
   */
  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Extract validated parameters
    const indexUrl = options.indexUrl || process.env.INDEX_URL;
    const repositoryCode =
      options.repositoryCode || process.env.REPOSITORY_CODE;
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

    // Command completed successfully - no return needed
  }

  /**
   * Enhanced repository code validation
   */
  private validateRepositoryCode(options: any): void {
    const repositoryCode =
      options.repositoryCode || process.env.REPOSITORY_CODE;

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
  private validateIndexUrl(options: any): void {
    const indexUrl = options.indexUrl || process.env.INDEX_URL;

    if (!indexUrl) {
      throw ErrorFactory.config(
        "Maestro index URL not configured",
        "indexUrl",
        [
          "Provide index URL: conductor maestroIndex --index-url http://localhost:11235",
          "Set INDEX_URL environment variable",
          "Verify Maestro service is running and accessible",
          "Check network connectivity to Maestro service",
          "Default Maestro port is usually 11235",
        ]
      );
    }

    try {
      const url = new URL(indexUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw ErrorFactory.validation(
          `Invalid protocol in Maestro URL: ${url.protocol}`,
          { indexUrl, protocol: url.protocol },
          [
            "Protocol must be http or https",
            "Use format: http://localhost:11235 or https://maestro.example.com",
            "Check for typos in the URL",
            "Verify the correct protocol with your administrator",
          ]
        );
      }
      Logger.debug`Using Maestro URL: ${indexUrl}`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error; // Re-throw enhanced errors
      }

      throw ErrorFactory.config(
        `Invalid Maestro URL format: ${indexUrl}`,
        "indexUrl",
        [
          "Use a valid URL format: http://localhost:11235",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 11235 for Maestro)",
          "Ensure proper URL encoding for special characters",
        ]
      );
    }
  }

  /**
   * Build the complete request URL with query parameters
   */
  private buildRequestUrl(
    baseUrl: string,
    repositoryCode: string,
    organization?: string,
    id?: string
  ): string {
    const url = new URL(`${baseUrl}/index`);

    url.searchParams.append("repositoryCode", repositoryCode);

    if (organization) {
      url.searchParams.append("organization", organization);
    }

    if (id) {
      url.searchParams.append("id", id);
    }

    return url.toString();
  }

  /**
   * Enhanced logging for indexing operation details
   */
  private logIndexingInfo(
    requestUrl: string,
    repositoryCode: string,
    organization?: string,
    id?: string
  ): void {
    Logger.section("Maestro Indexing Operation");
    Logger.info`Repository Code: ${repositoryCode}`;

    if (organization) {
      Logger.info`Organization: ${organization}`;
    }

    if (id) {
      Logger.info`ID Filter: ${id}`;
    }

    Logger.debug`Full request URL: ${requestUrl}`;
  }

  /**
   * Make the indexing request with enhanced error handling
   */
  private async makeIndexRequest(requestUrl: string): Promise<AxiosResponse> {
    try {
      const response = await axios.post(requestUrl);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const responseData = error.response?.data;

        // Enhanced error handling based on response status
        if (status === 404) {
          throw ErrorFactory.connection(
            "Maestro indexing endpoint not found",
            "Maestro",
            requestUrl,
            [
              "Check that Maestro service is running",
              "Verify the index URL is correct",
              "Ensure Maestro service version supports this endpoint",
              "Check Maestro service logs for errors",
              `Test manually: curl -X POST ${requestUrl}`,
            ]
          );
        }

        if (status === 400) {
          throw ErrorFactory.validation(
            `Invalid indexing parameters: ${
              responseData?.message || statusText
            }`,
            { status, responseData },
            [
              "Check repository code format and validity",
              "Verify organization parameter if provided",
              "Ensure ID parameter format is correct",
              "Review Maestro API documentation for parameter requirements",
              "Contact administrator for valid parameter values",
            ]
          );
        }

        if (status === 401 || status === 403) {
          throw ErrorFactory.connection(
            `Maestro access denied: ${statusText}`,
            "Maestro",
            requestUrl,
            [
              "Check authentication credentials",
              "Verify user permissions for indexing operations",
              "Contact administrator for access rights",
              "Ensure proper API keys or tokens are configured",
            ]
          );
        }

        if (status === 500) {
          throw ErrorFactory.connection(
            `Maestro server error: ${responseData?.message || statusText}`,
            "Maestro",
            requestUrl,
            [
              "Maestro service encountered an internal error",
              "Check Maestro service logs for details",
              "Retry the operation after a brief delay",
              "Contact system administrator if problem persists",
              "Verify system resources and service health",
            ]
          );
        }

        // Generic HTTP error
        throw ErrorFactory.connection(
          `Maestro request failed: ${status} ${statusText}`,
          "Maestro",
          requestUrl,
          [
            `HTTP ${status}: ${statusText}`,
            "Check Maestro service status and logs",
            "Verify network connectivity",
            "Review request parameters",
            "Contact administrator if problem persists",
          ]
        );
      }

      // Network or other errors
      throw ErrorFactory.connection(
        `Failed to connect to Maestro: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "Maestro",
        requestUrl,
        [
          "Check that Maestro service is running",
          "Verify network connectivity",
          "Check firewall and proxy settings",
          "Ensure correct URL and port",
          "Review network configuration",
        ]
      );
    }
  }

  /**
   * Enhanced success logging with operation details
   */
  private logSuccess(
    responseData: any,
    repositoryCode: string,
    organization?: string,
    id?: string
  ): void {
    Logger.success`Maestro indexing request completed successfully`;

    // Log response details if available
    if (responseData) {
      if (responseData.message) {
        Logger.info`Response: ${responseData.message}`;
      }

      if (responseData.indexedCount !== undefined) {
        Logger.info`Records indexed: ${responseData.indexedCount}`;
      }

      if (responseData.processingTime) {
        Logger.info`Processing time: ${responseData.processingTime}`;
      }
    }

    // Summary of what was indexed
    Logger.section("Indexing Summary");
    Logger.info`Repository: ${repositoryCode}`;

    if (organization) {
      Logger.info`Organization: ${organization}`;
    }

    if (id) {
      Logger.info`ID Filter: ${id}`;
    }

    Logger.tipString("Check Maestro logs for detailed indexing results");
  }
}
