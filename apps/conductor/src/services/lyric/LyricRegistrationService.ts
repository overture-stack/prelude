// src/services/lyric/LyricRegistrationService.ts - Enhanced with ErrorFactory patterns
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import {
  DictionaryRegistrationParams,
  LyricRegistrationResponse,
} from "./types";

export class LyricRegistrationService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  get serviceName(): string {
    return "Lyric";
  }

  protected get healthEndpoint(): string {
    return "/health";
  }

  /**
   * Register a dictionary with the Lyric service with enhanced error handling
   */
  async registerDictionary(
    params: DictionaryRegistrationParams
  ): Promise<LyricRegistrationResponse> {
    try {
      // Enhanced parameter validation
      this.validateRegistrationParams(params);

      Logger.info`Registering Lyric dictionary: ${params.dictionaryName} v${params.dictionaryVersion}`;
      Logger.debug`Registration details - Category: ${params.categoryName}, Entity: ${params.defaultCentricEntity}`;

      // Enhanced form data preparation
      const formData = this.prepareRegistrationFormData(params);

      // Make registration request with enhanced error handling
      const response = await this.http.post<any>(
        "/dictionary/register",
        formData.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      // Enhanced response validation
      this.validateRegistrationResponse(response.data, params);

      Logger.success`Dictionary registered successfully with Lyric`;

      return {
        success: true,
        message: "Dictionary registered successfully",
        ...response.data,
      };
    } catch (error) {
      this.handleServiceError(error, "dictionary registration");
    }
  }

  /**
   * Check if a dictionary is already registered with enhanced validation
   */
  async checkDictionaryExists(params: {
    categoryName: string;
    dictionaryName: string;
    dictionaryVersion: string;
  }): Promise<boolean> {
    try {
      if (
        !params.categoryName ||
        !params.dictionaryName ||
        !params.dictionaryVersion
      ) {
        throw ErrorFactory.args(
          "Category name, dictionary name, and version required to check existence",
          undefined,
          [
            "Provide all required parameters for dictionary lookup",
            "All parameters must be non-empty strings",
            "Example: checkDictionaryExists({categoryName: 'clinical', dictionaryName: 'data-dict', dictionaryVersion: '1.0'})",
          ]
        );
      }

      Logger.debug`Checking if dictionary exists: ${params.dictionaryName} v${params.dictionaryVersion} in category ${params.categoryName}`;

      // Implementation would depend on Lyric's API
      // For now, returning false as a placeholder with enhanced logging
      Logger.debug`Dictionary existence check not yet implemented - assuming dictionary does not exist`;

      return false;
    } catch (error) {
      Logger.warn`Could not check dictionary existence: ${
        error instanceof Error ? error.message : String(error)
      }`;
      return false;
    }
  }

  /**
   * Get list of registered dictionaries with enhanced error handling
   */
  async getDictionaries(): Promise<any[]> {
    try {
      Logger.debug`Fetching registered dictionaries from Lyric`;

      const response = await this.http.get<any>("/dictionaries");

      const dictionaries = Array.isArray(response.data) ? response.data : [];

      Logger.debug`Retrieved ${dictionaries.length} registered dictionaries from Lyric`;

      return dictionaries;
    } catch (error) {
      this.handleServiceError(error, "get dictionaries");
    }
  }

  /**
   * Get categories available in Lyric with enhanced error handling
   */
  async getCategories(): Promise<any[]> {
    try {
      Logger.debug`Fetching available categories from Lyric`;

      const response = await this.http.get<any>("/categories");

      const categories = Array.isArray(response.data) ? response.data : [];

      Logger.debug`Retrieved ${categories.length} available categories from Lyric`;

      return categories;
    } catch (error) {
      this.handleServiceError(error, "get categories");
    }
  }

  /**
   * Enhanced validation of registration parameters
   */
  private validateRegistrationParams(
    params: DictionaryRegistrationParams
  ): void {
    // Validate required fields with enhanced error messages
    const requiredFields = [
      "categoryName",
      "dictionaryName",
      "dictionaryVersion",
      "defaultCentricEntity",
    ];

    this.validateRequired(params, requiredFields, "dictionary registration");

    // Enhanced individual field validation
    this.validateCategoryName(params.categoryName);
    this.validateDictionaryName(params.dictionaryName);
    this.validateDictionaryVersion(params.dictionaryVersion);
    this.validateCentricEntity(params.defaultCentricEntity);

    Logger.debug`Registration parameters validated successfully`;
  }

  /**
   * Enhanced category name validation
   */
  private validateCategoryName(categoryName: string): void {
    if (typeof categoryName !== "string" || categoryName.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid category name for Lyric registration",
        { categoryName, type: typeof categoryName },
        [
          "Category name must be a non-empty string",
          "Use descriptive names that group related dictionaries",
          "Examples: 'clinical', 'genomics', 'metadata'",
          "Avoid special characters and spaces",
        ]
      );
    }

    // Check for valid category name format
    if (!/^[a-zA-Z0-9_-]+$/.test(categoryName)) {
      throw ErrorFactory.validation(
        `Category name contains invalid characters: ${categoryName}`,
        { categoryName },
        [
          "Use only letters, numbers, hyphens, and underscores",
          "Avoid spaces and special characters",
          "Example: 'clinical-data' or 'genomic_metadata'",
          "Keep names simple and descriptive",
        ]
      );
    }

    Logger.debug`Category name validated: ${categoryName}`;
  }

  /**
   * Enhanced dictionary name validation
   */
  private validateDictionaryName(dictionaryName: string): void {
    if (typeof dictionaryName !== "string" || dictionaryName.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid dictionary name for Lyric registration",
        { dictionaryName, type: typeof dictionaryName },
        [
          "Dictionary name must be a non-empty string",
          "Use descriptive names like 'clinical-data' or 'genomic-metadata'",
          "Names should match your Lectern schema name",
          "Avoid special characters and spaces",
        ]
      );
    }

    // Validate name format
    if (!/^[a-zA-Z0-9_-]+$/.test(dictionaryName)) {
      throw ErrorFactory.validation(
        `Dictionary name contains invalid characters: ${dictionaryName}`,
        { dictionaryName },
        [
          "Use only letters, numbers, hyphens, and underscores",
          "Avoid spaces and special characters",
          "Example: 'clinical-data-v1' or 'genomic_metadata'",
          "Keep names concise but descriptive",
        ]
      );
    }

    Logger.debug`Dictionary name validated: ${dictionaryName}`;
  }

  /**
   * Enhanced dictionary version validation
   */
  private validateDictionaryVersion(version: string): void {
    if (typeof version !== "string" || version.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid dictionary version for Lyric registration",
        { version, type: typeof version },
        [
          "Version must be a non-empty string",
          "Use semantic versioning format: major.minor or major.minor.patch",
          "Examples: '1.0', '2.1.3', '1.0.0-beta'",
          "Increment versions when schema changes",
        ]
      );
    }

    // Basic version format validation (warn but don't fail)
    if (!/^\d+(\.\d+)*(-[a-zA-Z0-9]+)?$/.test(version)) {
      Logger.warn`Version format '${version}' doesn't follow semantic versioning`;
      Logger.tipString("Consider using semantic versioning: major.minor.patch");
    }

    Logger.debug`Dictionary version validated: ${version}`;
  }

  /**
   * Enhanced centric entity validation
   */
  private validateCentricEntity(centricEntity: string): void {
    if (typeof centricEntity !== "string" || centricEntity.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid centric entity for Lyric registration",
        { centricEntity, type: typeof centricEntity },
        [
          "Centric entity must be a non-empty string",
          "Use entity names from your dictionary schema",
          "Examples: 'donor', 'specimen', 'sample', 'file'",
          "Entity must be defined in your Lectern schema",
        ]
      );
    }

    // Basic entity name validation
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(centricEntity)) {
      throw ErrorFactory.validation(
        `Invalid centric entity format: ${centricEntity}`,
        { centricEntity },
        [
          "Entity names must start with a letter",
          "Use only letters, numbers, and underscores",
          "Follow your schema's entity naming conventions",
          "Examples: 'donor', 'specimen_data', 'sample_metadata'",
        ]
      );
    }

    Logger.debug`Centric entity validated: ${centricEntity}`;
  }

  /**
   * Prepare registration form data with enhanced validation
   */
  private prepareRegistrationFormData(
    params: DictionaryRegistrationParams
  ): URLSearchParams {
    const formData = new URLSearchParams();

    // Add validated parameters
    formData.append("categoryName", params.categoryName.trim());
    formData.append("dictionaryName", params.dictionaryName.trim());
    formData.append("dictionaryVersion", params.dictionaryVersion.trim());
    formData.append("defaultCentricEntity", params.defaultCentricEntity.trim());

    Logger.debug`Form data prepared for registration`;

    return formData;
  }

  /**
   * Enhanced validation of registration response
   */
  private validateRegistrationResponse(
    responseData: any,
    params: DictionaryRegistrationParams
  ): void {
    // Check for API-level errors in response
    if (responseData?.error) {
      throw ErrorFactory.connection(
        `Lyric registration API error: ${responseData.error}`,
        "Lyric",
        this.config.url,
        [
          "Check registration parameters format and values",
          "Verify dictionary doesn't already exist",
          "Ensure category is valid and accessible",
          "Review Lyric service configuration",
          "Check Lyric service logs for additional details",
        ]
      );
    }

    // Check for common response patterns that indicate issues
    if (responseData?.success === false) {
      const message = responseData.message || "Registration failed";
      throw ErrorFactory.validation(
        `Dictionary registration rejected: ${message}`,
        { responseData, params },
        [
          "Check if dictionary already exists in Lyric",
          "Verify category permissions and access",
          "Ensure centric entity is valid for the dictionary",
          "Review registration parameters for correctness",
        ]
      );
    }

    Logger.debug`Registration response validated successfully`;
  }

  /**
   * Enhanced service error handling with Lyric-specific context
   */
  protected handleServiceError(error: unknown, operation: string): never {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Enhanced error handling with Lyric-specific guidance
    const errorMessage = error instanceof Error ? error.message : String(error);

    let suggestions = [
      `Check that Lyric service is running and accessible`,
      `Verify service URL: ${this.config.url}`,
      "Check network connectivity and firewall settings",
      "Confirm Lyric service configuration",
      "Review Lyric service logs for additional details",
    ];

    // Add operation-specific suggestions
    if (operation === "dictionary registration") {
      suggestions = [
        "Verify all registration parameters are correct",
        "Check if dictionary already exists in Lyric",
        "Ensure category exists and is accessible",
        "Verify centric entity matches dictionary schema",
        "Confirm proper permissions for dictionary registration",
        ...suggestions,
      ];
    } else if (operation === "get dictionaries") {
      suggestions = [
        "Lyric service may not have any dictionaries registered",
        "Verify Lyric API endpoint is accessible",
        "Check if authentication is required",
        ...suggestions,
      ];
    } else if (operation === "get categories") {
      suggestions = [
        "Lyric service may not have any categories configured",
        "Verify Lyric categories endpoint is accessible",
        "Check if categories need to be created first",
        ...suggestions,
      ];
    }

    // Handle specific HTTP status codes
    if (errorMessage.includes("409") || errorMessage.includes("conflict")) {
      suggestions.unshift("Dictionary may already be registered in Lyric");
      suggestions.unshift(
        "Check existing dictionaries or use a different name/version"
      );
    } else if (
      errorMessage.includes("400") ||
      errorMessage.includes("validation")
    ) {
      suggestions.unshift("Registration parameters validation failed");
      suggestions.unshift("Check parameter format and required fields");
    } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
      suggestions.unshift("Authentication or authorization failed");
      suggestions.unshift("Check if API credentials are required");
    }

    throw ErrorFactory.connection(
      `Lyric ${operation} failed: ${errorMessage}`,
      "Lyric",
      this.config.url,
      suggestions
    );
  }
}
