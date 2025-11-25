"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LyricRegistrationService = void 0;
// src/services/lyric/LyricRegistrationService.ts
const baseService_1 = require("../base/baseService");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
class LyricRegistrationService extends baseService_1.BaseService {
    constructor(config) {
        super(config);
    }
    get serviceName() {
        return "Lyric";
    }
    get healthEndpoint() {
        return "/health";
    }
    /**
     * Register a dictionary with the Lyric service
     */
    async registerDictionary(params) {
        var _a;
        try {
            // Validate required parameters
            this.validateRequired(params, [
                "categoryName",
                "dictionaryName",
                "dictionaryVersion",
                "defaultCentricEntity",
            ]);
            logger_1.Logger.debug `Registering dictionary ${params.dictionaryName} version ${params.dictionaryVersion}`;
            // Prepare form data
            const formData = new URLSearchParams();
            formData.append("categoryName", params.categoryName);
            formData.append("dictionaryName", params.dictionaryName);
            formData.append("dictionaryVersion", params.dictionaryVersion);
            formData.append("defaultCentricEntity", params.defaultCentricEntity);
            const response = await this.http.post("/dictionary/register", formData.toString(), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
            // Check for API-level errors in response
            if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.error) {
                throw errors_1.ErrorFactory.validation("Dictionary registration failed", {
                    error: response.data.error,
                    params,
                    response: response.data,
                }, [
                    `Server error: ${response.data.error}`,
                    "Check dictionary parameters and format",
                    "Verify the category exists in Lyric",
                ]);
            }
            logger_1.Logger.debug `Dictionary registered successfully`;
            return {
                success: true,
                message: "Dictionary registered successfully",
                ...response.data,
            };
        }
        catch (error) {
            this.handleServiceError(error, "dictionary registration");
        }
    }
    /**
     * Check if a dictionary is already registered
     */
    async checkDictionaryExists(params) {
        try {
            // This would need to be implemented based on Lyric's API
            // For now, returning false as a placeholder
            logger_1.Logger.debug `Checking if dictionary exists: ${params.dictionaryName} v${params.dictionaryVersion}`;
            return false;
        }
        catch (error) {
            logger_1.Logger.warnString(`Could not check dictionary existence: ${error}`);
            return false;
        }
    }
    /**
     * Get list of registered dictionaries
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
     * Get categories available in Lyric
     */
    async getCategories() {
        try {
            const response = await this.http.get("/categories");
            return Array.isArray(response.data) ? response.data : [];
        }
        catch (error) {
            this.handleServiceError(error, "get categories");
        }
    }
}
exports.LyricRegistrationService = LyricRegistrationService;
