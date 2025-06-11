// src/commands/songUploadSchemaCommand.ts - Enhanced with ErrorFactory patterns
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { SongService } from "../services/song-score";
import { SongSchemaUploadParams } from "../services/song-score/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Command for uploading schemas to the SONG service
 * Enhanced with ErrorFactory patterns for better user feedback
 */
export class SongUploadSchemaCommand extends Command {
  constructor() {
    super("SONG Schema Upload");
  }

  /**
   * Enhanced validation with ErrorFactory patterns
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating SONG schema upload parameters`;

    // Enhanced schema file validation
    const schemaFile = this.getSchemaFile(options);
    this.validateSchemaFile(schemaFile);

    // Enhanced SONG URL validation
    const songUrl = this.getSongUrl(options);
    this.validateSongUrl(songUrl);

    Logger.successString("SONG schema upload parameters validated");
  }

  /**
   * Executes the SONG schema upload process
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration
      const schemaFile = this.getSchemaFile(options)!;
      const serviceConfig = this.extractServiceConfig(options);
      const uploadParams = this.extractUploadParams(schemaFile);

      // Create service instance
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
            "Check that SONG service is running and accessible",
            `Verify service URL: ${serviceConfig.url}`,
            "Check network connectivity and firewall settings",
            "Review SONG service logs for errors",
            `Test manually: curl ${serviceConfig.url}/isAlive`,
            "Ensure SONG is properly configured and started",
            healthResult.message
              ? `Health check message: ${healthResult.message}`
              : "",
          ].filter(Boolean)
        );
      }

      // Log upload info with enhanced context
      this.logUploadInfo(schemaFile, serviceConfig.url);

      // Upload schema - enhanced error handling
      Logger.info`Uploading schema to SONG service...`;
      const result = await songService.uploadSchema(uploadParams);

      // Enhanced success logging
      this.logSuccess(result, path.basename(schemaFile));

      return {
        success: true,
        details: {
          schemaFile,
          serviceUrl: serviceConfig.url,
          uploadResult: result,
        },
      };
    } catch (error) {
      return this.handleExecutionError(error, cliOutput);
    }
  }

  /**
   * Enhanced schema file validation
   */
  private validateSchemaFile(schemaFile: string | undefined): void {
    if (!schemaFile) {
      throw ErrorFactory.args(
        "Schema file not specified for SONG upload",
        "songUploadSchema",
        [
          "Provide schema file: conductor songUploadSchema --schema-file schema.json",
          "Set SONG_SCHEMA environment variable",
          "Ensure file contains valid SONG schema definition",
          "Schema should have 'name' and 'schema' fields",
        ]
      );
    }

    const fileName = path.basename(schemaFile);

    // Check file existence
    if (!fs.existsSync(schemaFile)) {
      throw ErrorFactory.file(
        `SONG schema file not found: ${fileName}`,
        schemaFile,
        [
          "Check that the file path is correct",
          "Ensure the file exists at the specified location",
          "Verify file permissions allow read access",
          `Current directory: ${process.cwd()}`,
          "Use absolute path if relative path is not working",
        ]
      );
    }

    // Check file extension
    const ext = path.extname(schemaFile).toLowerCase();
    if (ext !== ".json") {
      Logger.warn`Schema file extension is '${ext}' (expected '.json')`;
      Logger.tipString("SONG schemas should be JSON files");
    }

    // Check file readability
    try {
      fs.accessSync(schemaFile, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file(
        `SONG schema file is not readable: ${fileName}`,
        schemaFile,
        [
          "Check file permissions",
          "Ensure the file is not locked by another process",
          "Verify you have read access to the file",
          "Try copying the file to a different location",
        ]
      );
    }

    // Check file size
    const stats = fs.statSync(schemaFile);
    if (stats.size === 0) {
      throw ErrorFactory.file(
        `SONG schema file is empty: ${fileName}`,
        schemaFile,
        [
          "Ensure the file contains a valid SONG schema definition",
          "Check if the file was properly created or downloaded",
          "Verify the file is not corrupted",
          "SONG schemas should have 'name' and 'schema' fields",
        ]
      );
    }

    if (stats.size > 10 * 1024 * 1024) {
      // 10MB
      Logger.warn`Schema file is quite large: ${(
        stats.size /
        1024 /
        1024
      ).toFixed(1)}MB`;
      Logger.tipString(
        "Large schema files may take longer to upload and process"
      );
    }

    Logger.debug`Schema file validated: ${fileName}`;
  }

  /**
   * Enhanced SONG URL validation
   */
  private validateSongUrl(songUrl: string | undefined): void {
    if (!songUrl) {
      throw ErrorFactory.config("SONG service URL not configured", "songUrl", [
        "Set SONG URL: conductor songUploadSchema --song-url http://localhost:8080",
        "Set SONG_URL environment variable",
        "Verify SONG service is running and accessible",
        "Check network connectivity to SONG service",
      ]);
    }

    // Basic URL format validation
    try {
      const url = new URL(songUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Protocol must be http or https");
      }
      Logger.debug`Using SONG URL: ${songUrl}`;
    } catch (error) {
      throw ErrorFactory.config(
        `Invalid SONG URL format: ${songUrl}`,
        "songUrl",
        [
          "Use a valid URL format: http://localhost:8080",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 8080 for SONG)",
        ]
      );
    }
  }

