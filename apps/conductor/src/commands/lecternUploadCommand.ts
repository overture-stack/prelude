// src/commands/lecternUploadCommand.ts - Enhanced with ErrorFactory patterns
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { LecternService } from "../services/lectern";
import { LecternSchemaUploadParams } from "../services/lectern/types";
import { ServiceConfigManager } from "../config/serviceConfigManager";
import * as fs from "fs";
import * as path from "path";

/**
 * Command for uploading schemas to the Lectern service
 * Enhanced with ErrorFactory patterns and improved user feedback
 */
export class LecternUploadCommand extends Command {
  constructor() {
    super("Lectern Schema Upload");
  }

  /**
   * Override validation since we don't use filePaths for this command
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Enhanced schema file validation
    const schemaFile = this.getSchemaFile(options);

    if (!schemaFile) {
      throw ErrorFactory.args(
        "Schema file not specified for Lectern upload",
        "lecternUpload",
        [
          "Provide a schema file: conductor lecternUpload --schema-file dictionary.json",
          "Set LECTERN_SCHEMA environment variable",
          "Use -s or --schema-file parameter",
          "Ensure the file contains a valid Lectern dictionary schema",
        ]
      );
    }

    Logger.debug`Validating schema file: ${schemaFile}`;

    // Enhanced file validation
    this.validateSchemaFile(schemaFile);

    // Enhanced service URL validation
    const lecternUrl = options.lecternUrl || process.env.LECTERN_URL;
    if (!lecternUrl) {
      throw ErrorFactory.config(
        "Lectern service URL not configured",
        "lecternUrl",
        [
          "Set Lectern URL: conductor lecternUpload --lectern-url http://localhost:3031",
          "Set LECTERN_URL environment variable",
          "Verify Lectern service is running and accessible",
          "Check network connectivity to Lectern service",
        ]
      );
    }

    Logger.debug`Using Lectern URL: ${lecternUrl}`;
  }

  /**
   * Executes the Lectern schema upload process with enhanced error handling
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration using the new simplified system
      const schemaFile = this.getSchemaFile(options)!;
      const fileName = path.basename(schemaFile);

      Logger.info`Starting Lectern schema upload for: ${fileName}`;

      // Use the new ServiceConfigManager
      const serviceConfig = ServiceConfigManager.createLecternConfig({
        url: options.lecternUrl,
        authToken: options.authToken,
      });

      // Validate the configuration
      ServiceConfigManager.validateConfig(serviceConfig);

      // Parse and validate schema content
      const uploadParams = this.extractUploadParams(schemaFile);

      // Create service instance with enhanced error handling
      const lecternService = new LecternService(serviceConfig);

      // Enhanced health check with specific feedback
      Logger.info`Checking Lectern service health...`;
      const healthResult = await lecternService.checkHealth();
      if (!healthResult.healthy) {
        throw ErrorFactory.connection(
          "Lectern service health check failed",
          "Lectern",
          serviceConfig.url,
          [
            "Check that Lectern service is running",
            `Verify service URL: ${serviceConfig.url}`,
            "Check network connectivity",
            "Review Lectern service logs for errors",
            `Test manually: curl ${serviceConfig.url}/health`,
            healthResult.message
              ? `Health check message: ${healthResult.message}`
              : "",
          ].filter(Boolean)
        );
      }

      // Log upload info with enhanced context
      this.logUploadInfo(fileName, serviceConfig.url, uploadParams);

      // Upload schema with enhanced error context
      Logger.info`Uploading schema to Lectern service...`;
      const result = await lecternService.uploadSchema(uploadParams);

      // Enhanced success logging
      this.logSuccess(result, fileName);

      return {
        success: true,
        details: {
          schemaFile,
          fileName,
          serviceUrl: serviceConfig.url,
          uploadResult: result,
        },
      };
    } catch (error) {
      return this.handleExecutionError(error, cliOutput);
    }
  }

  /**
   * Get schema file from various sources with enhanced validation
   */
  private getSchemaFile(options: any): string | undefined {
    const schemaFile = options.schemaFile || process.env.LECTERN_SCHEMA;

    if (schemaFile) {
      Logger.debug`Schema file source: ${
        options.schemaFile ? "command line" : "environment variable"
      }`;
    }

    return schemaFile;
  }

