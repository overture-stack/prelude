"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LecternService = void 0;
// src/services/lectern/LecternService.ts - Keep it simple, let HttpService handle errors
const baseService_1 = require("../base/baseService");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
class LecternService extends baseService_1.BaseService {
    constructor(config) {
        super(config);
    }
    get serviceName() {
        return "Lectern";
    }
    get healthEndpoint() {
        return "/health";
    }
    /**
     * Upload a schema to Lectern
     */
    async uploadSchema(params) {
        var _a;
        try {
            this.validateRequired(params, ["schemaContent"]);
            // Parse and validate JSON
            let schemaData;
            try {
                schemaData = JSON.parse(params.schemaContent);
            }
            catch (error) {
                throw errors_1.ErrorFactory.parsing("Invalid schema format", { originalError: error }, [
                    "Ensure schema file contains valid JSON",
                    "Check for syntax errors in the schema",
                    "Validate JSON structure",
                ]);
            }
            // Basic schema validation
            if (!schemaData.name) {
                throw errors_1.ErrorFactory.validation('Schema must have a "name" field', { schemaData }, [
                    'Add a "name" field to your schema',
                    "Ensure the name is a non-empty string",
                ]);
            }
            if (!schemaData.schemas || typeof schemaData.schemas !== "object") {
                throw errors_1.ErrorFactory.validation('Schema must have a "schemas" field', { schemaData }, [
                    'Add a "schemas" field containing the schema definition',
                    "Ensure schemas field is an object",
                ]);
            }
            logger_1.Logger.generic("");
            logger_1.Logger.info `Uploading schema: ${schemaData.name}`;
            // Upload to Lectern - let HttpService handle HTTP errors
            const response = await this.http.post("/dictionaries", schemaData);
            // Check for errors in response
            if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.error) {
                throw errors_1.ErrorFactory.validation("Lectern API error", { error: response.data.error }, [
                    `Server error: ${response.data.error}`,
                    "Check schema format and requirements",
                    "Verify Lectern service configuration",
                ]);
            }
            logger_1.Logger.debug `Schema "${schemaData.name}" uploaded`;
            return response.data;
        }
        catch (error) {
            this.handleServiceError(error, "schema upload");
        }
    }
    /**
     * Get all dictionaries from Lectern
     */
    async getDictionaries() {
        try {
            const response = await this.http.get("/dictionaries");
            return Array.isArray(response.data) ? response.data : [];
        }
        catch (error) {
            this.handleServiceError(error, "get dictionaries");
        }
    }
    /**
     * Get a specific dictionary by ID
     */
    async getDictionary(dictionaryId) {
        try {
            const response = await this.http.get(`/dictionaries/${dictionaryId}`);
            return response.data;
        }
        catch (error) {
            this.handleServiceError(error, "get dictionary");
        }
    }
    /**
     * Find a dictionary by name and version
     */
    async findDictionary(name, version) {
        try {
            const dictionaries = await this.getDictionaries();
            const dictionary = dictionaries.find((dict) => dict.name === name && dict.version === version);
            return dictionary || null;
        }
        catch (error) {
            logger_1.Logger.warnString(`Could not find dictionary ${name} v${version}: ${error}`);
            return null;
        }
    }
    /**
     * Validate that a centric entity exists in a dictionary
     */
    async validateCentricEntity(dictionaryName, dictionaryVersion, centricEntity) {
        var _a;
        try {
            logger_1.Logger.info `Registering entity '${centricEntity}' in dictionary '${dictionaryName}' v${dictionaryVersion}`;
            // Find the dictionary
            const dictionary = await this.findDictionary(dictionaryName, dictionaryVersion);
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
            const entities = ((_a = detailedDict.schemas) === null || _a === void 0 ? void 0 : _a.map((schema) => schema.name)) || [];
            const entityExists = entities.includes(centricEntity);
            if (entityExists) {
                logger_1.Logger.debug `Entity '${centricEntity}' found in dictionary`;
            }
            else {
                logger_1.Logger.debug `Entity '${centricEntity}' not found in dictionary`;
            }
            return {
                exists: entityExists,
                entities,
                dictionary: detailedDict,
            };
        }
        catch (error) {
            this.handleServiceError(error, "centric entity validation");
        }
    }
    /**
     * Get all available entities across all dictionaries
     */
    async getAllEntities() {
        var _a;
        try {
            const dictionaries = await this.getDictionaries();
            const allEntities = new Set();
            for (const dict of dictionaries) {
                const detailedDict = await this.getDictionary(dict._id);
                (_a = detailedDict.schemas) === null || _a === void 0 ? void 0 : _a.forEach((schema) => {
                    if (schema.name) {
                        allEntities.add(schema.name);
                    }
                });
            }
            return Array.from(allEntities);
        }
        catch (error) {
            this.handleServiceError(error, "get all entities");
        }
    }
    /**
     * Check if Lectern has any dictionaries
     */
    async hasDictionaries() {
        try {
            const dictionaries = await this.getDictionaries();
            return dictionaries.length > 0;
        }
        catch (error) {
            logger_1.Logger.warnString(`Could not check for dictionaries: ${error}`);
            return false;
        }
    }
}
exports.LecternService = LecternService;