  /**
   * Get schema file from various sources
   */
  private getSchemaFile(options: any): string | undefined {
    return options.schemaFile || process.env.SONG_SCHEMA;
  }

  /**
   * Get SONG URL from various sources
   */
  private getSongUrl(options: any): string | undefined {
    return options.songUrl || process.env.SONG_URL;
  }

  /**
   * Extract service configuration from options
   */
  private extractServiceConfig(options: any) {
    return {
      url: this.getSongUrl(options)!,
      timeout: 15000, // Longer timeout for schema operations
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Extract upload parameters from schema file with enhanced validation
   */
  private extractUploadParams(schemaFile: string): SongSchemaUploadParams {
    const fileName = path.basename(schemaFile);

    try {
      Logger.debug`Reading and parsing schema file: ${fileName}`;
      const schemaContent = fs.readFileSync(schemaFile, "utf-8");

      // Enhanced JSON validation
      try {
        const parsedSchema = JSON.parse(schemaContent);
        this.validateSchemaStructure(parsedSchema, fileName, schemaFile);
      } catch (jsonError) {
        throw ErrorFactory.file(
          `Invalid JSON format in SONG schema file: ${fileName}`,
          schemaFile,
          [
            "Check JSON syntax for errors (missing commas, brackets, quotes)",
            "Validate JSON structure using a JSON validator",
            "Ensure file encoding is UTF-8",
            "Try viewing the file in a JSON editor",
            jsonError instanceof Error
              ? `JSON error: ${jsonError.message}`
              : "",
          ].filter(Boolean)
        );
      }

      return { schemaContent };
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.file(
        `Error reading SONG schema file: ${fileName}`,
        schemaFile,
        [
          "Check file permissions and accessibility",
          "Verify file is not corrupted",
          "Ensure file encoding is UTF-8",
          "Try opening the file manually to inspect content",
        ]
      );
    }
  }

  /**
   * Enhanced schema structure validation
   */
  private validateSchemaStructure(
    schema: any,
    fileName: string,
    filePath: string
  ): void {
    if (!schema || typeof schema !== "object") {
      throw ErrorFactory.validation(
        `Invalid schema structure in SONG schema file: ${fileName}`,
        { schema, file: filePath },
        [
          "Schema must be a valid JSON object",
          "Check that the file contains proper SONG schema definition",
          "Ensure the schema follows SONG format requirements",
          "Review SONG documentation for schema structure",
        ]
      );
    }

    // Check for required SONG schema fields
    if (!schema.name || typeof schema.name !== "string") {
      throw ErrorFactory.validation(
        `Missing or invalid 'name' field in SONG schema: ${fileName}`,
        { schema: Object.keys(schema), file: filePath },
        [
          "Add a 'name' field with a descriptive string value",
          "SONG schemas require a descriptive name property",
          "Use names like 'sequencing-experiment' or 'variant-call'",
          "Check SONG documentation for naming conventions",
        ]
      );
    }

    if (!schema.schema || typeof schema.schema !== "object") {
      throw ErrorFactory.validation(
        `Missing or invalid 'schema' field in SONG schema: ${fileName}`,
        { providedFields: Object.keys(schema), file: filePath },
        [
          "Add a 'schema' field containing the JSON schema definition",
          "The 'schema' field should be a valid JSON Schema object",
          "Include 'type' and 'properties' in the schema definition",
          "Review SONG documentation for schema format requirements",
        ]
      );
    }

    Logger.debug`SONG schema structure validated: ${fileName} (${schema.name})`;
  }

  /**
   * Enhanced upload information logging
   */
  private logUploadInfo(schemaFile: string, serviceUrl: string): void {
    const fileName = path.basename(schemaFile);

    Logger.info`${chalk.bold.cyan("SONG Schema Upload Details:")}`;
    Logger.generic(`  Service: ${serviceUrl}/schemas`);
    Logger.generic(`  Schema File: ${fileName}`);

    // Parse schema for additional info
    try {
      const schemaContent = fs.readFileSync(schemaFile, "utf-8");
      const schema = JSON.parse(schemaContent);
      Logger.generic(`  Schema Name: ${schema.name || "Unnamed"}`);
      if (schema.version) {
        Logger.generic(`  Version: ${schema.version}`);
      }
    } catch (error) {
      Logger.debug`Could not parse schema for logging: ${error}`;
    }
  }

  /**
   * Enhanced success logging with detailed information
   */
  private logSuccess(result: any, fileName: string): void {
    Logger.success`SONG schema uploaded successfully`;
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    ✓ File: ${fileName}`));
    Logger.generic(
      chalk.gray(`    ✓ Schema ID: ${result.id || "Generated by SONG"}`)
    );
    Logger.generic(
      chalk.gray(`    ✓ Schema Name: ${result.name || "As specified in file"}`)
    );
    Logger.generic(
      chalk.gray(`    ✓ Version: ${result.version || "As specified in file"}`)
    );

    if (result.created_at) {
      Logger.generic(chalk.gray(`    ✓ Created: ${result.created_at}`));
    }

    Logger.generic(" ");
    Logger.tipString(
      "Schema is now available for analysis submissions in SONG"
    );
  }

  /**
   * Enhanced execution error handling with context-specific guidance
   */
  private handleExecutionError(
    error: unknown,
    cliOutput: CLIOutput
  ): CommandResult {
    const schemaFile = this.getSchemaFile(cliOutput.options);
    const fileName = schemaFile ? path.basename(schemaFile) : "unknown";
    const serviceUrl = this.getSongUrl(cliOutput.options);

    if (error instanceof Error && error.name === "ConductorError") {
      // Add schema upload context to existing errors
      return {
        success: false,
        errorMessage: error.message,
        errorCode: (error as any).code,
        details: {
          ...(error as any).details,
          schemaFile,
          fileName,
          command: "songUploadSchema",
          serviceUrl,
        },
      };
    }

    // Handle service-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    let suggestions = [
      "Check SONG service connectivity and availability",
      "Verify schema file format and content",
      "Ensure schema follows SONG requirements",
      "Review SONG service logs for additional details",
      "Use --debug flag for detailed error information",
    ];

    // Add specific suggestions based on error content
    if (
      errorMessage.includes("validation") ||
      errorMessage.includes("INVALID")
    ) {
      suggestions.unshift("Schema validation failed - check schema structure");
      suggestions.unshift(
        "Ensure schema has required 'name' and 'schema' fields"
      );
      suggestions.unshift("Verify schema follows JSON Schema format");
    } else if (
      errorMessage.includes("404") ||
      errorMessage.includes("not found")
    ) {
      suggestions.unshift("SONG schemas endpoint may not be available");
      suggestions.unshift("Check SONG service URL and API version");
      suggestions.unshift("Verify SONG service is properly configured");
    } else if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("401")
    ) {
      suggestions.unshift("Check authentication token if required");
      suggestions.unshift("Verify API credentials and permissions");
    }

    return {
      success: false,
      errorMessage: `SONG schema upload failed: ${errorMessage}`,
      errorCode: "CONNECTION_ERROR",
      details: {
        originalError: error,
        schemaFile,
        fileName,
        suggestions,
        command: "songUploadSchema",
        serviceUrl,
      },
    };
  }
}
