"use strict";
// src/commands/lyricRegistrationCommand.ts - FIXED: Available dictionaries/entities display
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LyricRegistrationCommand = void 0;
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const chalk_1 = __importDefault(require("chalk"));
const errors_1 = require("../utils/errors");
const LyricRegistrationService_1 = require("../services/lyric/LyricRegistrationService");
const lectern_1 = require("../services/lectern");
const serviceConfigManager_1 = require("../config/serviceConfigManager");
/**
 * Command for registering a dictionary with the Lyric service
 * Lectern URL is optional with default value
 */
class LyricRegistrationCommand extends baseCommand_1.Command {
    constructor() {
        super("Lyric Dictionary Registration");
    }
    /**
     * Executes the Lyric dictionary registration process
     */
    async execute(cliOutput) {
        var _a, _b, _c, _d;
        const { options } = cliOutput;
        try {
            // Extract configuration
            const registrationParams = this.extractRegistrationParams(options);
            const lyricServiceConfig = this.extractServiceConfig(options);
            const lecternServiceConfig = this.extractLecternServiceConfig(options);
            // Create service instances
            const lyricService = new LyricRegistrationService_1.LyricRegistrationService(lyricServiceConfig);
            const lecternService = new lectern_1.LecternService(lecternServiceConfig);
            // Check Lyric service health first
            const healthResult = await lyricService.checkHealth();
            if (!healthResult.healthy) {
                throw errors_1.ErrorFactory.connection("Lyric service is not healthy", {
                    healthResult,
                    serviceUrl: lyricServiceConfig.url,
                }, [
                    "Check that Lyric service is running",
                    `Verify the service URL: ${lyricServiceConfig.url}`,
                    "Check network connectivity",
                    "Review service logs for errors",
                ]);
            }
            // Check Lectern service health
            const lecternHealthResult = await lecternService.checkHealth();
            if (!lecternHealthResult.healthy) {
                throw errors_1.ErrorFactory.connection("Lectern service is not healthy", {
                    healthResult: lecternHealthResult,
                    serviceUrl: lecternServiceConfig.url,
                }, [
                    "Check that Lectern service is running",
                    `Verify the service URL: ${lecternServiceConfig.url}`,
                    "Lectern is required to validate dictionary before registration",
                    "Check network connectivity",
                ]);
            }
            // Validate dictionary exists in Lectern and entity is valid
            logger_1.Logger.debug `Validating dictionary '${registrationParams.dictionaryName}' v${registrationParams.dictionaryVersion} in Lectern`;
            try {
                await this.validateDictionaryAndEntity(registrationParams, lecternService);
            }
            catch (validationError) {
                // FIXED: Better error handling with available options display
                if (validationError instanceof Error &&
                    validationError.name === "ConductorError") {
                    const conductorError = validationError;
                    // Log the main error message
                    logger_1.Logger.errorString(conductorError.message);
                    // Display available dictionaries if they exist
                    if (((_b = (_a = conductorError.details) === null || _a === void 0 ? void 0 : _a.availableDictionaries) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                        logger_1.Logger.suggestion("Available dictionaries in Lectern");
                        conductorError.details.availableDictionaries.forEach((dict) => {
                            logger_1.Logger.generic(`   ▸ ${dict}`);
                        });
                    }
                    // Display available entities if they exist
                    if (((_d = (_c = conductorError.details) === null || _c === void 0 ? void 0 : _c.availableEntities) === null || _d === void 0 ? void 0 : _d.length) > 0) {
                        logger_1.Logger.suggestion("Available entities in this dictionary");
                        conductorError.details.availableEntities.forEach((entity) => {
                            logger_1.Logger.generic(`   ▸ ${entity}`);
                        });
                    }
                    // Display filtered suggestions (exclude the lists we already showed)
                    if (conductorError.suggestions &&
                        conductorError.suggestions.length > 0) {
                        const filteredSuggestions = conductorError.suggestions.filter((suggestion) => !suggestion.includes("Available dictionaries:") &&
                            !suggestion.includes("Available entities:") &&
                            suggestion.trim() !== "" &&
                            !suggestion.startsWith("    "));
                        if (filteredSuggestions.length > 0) {
                            logger_1.Logger.suggestion("Suggestions");
                            filteredSuggestions.forEach((suggestion) => {
                                logger_1.Logger.tipString(suggestion);
                            });
                        }
                    }
                    // Return error result instead of re-throwing
                    return {
                        success: false,
                        errorMessage: conductorError.message,
                        errorCode: conductorError.code,
                        details: conductorError.details,
                    };
                }
                // Re-throw unexpected errors
                throw validationError;
            }
            // Register dictionary
            this.logRegistrationInfo(registrationParams, lyricServiceConfig.url);
            const result = await lyricService.registerDictionary(registrationParams);
            // Log success
            this.logSuccess(registrationParams);
            return {
                success: true,
                details: result,
            };
        }
        catch (error) {
            return this.handleExecutionError(error);
        }
    }
    /**
     * Validates command line arguments
     * FIXED: Lectern URL is optional - use default if not provided
     */
    async validate(cliOutput) {
        const { options } = cliOutput;
        // Validate required parameters exist (lecternUrl is NOT required - has default)
        const requiredParams = [
            { key: "lyricUrl", name: "Lyric URL", envVar: "LYRIC_URL" },
            { key: "dictName", name: "Dictionary name", envVar: "DICTIONARY_NAME" },
            { key: "categoryName", name: "Category name", envVar: "CATEGORY_NAME" },
            {
                key: "dictionaryVersion",
                name: "Dictionary version",
                envVar: "DICTIONARY_VERSION",
            },
            {
                key: "defaultCentricEntity",
                name: "Default centric entity",
                envVar: "DEFAULT_CENTRIC_ENTITY",
            },
        ];
        for (const param of requiredParams) {
            const value = options[param.key] || process.env[param.envVar];
            if (!value) {
                throw errors_1.ErrorFactory.args(`${param.name} is required`, [
                    `Use --${param.key.replace(/([A-Z])/g, "-$1").toLowerCase()} option`,
                    `Set ${param.envVar} environment variable`,
                    "Example: --dict-name 'My Dictionary' --category-name 'research'",
                ]);
            }
        }
        // OPTIONAL: Check Lectern URL is valid if provided (don't require it)
        const lecternUrl = this.getLecternUrl(options);
        if (lecternUrl) {
            try {
                new URL(lecternUrl);
            }
            catch (error) {
                throw errors_1.ErrorFactory.validation("Invalid Lectern URL format", { url: lecternUrl }, [
                    "Ensure URL includes protocol (http:// or https://)",
                    "Example: --lectern-url http://localhost:3031",
                    "Check URL format and spelling",
                ]);
            }
        }
    }
    /**
     * Get Lectern URL with default value
     */
    getLecternUrl(options) {
        return (options.lecternUrl || process.env.LECTERN_URL || "http://localhost:3031" // Default value
        );
    }
    /**
     * Extract registration parameters from options
     */
    extractRegistrationParams(options) {
        return {
            categoryName: options.categoryName || process.env.CATEGORY_NAME,
            dictionaryName: options.dictName || process.env.DICTIONARY_NAME,
            dictionaryVersion: options.dictionaryVersion || process.env.DICTIONARY_VERSION,
            defaultCentricEntity: options.defaultCentricEntity || process.env.DEFAULT_CENTRIC_ENTITY,
        };
    }
    /**
     * Extract service configuration from options
     */
    extractServiceConfig(options) {
        return {
            url: options.lyricUrl || process.env.LYRIC_URL,
            timeout: 10000,
            retries: 1,
            authToken: options.authToken || process.env.AUTH_TOKEN,
        };
    }
    /**
     * FIXED: Extract Lectern service configuration with default URL
     */
    extractLecternServiceConfig(options) {
        return serviceConfigManager_1.ServiceConfigManager.createLecternConfig({
            url: this.getLecternUrl(options),
            authToken: options.authToken || process.env.AUTH_TOKEN,
        });
    }
    /**
     * FIXED: Mandatory validation that dictionary exists in Lectern and entity is valid
     */
    async validateDictionaryAndEntity(params, lecternService) {
        try {
            // Step 1: Check if dictionary exists in Lectern
            const dictionary = await lecternService.findDictionary(params.dictionaryName, params.dictionaryVersion);
            if (!dictionary) {
                // Get available dictionaries for helpful suggestions
                let availableDictionaries = [];
                let dictNames = [];
                try {
                    availableDictionaries = await lecternService.getDictionaries();
                    dictNames = availableDictionaries.map((d) => `${d.name} (v${d.version})`);
                }
                catch (getDictError) {
                    logger_1.Logger.debugString(`Could not fetch available dictionaries: ${getDictError}`);
                    // Continue with validation error even if we can't get the list
                }
                // Create error with available dictionaries in details
                throw errors_1.ErrorFactory.validation(`Dictionary '${params.dictionaryName}' version '${params.dictionaryVersion}' not found in Lectern`, {
                    requestedDictionary: params.dictionaryName,
                    requestedVersion: params.dictionaryVersion,
                    availableDictionaries: dictNames, // This will be displayed
                }, [
                    "Check dictionary name spelling and version",
                    "Upload the dictionary to Lectern first using: conductor lecternUpload",
                    "Verify Lectern service contains the required dictionary",
                    dictNames.length === 0 ? "No dictionaries found in Lectern" : null,
                ].filter(Boolean));
            }
            logger_1.Logger.debug `Dictionary '${params.dictionaryName}' v${params.dictionaryVersion} found in Lectern`;
            // Step 2: Validate that the centric entity exists in the dictionary
            const validationResult = await lecternService.validateCentricEntity(params.dictionaryName, params.dictionaryVersion, params.defaultCentricEntity);
            if (!validationResult.exists) {
                // Create error with available entities in details
                throw errors_1.ErrorFactory.validation(`Entity '${params.defaultCentricEntity}' does not exist in dictionary '${params.dictionaryName}' v${params.dictionaryVersion}`, {
                    requestedEntity: params.defaultCentricEntity,
                    dictionaryName: params.dictionaryName,
                    dictionaryVersion: params.dictionaryVersion,
                    availableEntities: validationResult.entities, // This will be displayed
                }, [
                    "Check entity name spelling",
                    "Choose a valid entity from the dictionary schema",
                    "Verify the entity exists in the dictionary definition",
                    validationResult.entities.length === 0
                        ? "No entities found in dictionary"
                        : null,
                ].filter(Boolean));
            }
            logger_1.Logger.debug `Entity '${params.defaultCentricEntity}' validated in dictionary`;
        }
        catch (error) {
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            // Wrap unexpected validation errors
            throw errors_1.ErrorFactory.connection("Failed to validate dictionary against Lectern", {
                dictionaryName: params.dictionaryName,
                dictionaryVersion: params.dictionaryVersion,
                originalError: error,
            }, [
                "Check Lectern service is accessible",
                "Verify Lectern contains the required dictionary",
                "Check network connectivity to Lectern",
                "Use --debug for detailed error information",
            ]);
        }
    }
    /**
     * Log registration information
     */
    logRegistrationInfo(params, url) {
        logger_1.Logger.debug `${chalk_1.default.bold.cyan("Registering Dictionary with Lyric:")}`;
        logger_1.Logger.debug `URL: ${url}/dictionary/register`;
        logger_1.Logger.debug `Category: ${params.categoryName}`;
        logger_1.Logger.debug `Dictionary: ${params.dictionaryName}`;
        logger_1.Logger.debug `Version: ${params.dictionaryVersion}`;
        logger_1.Logger.debug `Centric Entity: ${params.defaultCentricEntity}`;
    }
    /**
     * Log successful registration
     */
    logSuccess(params) {
        logger_1.Logger.successString("Dictionary registered successfully with Lyric");
        logger_1.Logger.generic(chalk_1.default.gray(`    - Category: ${params.categoryName}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Dictionary: ${params.dictionaryName}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Version: ${params.dictionaryVersion}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Centric Entity: ${params.defaultCentricEntity}`));
    }
    /**
     * Handle execution errors with helpful user feedback
     */
    handleExecutionError(error) {
        if (error instanceof Error && error.name === "ConductorError") {
            const conductorError = error;
            return {
                success: false,
                errorMessage: conductorError.message,
                errorCode: conductorError.code,
                details: conductorError.details,
            };
        }
        // Handle unexpected errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Categorize based on error content
        if (errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("ETIMEDOUT")) {
            const connectionError = errors_1.ErrorFactory.connection("Failed to connect to services", { originalError: error }, [
                "Check that Lyric and Lectern services are running",
                "Verify the service URLs and ports",
                "Check network connectivity",
                "Review firewall settings",
            ]);
            return {
                success: false,
                errorMessage: connectionError.message,
                errorCode: connectionError.code,
                details: connectionError.details,
            };
        }
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
            const authError = errors_1.ErrorFactory.auth("Authentication failed with services", { originalError: error }, [
                "Check your authentication credentials",
                "Verify API tokens are valid",
                "Contact administrator for access",
            ]);
            return {
                success: false,
                errorMessage: authError.message,
                errorCode: authError.code,
                details: authError.details,
            };
        }
        // Generic fallback
        const genericError = errors_1.ErrorFactory.connection("Dictionary registration failed", { originalError: error }, [
            "Check the service logs for more details",
            "Verify your registration parameters",
            "Ensure dictionary exists in Lectern first",
            "Try the registration again after a few moments",
        ]);
        return {
            success: false,
            errorMessage: genericError.message,
            errorCode: genericError.code,
            details: genericError.details,
        };
    }
}
exports.LyricRegistrationCommand = LyricRegistrationCommand;
