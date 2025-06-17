// src/services/lectern/LecternService.ts - Keep it simple, let HttpService handle errors
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
   * Upload a schema to Lectern
   */
  async uploadSchema(
    params: LecternSchemaUploadParams
  ): Promise<LecternUploadResponse> {
    try {
      this.validateRequired(params, ["schemaContent"]);

      // Parse and validate JSON
      let schemaData: any;
      try {
        schemaData = JSON.parse(params.schemaContent);
      } catch (error) {
        throw ErrorFactory.parsing(
          "Invalid schema format",
          { originalError: error },
          [
            "Ensure schema file contains valid JSON",
            "Check for syntax errors in the schema",
            "Validate JSON structure",
          ]
        );
      }

      // Basic schema validation
      if (!schemaData.name) {
        throw ErrorFactory.validation(
          'Schema must have a "name" field',
          { schemaData },
          [
            'Add a "name" field to your schema',
            "Ensure the name is a non-empty string",
          ]
        );
      }

      if (!schemaData.schemas || typeof schemaData.schemas !== "object") {
        throw ErrorFactory.validation(
          'Schema must have a "schemas" field',
          { schemaData },
          [
            'Add a "schemas" field containing the schema definition',
            "Ensure schemas field is an object",
          ]
        );
      }

      Logger.info`Uploading schema: ${schemaData.name}`;

      // Upload to Lectern - let HttpService handle HTTP errors
      const response = await this.http.post<LecternUploadResponse>(
        "/dictionaries",
        schemaData
      );

      // Check for errors in response
      if (response.data?.error) {
        throw ErrorFactory.validation(
          "Lectern API error",
          { error: response.data.error },
          [
            `Server error: ${response.data.error}`,
            "Check schema format and requirements",
            "Verify Lectern service configuration",
          ]
        );
      }

      Logger.debug`Schema "${schemaData.name}" uploaded`;

      return response.data;
    } catch (error) {
      this.handleServiceError(error, "schema upload");
    }
  }

  /**
   * Get all dictionaries from Lectern
   */
  async getDictionaries(): Promise<LecternDictionary[]> {
    try {
      const response = await this.http.get<LecternDictionary[]>(
        "/dictionaries"
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      this.handleServiceError(error, "get dictionaries");
    }
  }

  /**
   * Get a specific dictionary by ID
   */
  async getDictionary(dictionaryId: string): Promise<LecternDictionary> {
    try {
      const response = await this.http.get<LecternDictionary>(
        `/dictionaries/${dictionaryId}`
      );
      return response.data;
    } catch (error) {
      this.handleServiceError(error, "get dictionary");
    }
  }

  /**
   * Find a dictionary by name and version
   */
  async findDictionary(
    name: string,
    version: string
  ): Promise<LecternDictionary | null> {
    try {
      const dictionaries = await this.getDictionaries();

      const dictionary = dictionaries.find(
        (dict) => dict.name === name && dict.version === version
      );

      return dictionary || null;
    } catch (error) {
      Logger.warnString(
        `Could not find dictionary ${name} v${version}: ${error}`
      );
      return null;
    }
  }

  /**
   * Validate that a centric entity exists in a dictionary
   */
  async validateCentricEntity(
    dictionaryName: string,
    dictionaryVersion: string,
    centricEntity: string
  ): Promise<DictionaryValidationResult> {
    try {
      Logger.info`Validating entity '${centricEntity}' in dictionary '${dictionaryName}' v${dictionaryVersion}`;

      // Find the dictionary
      const dictionary = await this.findDictionary(
        dictionaryName,
        dictionaryVersion
      );

      if (!dictionary) {
        return {
          exists: false,
          entities: [],
          dictionary: undefined,
        };
      }

      // Get detailed dictionary info with schemas
      const detailedDict = await this.getDictionary(dictionary._id);

      // Extract entity names from schemas
      const entities = detailedDict.schemas?.map((schema) => schema.name) || [];

      const entityExists = entities.includes(centricEntity);

      if (entityExists) {
        Logger.success`Entity '${centricEntity}' found in dictionary`;
      } else {
        Logger.warnString(`Entity '${centricEntity}' not found in dictionary`);
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
   * Get all available entities across all dictionaries
   */
  async getAllEntities(): Promise<string[]> {
    try {
      const dictionaries = await this.getDictionaries();
      const allEntities = new Set<string>();

      for (const dict of dictionaries) {
        const detailedDict = await this.getDictionary(dict._id);
        detailedDict.schemas?.forEach((schema) => {
          if (schema.name) {
            allEntities.add(schema.name);
          }
        });
      }

      return Array.from(allEntities);
    } catch (error) {
      this.handleServiceError(error, "get all entities");
    }
  }

  /**
   * Check if Lectern has any dictionaries
   */
  async hasDictionaries(): Promise<boolean> {
    try {
      const dictionaries = await this.getDictionaries();
      return dictionaries.length > 0;
    } catch (error) {
      Logger.warnString(`Could not check for dictionaries: ${error}`);
      return false;
    }
  }
}
