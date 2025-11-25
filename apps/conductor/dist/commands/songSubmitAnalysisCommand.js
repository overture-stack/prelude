"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongSubmitAnalysisCommand = void 0;
// src/commands/songSubmitAnalysisCommand.ts - Updated with beta warning
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const chalk_1 = __importDefault(require("chalk"));
const errors_1 = require("../utils/errors");
const song_score_1 = require("../services/song-score");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Combined command for SONG analysis submission and Score file upload
 * This replaces both songSubmitAnalysis and scoreManifestUpload commands
 * Updated to use error factory pattern for consistent error handling
 */
class SongSubmitAnalysisCommand extends baseCommand_1.Command {
    constructor() {
        super("SONG Analysis Submission & File Upload");
    }
    /**
     * Executes the combined SONG/Score workflow
     */
    async execute(cliOutput) {
        const { options } = cliOutput;
        try {
            // Extract configuration
            const workflowParams = this.extractWorkflowParams(options);
            const serviceConfig = this.extractServiceConfig(options);
            const scoreConfig = this.extractScoreConfig(options);
            // Create combined service instance
            const songScoreService = new song_score_1.SongScoreService(serviceConfig, scoreConfig);
            // Check Docker requirements for Score operations
            await songScoreService.validateDockerRequirements();
            // Check services health
            const healthStatus = await songScoreService.checkServicesHealth();
            if (!healthStatus.overall) {
                const issues = [];
                if (!healthStatus.song)
                    issues.push("SONG");
                if (!healthStatus.score)
                    issues.push("Score");
                throw errors_1.ErrorFactory.connection(`Service health check failed: ${issues.join(", ")} service(s) not healthy`, { healthStatus }, [
                    "Check that SONG service is running and accessible",
                    "Check that Score service is running and accessible",
                    "Verify Docker containers are properly configured",
                    "Review service logs for errors",
                ]);
            }
            // Log workflow info
            this.logWorkflowInfo(workflowParams, serviceConfig.url, scoreConfig === null || scoreConfig === void 0 ? void 0 : scoreConfig.url);
            // Execute the complete workflow
            const result = await songScoreService.executeWorkflow(workflowParams);
            // Log success/partial success
            if (result.success) {
                this.logSuccess(result);
            }
            else {
                this.logPartialSuccess(result);
            }
            return {
                success: result.success,
                details: result,
            };
        }
        catch (error) {
            return this.handleExecutionError(error);
        }
    }
    /**
     * Validates command line arguments and shows beta warning
     */
    async validate(cliOutput) {
        // Show beta warning for SONG/Score workflow
        this.showBetaWarning();
        const { options } = cliOutput;
        // Validate analysis file
        const analysisFile = this.getAnalysisFile(options);
        if (!analysisFile) {
            throw errors_1.ErrorFactory.args("Analysis file not specified", [
                "Use --analysis-file option to specify the analysis file",
                "Set ANALYSIS_FILE environment variable",
                "Example: --analysis-file ./analysis.json",
            ]);
        }
        if (!fs.existsSync(analysisFile)) {
            throw errors_1.ErrorFactory.file("Analysis file not found", analysisFile, [
                "Check that the file exists",
                "Verify the file path is correct",
                "Ensure you have read access to the file",
            ]);
        }
        // Validate it's a JSON file
        if (!analysisFile.toLowerCase().endsWith(".json")) {
            throw errors_1.ErrorFactory.invalidFile("Analysis file must be a JSON file", analysisFile, [
                "Ensure the file has a .json extension",
                "Verify the file contains valid JSON content",
            ]);
        }
        // Validate data directory
        const dataDir = this.getDataDir(options);
        if (!fs.existsSync(dataDir)) {
            throw errors_1.ErrorFactory.file("Data directory not found", dataDir, [
                "Check that the directory exists",
                "Verify the directory path is correct",
                "Ensure you have access to the directory",
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
     * Display beta warning for SONG/Score workflow
     */
    showBetaWarning() {
        logger_1.Logger.generic("");
        logger_1.Logger.generic(chalk_1.default.bold.yellow("⚠️  EXPERIMENTAL FEATURE"));
        logger_1.Logger.generic(chalk_1.default.yellow("   This SONG/Score integration is experimental and in beta."));
        logger_1.Logger.generic(chalk_1.default.yellow("   Usage of standard client tools can be found at: ") +
            chalk_1.default.cyan.underline("https://docs.overture.bio/guides/user-guides/"));
        logger_1.Logger.generic("");
    }
    /**
     * Extract workflow parameters from options
     */
    extractWorkflowParams(options) {
        const analysisFile = this.getAnalysisFile(options);
        try {
            const analysisContent = fs.readFileSync(analysisFile, "utf-8");
            return {
                analysisContent,
                studyId: options.studyId || process.env.STUDY_ID || "demo",
                allowDuplicates: options.allowDuplicates || false,
                dataDir: this.getDataDir(options),
                manifestFile: this.getManifestFile(options),
                ignoreUndefinedMd5: options.ignoreUndefinedMd5 || false,
                songUrl: this.getSongUrl(options),
                scoreUrl: this.getScoreUrl(options),
                authToken: options.authToken || process.env.AUTH_TOKEN || "123",
            };
        }
        catch (error) {
            throw errors_1.ErrorFactory.file("Error reading analysis file", analysisFile, [
                "Check file permissions",
                "Verify the file is not corrupted",
                "Ensure the file contains valid JSON",
            ]);
        }
    }
    /**
     * Extract SONG service configuration
     */
    extractServiceConfig(options) {
        return {
            url: this.getSongUrl(options),
            timeout: 20000,
            retries: 1,
            authToken: options.authToken || process.env.AUTH_TOKEN || "123",
        };
    }
    /**
     * Extract Score service configuration
     */
    extractScoreConfig(options) {
        return {
            url: this.getScoreUrl(options),
            timeout: 30000,
            retries: 1,
            authToken: options.authToken || process.env.AUTH_TOKEN || "123",
        };
    }
    // Helper methods for extracting values
    getAnalysisFile(options) {
        return options.analysisFile || process.env.ANALYSIS_FILE;
    }
    getDataDir(options) {
        return options.dataDir || process.env.DATA_DIR || "./data";
    }
    getManifestFile(options) {
        const outputDir = options.outputDir || process.env.OUTPUT_DIR || "./output";
        return options.manifestFile || path.join(outputDir, "manifest.txt");
    }
    getSongUrl(options) {
        return options.songUrl || process.env.SONG_URL;
    }
    getScoreUrl(options) {
        return options.scoreUrl || process.env.SCORE_URL || "http://localhost:8087";
    }
    /**
     * Log workflow information
     */
    logWorkflowInfo(params, songUrl, scoreUrl) {
        logger_1.Logger.debug `SONG/Score Analysis Workflow:`;
        logger_1.Logger.debug `SONG URL: ${songUrl}`;
        logger_1.Logger.debug `Score URL: ${scoreUrl || "http://localhost:8087"}`;
        logger_1.Logger.debug `Study ID: ${params.studyId}`;
        logger_1.Logger.debug `Data Directory: ${params.dataDir}`;
        logger_1.Logger.debug `Manifest File: ${params.manifestFile}`;
    }
    /**
     * Log successful workflow completion
     */
    logSuccess(result) {
        logger_1.Logger.successString("SONG/Score workflow completed successfully");
        logger_1.Logger.generic(" ");
        logger_1.Logger.generic(chalk_1.default.gray(`    - Analysis ID: ${result.analysisId}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Study ID: ${result.studyId}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Status: ${result.status}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Manifest File: ${result.manifestFile}`));
        logger_1.Logger.generic(" ");
    }
    /**
     * Log partial success
     */
    logPartialSuccess(result) {
        logger_1.Logger.warnString("SONG/Score workflow completed with partial success");
        logger_1.Logger.generic(" ");
        logger_1.Logger.generic(chalk_1.default.gray(`    - Analysis ID: ${result.analysisId}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Study ID: ${result.studyId}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Status: ${result.status}`));
        logger_1.Logger.generic(chalk_1.default.gray(`    - Steps completed:`));
        logger_1.Logger.generic(chalk_1.default.gray(`      - Submitted: ${result.steps.submitted ? "✓" : "✗"}`));
        logger_1.Logger.generic(chalk_1.default.gray(`      - Uploaded: ${result.steps.uploaded ? "✓" : "✗"}`));
        logger_1.Logger.generic(chalk_1.default.gray(`      - Published: ${result.steps.published ? "✓" : "✗"}`));
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
        // Connection errors
        if (errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("ETIMEDOUT")) {
            const connectionError = errors_1.ErrorFactory.connection("Failed to connect to SONG/Score services", { originalError: error }, [
                "Check that SONG and Score services are running",
                "Verify service URLs and ports",
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
        // Docker errors
        if (errorMessage.includes("docker") || errorMessage.includes("container")) {
            const dockerError = errors_1.ErrorFactory.args("Docker-related error in workflow", [
                "Ensure Docker is installed and running",
                "Check that required containers are available",
                "Verify Docker container configuration",
                "Review Docker logs for more details",
            ]);
            return {
                success: false,
                errorMessage: dockerError.message,
                errorCode: dockerError.code,
                details: dockerError.details,
            };
        }
        // File/directory errors
        if (errorMessage.includes("ENOENT") || errorMessage.includes("file")) {
            const fileError = errors_1.ErrorFactory.file("File or directory issue in workflow", undefined, [
                "Check that all required files exist",
                "Verify file and directory permissions",
                "Ensure paths are correct",
            ]);
            return {
                success: false,
                errorMessage: fileError.message,
                errorCode: fileError.code,
                details: fileError.details,
            };
        }
        // Authentication errors
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
            const authError = errors_1.ErrorFactory.auth("Authentication failed in workflow", { originalError: error }, [
                "Check authentication tokens for SONG and Score",
                "Verify you have permissions for the operations",
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
        const genericError = errors_1.ErrorFactory.connection("SONG/Score workflow failed", { originalError: error }, [
            "Check service availability and configuration",
            "Verify all required parameters are provided",
            "Use --debug for detailed error information",
            "Review service logs for more details",
        ]);
        return {
            success: false,
            errorMessage: genericError.message,
            errorCode: genericError.code,
            details: genericError.details,
        };
    }
}
exports.SongSubmitAnalysisCommand = SongSubmitAnalysisCommand;
