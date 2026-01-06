"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongPublishAnalysisCommand = void 0;
// src/commands/songPublishAnalysisCommand.ts
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const chalk_1 = __importDefault(require("chalk"));
const errors_1 = require("../utils/errors");
const song_score_1 = require("../services/song-score");
/**
 * Command for publishing analyses in SONG service
 * Refactored to use the new SongService with error factory pattern
 */
class SongPublishAnalysisCommand extends baseCommand_1.Command {
    constructor() {
        super("SONG Analysis Publication");
    }
    /**
     * Executes the SONG analysis publication process
     */
    async execute(cliOutput) {
        const { options } = cliOutput;
        try {
            // Extract configuration
            const publishParams = this.extractPublishParams(options);
            const serviceConfig = this.extractServiceConfig(options);
            // Create service instance
            const songService = new song_score_1.SongService(serviceConfig);
            // Check service health
            const healthResult = await songService.checkHealth();
            if (!healthResult.healthy) {
                throw errors_1.ErrorFactory.connection("SONG service is not healthy", {
                    healthResult,
                    serviceUrl: serviceConfig.url,
                }, [
                    "Check that SONG service is running",
                    `Verify the service URL: ${serviceConfig.url}`,
                    "Check network connectivity",
                    "Review service logs for errors",
                ]);
            }
            // Log publication info
            this.logPublicationInfo(publishParams, serviceConfig.url);
            // Publish analysis
            const result = await songService.publishAnalysis(publishParams);
            // Log success
            this.logSuccess(result);
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
     */
    async validate(cliOutput) {
        const { options } = cliOutput;
        // Validate analysis ID
        const analysisId = this.getAnalysisId(options);
        if (!analysisId) {
            throw errors_1.ErrorFactory.args("Analysis ID not specified", [
                "Use --analysis-id option to specify analysis ID",
                "Set ANALYSIS_ID environment variable",
                "Example: --analysis-id AN123456",
            ]);
        }
        // Validate SONG URL
        const songUrl = this.getSongUrl(options);
        if (!songUrl) {
            throw errors_1.ErrorFactory.args("SONG URL not specified", [
                "Use --song-url option to specify SONG server URL",
                "Set SONG_URL environment variable",
                "Example: --song-url http://localhost:8080",
            ]);
        }
    }
    /**
     * Extract publish parameters from options
     */
    extractPublishParams(options) {
        return {
            analysisId: this.getAnalysisId(options),
            studyId: options.studyId || process.env.STUDY_ID || "demo",
            ignoreUndefinedMd5: options.ignoreUndefinedMd5 || false,
        };
    }
    /**
     * Extract service configuration from options
     */
    extractServiceConfig(options) {
        return {
            url: this.getSongUrl(options),
            timeout: 10000,
            retries: 1,
            authToken: options.authToken || process.env.AUTH_TOKEN || "123",
        };
    }
    getAnalysisId(options) {
        return options.analysisId || process.env.ANALYSIS_ID;
    }
    getSongUrl(options) {
        return options.songUrl || process.env.SONG_URL;
    }
    /**
     * Log publication information
     */
    logPublicationInfo(params, url) {
        logger_1.Logger.info `Publishing Analysis in Song`;
        logger_1.Logger.infoString(`URL: ${url}/studies/${params.studyId}/analysis/publish/${params.analysisId}`);
        logger_1.Logger.infoString(`Analysis ID: ${params.analysisId}`);
        logger_1.Logger.infoString(`Study ID: ${params.studyId}`);
    }
    /**
     * Log successful publication
     */
    logSuccess(result) {
        logger_1.Logger.successString("Analysis published successfully");
        logger_1.Logger.generic(" ");
        logger_1.Logger.generic(chalk_1.default.gray(`    - Analysis ID: ${result.analysisId}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Study ID: ${result.studyId}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Status: ${result.status}`));
        logger_1.Logger.generic(" ");
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
        // Handle unexpected errors with categorization
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("ETIMEDOUT")) {
            const connectionError = errors_1.ErrorFactory.connection("Failed to connect to SONG service", { originalError: error }, [
                "Check that SONG service is running",
                "Verify the service URL and port",
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
            const authError = errors_1.ErrorFactory.auth("Authentication failed with SONG service", { originalError: error }, [
                "Check authentication credentials",
                "Verify API token is valid",
                "Contact administrator for access",
            ]);
            return {
                success: false,
                errorMessage: authError.message,
                errorCode: authError.code,
                details: authError.details,
            };
        }
        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
            const notFoundError = errors_1.ErrorFactory.validation("Analysis not found", { originalError: error }, [
                "Verify the analysis ID is correct",
                "Check that the analysis exists in the specified study",
                "Ensure the analysis was submitted successfully",
            ]);
            return {
                success: false,
                errorMessage: notFoundError.message,
                errorCode: notFoundError.code,
                details: notFoundError.details,
            };
        }
        if (errorMessage.includes("400") || errorMessage.includes("validation")) {
            const validationError = errors_1.ErrorFactory.validation("Analysis publication validation failed", { originalError: error }, [
                "Check that all files were uploaded successfully",
                "Verify the analysis is in a publishable state",
                "Review analysis validation requirements",
            ]);
            return {
                success: false,
                errorMessage: validationError.message,
                errorCode: validationError.code,
                details: validationError.details,
            };
        }
        // Generic fallback
        const genericError = errors_1.ErrorFactory.connection("Analysis publication failed", { originalError: error }, [
            "Check SONG service availability",
            "Verify analysis and study parameters",
            "Use --debug for detailed error information",
        ]);
        return {
            success: false,
            errorMessage: genericError.message,
            errorCode: genericError.code,
            details: genericError.details,
        };
    }
}
exports.SongPublishAnalysisCommand = SongPublishAnalysisCommand;