  /**
   * Enhanced schema file validation
   */
  private validateSchemaFile(schemaFile: string): void {
    const fileName = path.basename(schemaFile);

    // Check file existence
    if (!fs.existsSync(schemaFile)) {
      throw ErrorFactory.file(
        `Schema file not found: ${fileName}`,
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
      Logger.tipString("Lectern schemas should typically be JSON files");
    }

    // Check file readability
    try {
      fs.accessSync(schemaFile, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file(
        `Schema file is not readable: ${fileName}`,
        schemaFile,
        [
          "Check file permissions",
          "Ensure the file is not locked by another process",
          "Verify you have read access to the file",
        ]
      );
    }

    // Check file size
    const stats = fs.statSync(schemaFile);
    if (stats.size === 0) {
      throw ErrorFactory.file(`Schema file is empty: ${fileName}`, schemaFile, [
        "Ensure the file contains a valid schema definition",
        "Check if the file was properly created",
        "Verify the file is not corrupted",
      ]);
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
  }

  /**
   * Extract and validate upload parameters from schema file
   */
  private extractUploadParams(schemaFile: string): LecternSchemaUploadParams {
    const fileName = path.basename(schemaFile);

    try {
      Logger.debug`Reading and parsing schema file: ${fileName}`;
      const schemaContent = fs.readFileSync(schemaFile, "utf-8");

      // Enhanced JSON validation
      let parsedSchema;
      try {
        parsedSchema = JSON.parse(schemaContent);
      } catch (error) {
        throw ErrorFactory.file(
          `Invalid JSON format in schema file: ${fileName}`,
          schemaFile,
          [
            "Check JSON syntax for errors (missing commas, brackets, quotes)",
            "Validate JSON structure using a JSON validator",
            "Ensure file encoding is UTF-8",
            "Try viewing the file in a JSON editor",
            error instanceof Error ? `JSON error: ${error.message}` : "",
          ].filter(Boolean)
        );
      }

      // Enhanced schema structure validation
      this.validateSchemaStructure(parsedSchema, fileName, schemaFile);

      return {
        schemaContent,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.file(
        `Error reading schema file: ${fileName}`,
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
        `Invalid schema structure in ${fileName}`,
        { schema, file: filePath },
        [
          "Schema must be a valid JSON object",
          "Check that the file contains proper schema definition",
          "Ensure the schema follows Lectern format requirements",
          "Review Lectern documentation for schema structure",
        ]
      );
    }

    // Check for required Lectern schema fields
    const requiredFields = ["name", "schemas"];
    const missingFields = requiredFields.filter((field) => !schema[field]);

    if (missingFields.length > 0) {
      throw ErrorFactory.validation(
        `Missing required fields in schema ${fileName}`,
        { missingFields, schema, file: filePath },
        [
          `Add missing fields: ${missingFields.join(", ")}`,
          "Lectern schemas require 'name' and 'schemas' fields",
          "Check schema format against Lectern documentation",
          "Ensure all required properties are present",
        ]
      );
    }

    // Validate schema name
    if (typeof schema.name !== "string" || schema.name.trim() === "") {
      throw ErrorFactory.validation(
        `Invalid schema name in ${fileName}`,
        { name: schema.name, file: filePath },
        [
          "Schema 'name' must be a non-empty string",
          "Use a descriptive name for the schema",
          "Avoid special characters in schema names",
        ]
      );
    }

    // Validate schemas array
    if (!Array.isArray(schema.schemas)) {
      throw ErrorFactory.validation(
        `Invalid 'schemas' field in ${fileName}`,
        { schemas: schema.schemas, file: filePath },
        [
          "'schemas' field must be an array",
          "Include at least one schema definition",
          "Check array syntax and structure",
        ]
      );
    }

    if (schema.schemas.length === 0) {
      throw ErrorFactory.validation(
        `Empty schemas array in ${fileName}`,
        { file: filePath },
        [
          "Include at least one schema definition",
          "Add schema objects to the 'schemas' array",
          "Check if schemas were properly defined",
        ]
      );
    }

    Logger.debug`Schema validation passed for ${fileName}: name="${schema.name}", schemas=${schema.schemas.length}`;
  }

  /**
   * Enhanced upload information logging
   */
  private logUploadInfo(
    fileName: string,
    serviceUrl: string,
    params: LecternSchemaUploadParams
  ): void {
    Logger.info`${chalk.bold.cyan("Lectern Schema Upload Details:")}`;
    Logger.generic(`  File: ${fileName}`);
    Logger.generic(`  Target: ${serviceUrl}/dictionaries`);

    // Parse schema for additional info
    try {
      const schema = JSON.parse(params.schemaContent);
      Logger.generic(`  Schema Name: ${schema.name || "Unnamed"}`);
      Logger.generic(
        `  Schema Count: ${
          Array.isArray(schema.schemas) ? schema.schemas.length : 0
        }`
      );

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
    Logger.success`Schema uploaded successfully to Lectern`;
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    ✓ File: ${fileName}`));
    Logger.generic(
      chalk.gray(`    ✓ Schema ID: ${result.id || "Generated by Lectern"}`)
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
      "Schema is now available for use in Lectern-compatible services"
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

    if (error instanceof Error && error.name === "ConductorError") {
      // Add file context to existing errors
      return {
        success: false,
        errorMessage: error.message,
        errorCode: (error as any).code,
        details: {
          ...(error as any).details,
          schemaFile,
          fileName,
          command: "lecternUpload",
        },
      };
    }

    // Handle service-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    let suggestions = [
      "Check Lectern service connectivity",
      "Verify schema file format and content",
      "Review service logs for additional details",
      "Use --debug flag for detailed error information",
    ];

    // Add specific suggestions based on error content
    if (errorMessage.includes("404")) {
      suggestions.unshift("Check Lectern service URL and endpoints");
      suggestions.unshift("Verify Lectern service is properly configured");
    } else if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("401")
    ) {
      suggestions.unshift("Check authentication token if required");
      suggestions.unshift("Verify API credentials");
    } else if (errorMessage.includes("timeout")) {
      suggestions.unshift("Lectern service may be slow or overloaded");
      suggestions.unshift("Try again or increase timeout settings");
    }

    return {
      success: false,
      errorMessage: `Lectern schema upload failed: ${errorMessage}`,
      errorCode: "CONNECTION_ERROR",
      details: {
        originalError: error,
        schemaFile,
        fileName,
        suggestions,
        command: "lecternUpload",
      },
    };
  }
}
