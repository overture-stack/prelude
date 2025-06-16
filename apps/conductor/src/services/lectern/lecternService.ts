// src/services/lectern/LecternService.ts - Enhanced with ErrorFactory patterns
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import {
  LecternSchemaUploadParams,
  LecternUploadResponse,
  LecternDictionary,
  DictionaryValidationResult,
} from "./types";

export class LecternService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  get serviceName(): string {
    return "Lectern";
  }

  protected get healthEndpoint(): string {
    return "/health";
  }

  /**
   * Upload a schema to Lectern with enhanced error handling
   */
  async uploadSchema(
    params: LecternSchemaUploadParams
  ): Promise<LecternUploadResponse> {
    try {
      this.validateRequired(params, ["schemaContent"], "schema upload");

      // Enhanced JSON parsing and validation
      let schemaData: any;
      try {
        schemaData = JSON.parse(params.schemaContent);
      } catch (error) {
        throw ErrorFactory.validation(
          "Invalid JSON format in Lectern schema",
          { error: error instanceof Error ? error.message : String(error) },
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
      this.validateLecternSchemaStructure(schemaData);

      Logger.debug`Uploading Lectern schema: ${schemaData.name}`;

      // Upload to Lectern with enhanced error handling
      const response = await this.http.post<LecternUploadResponse>(
        "/dictionaries",
        schemaData
      );

      // Enhanced response validation
      if (response.data?.error) {
        throw ErrorFactory.connection(
          `Lectern API error: ${response.data.error}`,
          "Lectern",
          this.config.url,
          [
            "Check schema format and structure",
            "Verify Lectern service is properly configured",
            "Review schema for required fields and valid values",
            "Check Lectern service logs for additional details",
          ]
        );
      }

      Logger.success`Lectern schema uploaded successfully: ${schemaData.name}`;

      return response.data;
    } catch (error) {
      this.handleServiceError(error, "schema upload");
    }
  }

  /**
   * Get all dictionaries from Lectern with enhanced error handling
   */
  async getDictionaries(): Promise<LecternDictionary[]> {
    try {
      Logger.debug`Fetching all dictionaries from Lectern`;

      const response = await this.http.get<LecternDictionary[]>(
        "/dictionaries"
      );

      const dictionaries = Array.isArray(response.data) ? response.data : [];

      Logger.debug`Retrieved ${dictionaries.length} dictionaries from Lectern`;

      return dictionaries;
    } catch (error) {
      this.handleServiceError(error, "get dictionaries");
    }
  }

  /**
   * Get a specific dictionary by ID with enhanced error handling
   */
  async getDictionary(dictionaryId: string): Promise<LecternDictionary> {
    try {
      if (!dictionaryId || typeof dictionaryId !== "string") {
        throw ErrorFactory.args(
          "Dictionary ID required to fetch dictionary",
          undefined,
          [
            "Provide a valid dictionary ID",
            "Dictionary ID should be a non-empty string",
            "Get available dictionary IDs with getDictionaries()",
          ]
        );
      }

      Logger.debug`Fetching dictionary from Lectern: ${dictionaryId}`;

      const response = await this.http.get<LecternDictionary>(
        `/dictionaries/${encodeURIComponent(dictionaryId)}`
      );

      Logger.debug`Successfully retrieved dictionary: ${
        response.data.name || dictionaryId
      }`;

      return response.data;
    } catch (error) {
      // Enhanced error handling for 404 cases
      if (error instanceof Error && error.message.includes("404")) {
        throw ErrorFactory.validation(
          `Dictionary not found in Lectern: ${dictionaryId}`,
          { dictionaryId },
          [
            "Check that the dictionary ID is correct",
            "Verify the dictionary exists in Lectern",
            "Use getDictionaries() to see available dictionaries",
            "Ensure the dictionary was successfully uploaded",
          ]
        );
      }

      this.handleServiceError(error, "get dictionary");
    }
  }

  /**
   * Find a dictionary by name and version with enhanced error handling
   */
  async findDictionary(
    name: string,
    version: string
  ): Promise<LecternDictionary | null> {
    try {
      if (!name || !version) {
        throw ErrorFactory.args(
          "Dictionary name and version required for search",
          undefined,
          [
            "Provide both dictionary name and version",
            "Name and version must be non-empty strings",
            "Example: findDictionary('clinical-data', '1.0')",
          ]
        );
      }

      Logger.debug`Searching for dictionary: ${name} v${version}`;

      const dictionaries = await this.getDictionaries();

      const dictionary = dictionaries.find(
        (dict) => dict.name === name && dict.version === version
      );

      if (dictionary) {
        Logger.debug`Found dictionary: ${name} v${version} (ID: ${dictionary._id})`;
      } else {
        Logger.debug`Dictionary not found: ${name} v${version}`;
      }

      return dictionary || null;
    } catch (error) {
      Logger.warn`Could not search for dictionary ${name} v${version}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      return null;
    }
  }

  /**
   * Validate that a centric entity exists in a dictionary with enhanced feedback
   */
  async validateCentricEntity(
    dictionaryName: string,
    dictionaryVersion: string,
    centricEntity: string
  ): Promise<DictionaryValidationResult> {
    try {
      if (!dictionaryName || !dictionaryVersion || !centricEntity) {
        throw ErrorFactory.args(
          "Dictionary name, version, and centric entity required for validation",
          undefined,
          [
            "Provide all required parameters: name, version, entity",
            "All parameters must be non-empty strings",
            "Example: validateCentricEntity('clinical-data', '1.0', 'donor')",
          ]
        );
      }

      Logger.info`Validating centric entity '${centricEntity}' in dictionary '${dictionaryName}' v${dictionaryVersion}`;

      // Find the dictionary
      const dictionary = await this.findDictionary(
        dictionaryName,
        dictionaryVersion
      );

      if (!dictionary) {
        Logger.warn`Dictionary not found: ${dictionaryName} v${dictionaryVersion}`;
        return {
          exists: false,
          entities: [],
          dictionary: undefined,
        };
      }

      // Get detailed dictionary info with schemas
      const detailedDict = await this.getDictionary(dictionary._id);

      // Extract entity names from schemas with enhanced validation
      const entities = this.extractEntitiesFromSchemas(detailedDict.schemas);

      const entityExists = entities.includes(centricEntity);

      if (entityExists) {
        Logger.success`Centric entity validated: ${centricEntity}`;
      } else {
        Logger.warn`Centric entity not found in dictionary: ${centricEntity}`;
        Logger.info`Available entities: ${entities.join(", ")}`;
      }

      return {
        exists: entityExists,
        entities,
        dictionary: detailedDict,
      };
    } catch (error) {
      this.handleServiceError(error, "centric entity validation");
    }
  }

  /**
   * Get all available entities across all dictionaries with enhanced error handling
   */
  async getAllEntities(): Promise<string[]> {
    try {
      Logger.debug`Fetching all entities from all Lectern dictionaries`;

      const dictionaries = await this.getDictionaries();
      const allEntities = new Set<string>();

      for (const dict of dictionaries) {
        try {
          const detailedDict = await this.getDictionary(dict._id);
          const entities = this.extractEntitiesFromSchemas(
            detailedDict.schemas
          );
          entities.forEach((entity) => allEntities.add(entity));
        } catch (error) {
          Logger.warn`Could not process dictionary ${dict.name || dict._id}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          continue;
        }
      }

      const entitiesArray = Array.from(allEntities);
      Logger.debug`Found ${entitiesArray.length} unique entities across all dictionaries`;

      return entitiesArray;
    } catch (error) {
      this.handleServiceError(error, "get all entities");
    }
  }

  /**
   * Check if Lectern has any dictionaries with enhanced feedback
   */
  async hasDictionaries(): Promise<boolean> {
    try {
      const dictionaries = await this.getDictionaries();
      const hasDicts = dictionaries.length > 0;

      Logger.debug`Lectern has ${dictionaries.length} dictionaries`;

      return hasDicts;
    } catch (error) {
      Logger.warn`Could not check for dictionaries: ${
        error instanceof Error ? error.message : String(error)
      }`;
      return false;
    }
  }

  /**
   * Enhanced Lectern schema structure validation
   */
  private validateLecternSchemaStructure(schema: any): void {
    if (!schema || typeof schema !== "object") {
      throw ErrorFactory.validation(
        "Invalid Lectern schema structure",
        { schema: typeof schema },
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
        "Missing required fields in Lectern schema",
        {
          missingFields,
          providedFields: Object.keys(schema),
          schema: schema,
        },
        [
          `Add missing fields: ${missingFields.join(", ")}`,
          "Lectern schemas require 'name' and 'schemas' fields",
          "The 'name' field should be a descriptive string",
          "The 'schemas' field should be an array of schema definitions",
          "Check Lectern documentation for required schema format",
        ]
      );
    }

    // Enhanced name validation
    if (typeof schema.name !== "string" || schema.name.trim() === "") {
      throw ErrorFactory.validation(
        "Invalid schema name in Lectern schema",
        { name: schema.name, type: typeof schema.name },
        [
          "Schema 'name' must be a non-empty string",
          "Use a descriptive name for the schema",
          "Example: 'clinical-data-dictionary' or 'genomic-metadata'",
          "Avoid special characters in schema names",
        ]
      );
    }

    // Enhanced schemas array validation
    if (!Array.isArray(schema.schemas)) {
      throw ErrorFactory.validation(
        "Invalid 'schemas' field in Lectern schema",
        { schemas: typeof schema.schemas, provided: schema.schemas },
        [
          "'schemas' field must be an array",
          "Include at least one schema definition",
          "Each schema should define entity structure",
          "Check array syntax and structure",
        ]
      );
    }

    if (schema.schemas.length === 0) {
      throw ErrorFactory.validation(
        "Empty schemas array in Lectern schema",
        { schemaName: schema.name },
        [
          "Include at least one schema definition",
          "Add schema objects to the 'schemas' array",
          "Each schema should define an entity type",
          "Check if schemas were properly defined",
        ]
      );
    }

    // Validate individual schema entries
    schema.schemas.forEach((schemaEntry: any, index: number) => {
      if (!schemaEntry.name) {
        throw ErrorFactory.validation(
          `Schema entry ${index + 1} missing 'name' field`,
          { index, schema: schemaEntry },
          [
            "Each schema in the array must have a 'name' field",
            "Names identify entity types (e.g., 'donor', 'specimen')",
            "Ensure all schema entries are properly formatted",
            "Check schema entry structure and required fields",
          ]
        );
      }
    });

    Logger.debug`Lectern schema structure validated: ${schema.name} with ${schema.schemas.length} schema(s)`;
  }

  /**
   * Extract entities from schemas with error handling
   */
  private extractEntitiesFromSchemas(schemas?: any[]): string[] {
    if (!schemas || !Array.isArray(schemas)) {
      Logger.debug`No schemas provided or invalid schemas array`;
      return [];
    }

    const entities: string[] = [];

    schemas.forEach((schema, index) => {
      if (schema?.name && typeof schema.name === "string") {
        entities.push(schema.name);
      } else {
        Logger.debug`Schema ${index} missing or invalid name field`;
      }
    });

    return entities;
  }

  /**
   * Enhanced service error handling with Lectern-specific context
   */
  protected handleServiceError(error: unknown, operation: string): never {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Enhanced error handling with Lectern-specific guidance
    const errorMessage = error instanceof Error ? error.message : String(error);

    let suggestions = [
      `Check that Lectern service is running and accessible`,
      `Verify service URL: ${this.config.url}`,
      "Check network connectivity and firewall settings",
      "Confirm Lectern service configuration",
      "Review Lectern service logs for additional details",
    ];

    // Add operation-specific suggestions
    if (operation === "schema upload") {
      suggestions = [
        "Verify schema format follows Lectern requirements",
        "Ensure schema has required 'name' and 'schemas' fields",
        "Check for valid JSON structure and syntax",
        ...suggestions,
      ];
    } else if (operation === "get dictionaries") {
      suggestions = [
        "Lectern service may not have any dictionaries uploaded",
        "Verify Lectern API endpoint is accessible",
        ...suggestions,
      ];
    } else if (operation === "centric entity validation") {
      suggestions = [
        "Check that dictionary exists in Lectern",
        "Verify entity name spelling and case",
        "Ensure dictionary has properly defined schemas",
        ...suggestions,
      ];
    }

    throw ErrorFactory.connection(
      `Lectern ${operation} failed: ${errorMessage}`,
      "Lectern",
      this.config.url,
      suggestions
    );
  }
}
