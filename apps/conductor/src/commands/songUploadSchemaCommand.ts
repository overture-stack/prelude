/**
 * SONG Upload Schema Command
 *
 * Command for uploading schemas to the SONG service.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { Command } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score/songService";
import { ServiceConfig } from "../services/base/types";

/**
 * Command for uploading schemas to SONG service
 * Enhanced with comprehensive validation and error handling
 */
export class SongUploadSchemaCommand extends Command {
  constructor() {
    super("SONG Schema Upload");
  }

  /**
   * Enhanced validation with specific error messages for each parameter
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating SONG schema upload parameters`;

    // Enhanced validation for each required parameter
    this.validateSongUrl(options);
    this.validateSchemaFile(options);
    this.validateOptionalParameters(options);

    Logger.successString("SONG schema upload parameters validated");
  }

  /**
   * Enhanced execution with detailed logging and error handling
   */
  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Extract validated configuration
    const serviceConfig = this.extractServiceConfig(options);
    const schemaFile = options.schemaFile || process.env.SONG_SCHEMA;

    Logger.info`Starting SONG schema upload`;
    Logger.info`Schema file: ${schemaFile}`;
    Logger.info`SONG URL: ${serviceConfig.url}`;

    // Create service instance with enhanced error handling
    const songService = new SongService(serviceConfig);

    // Enhanced health check with specific feedback
    Logger.info`Checking SONG service health...`;
    const healthResult = await songService.checkHealth();
    if (!healthResult.healthy) {
      throw ErrorFactory.connection(
        "SONG service health check failed",
        "SONG",
        serviceConfig.url,
        [
          "Check that SONG service is running",
          `Verify service URL: ${serviceConfig.url}`,
          "Check network connectivity and firewall settings",
          "Review SONG service logs for errors",
          `Test manually: curl ${serviceConfig.url}/health`,
          healthResult.message
            ? `Health check message: ${healthResult.message}`
            : "",
        ]
      );
    }

    Logger.success`SONG service is healthy`;

    // Upload schema with enhanced error handling
    Logger.info`Uploading schema to SONG...`;
    const uploadResult = await songService.uploadSchema(schemaFile);

    // Enhanced success logging
    this.logUploadSuccess(uploadResult, schemaFile);

    // Command completed successfully
  }

  /**
   * Enhanced SONG URL validation
   */
  private validateSongUrl(options: any): void {
    const songUrl = options.songUrl || process.env.SONG_URL;

    if (!songUrl) {
      throw ErrorFactory.config("SONG service URL not configured", "songUrl", [
        "Set SONG URL: conductor songUploadSchema --song-url http://localhost:8080",
        "Set SONG_URL environment variable",
        "Verify SONG service is running and accessible",
        "Check network connectivity to SONG service",
        "Default SONG port is usually 8080",
      ]);
    }

    try {
      const url = new URL(songUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw ErrorFactory.validation(
          `Invalid protocol in SONG URL: ${url.protocol}`,
          { songUrl, protocol: url.protocol },
          [
            "Protocol must be http or https",
            "Use format: http://localhost:8080 or https://song.example.com",
            "Check for typos in the URL",
            "Verify the correct protocol with your administrator",
          ]
        );
      }
      Logger.debug`Using SONG URL: ${songUrl}`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error; // Re-throw enhanced errors
      }

      throw ErrorFactory.config(
        `Invalid SONG URL format: ${songUrl}`,
        "songUrl",
        [
          "Use a valid URL format: http://localhost:8080",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 8080 for SONG)",
          "Ensure proper URL encoding for special characters",
        ]
      );
    }
  }

  /**
   * Enhanced schema file validation
   */
  private validateSchemaFile(options: any): void {
    const schemaFile = options.schemaFile || process.env.SONG_SCHEMA;

    if (!schemaFile) {
      throw ErrorFactory.args(
        "Schema file not specified for upload",
        "songUploadSchema",
        [
          "Provide schema file: conductor songUploadSchema --schema-file schema.json",
          "Set SONG_SCHEMA environment variable",
          "Schema file should be in JSON format",
          "Ensure file contains valid SONG schema definition",
          "Check schema documentation for format requirements",
        ]
      );
    }

    if (typeof schemaFile !== "string" || schemaFile.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid schema file path",
        { schemaFile },
        [
          "Schema file path must be a non-empty string",
          "Use absolute or relative path to schema file",
          "Check for typos in file path",
          "Ensure file exists and is readable",
        ]
      );
    }

    // Basic file extension check
    if (!schemaFile.toLowerCase().endsWith(".json")) {
      Logger.warn`Schema file does not have .json extension: ${schemaFile}`;
      Logger.tipString("SONG schemas are typically JSON files");
    }

    Logger.debug`Schema file validated: ${schemaFile}`;
  }

  /**
   * Validate optional parameters with helpful guidance
   */
  private validateOptionalParameters(options: any): void {
    // Validate auth token if provided
    const authToken = options.authToken || process.env.AUTH_TOKEN;
    if (authToken && typeof authToken === "string" && authToken.trim() === "") {
      Logger.warn`Empty auth token provided - using default authentication`;
    }

    // Validate other optional parameters as needed
    Logger.debug`Optional parameters validated`;
  }

  /**
   * Extract service configuration from options
   */
  private extractServiceConfig(options: any): ServiceConfig {
    const songUrl = options.songUrl || process.env.SONG_URL;
    const authToken = options.authToken || process.env.AUTH_TOKEN || "123";

    return {
      url: songUrl,
      authToken,
      timeout: 30000, // 30 second timeout
      retries: 3,
    };
  }

  /**
   * Enhanced success logging with upload details
   */
  private logUploadSuccess(uploadResult: any, schemaFile: string): void {
    Logger.success`Schema uploaded successfully to SONG`;

    // Log upload details if available
    if (uploadResult) {
      if (uploadResult.schemaId) {
        Logger.info`Schema ID: ${uploadResult.schemaId}`;
      }

      if (uploadResult.version) {
        Logger.info`Schema version: ${uploadResult.version}`;
      }

      if (uploadResult.name) {
        Logger.info`Schema name: ${uploadResult.name}`;
      }

      if (uploadResult.description) {
        Logger.info`Description: ${uploadResult.description}`;
      }
    }

    // Summary information
    Logger.section("Upload Summary");
    Logger.info`Source file: ${schemaFile}`;
    Logger.info`Upload timestamp: ${new Date().toISOString()}`;

    Logger.tipString(
      "Schema is now available for use in SONG studies and analyses"
    );
    Logger.tipString(
      "Use 'songCreateStudy' command to create studies with this schema"
    );
  }
}
