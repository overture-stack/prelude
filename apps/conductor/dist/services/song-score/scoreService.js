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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreService = void 0;
// src/services/score/ScoreService.ts
const baseService_1 = require("../base/baseService");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
class ScoreService extends baseService_1.BaseService {
    constructor(config) {
        super(config);
        this.SONG_EXEC_TIMEOUT = 60000; // 60 seconds
        this.SCORE_EXEC_TIMEOUT = 300000; // 5 minutes for larger uploads
    }
    get serviceName() {
        return "Score";
    }
    get healthEndpoint() {
        return "/download/ping";
    }
    /**
     * Complete manifest upload workflow: generate manifest -> upload files
     */
    async uploadWithManifest(params) {
        try {
            this.validateRequired(params, ["analysisId", "dataDir", "manifestFile"]);
            // Validate data directory exists
            if (!fs.existsSync(params.dataDir)) {
                throw errors_1.ErrorFactory.file("Data directory not found", params.dataDir, [
                    "Check that the directory exists",
                    "Verify the path is correct",
                    "Ensure you have access to the directory",
                ]);
            }
            // Create output directory if needed
            const manifestDir = path.dirname(params.manifestFile);
            if (!fs.existsSync(manifestDir)) {
                fs.mkdirSync(manifestDir, { recursive: true });
                logger_1.Logger.info `Created directory: ${manifestDir}`;
            }
            logger_1.Logger.debug `Starting Score manifest upload for analysis: ${params.analysisId}`;
            // Step 1: Generate manifest
            await this.generateManifest({
                analysisId: params.analysisId,
                manifestFile: params.manifestFile,
                dataDir: params.dataDir,
                songUrl: params.songUrl,
                authToken: params.authToken,
            });
            // Step 2: Upload files using manifest
            await this.uploadFiles({
                manifestFile: params.manifestFile,
                authToken: params.authToken,
            });
            // Read manifest content for response
            let manifestContent = "";
            try {
                manifestContent = fs.readFileSync(params.manifestFile, "utf8");
            }
            catch (error) {
                logger_1.Logger.warnString(`Could not read manifest file: ${error}`);
            }
            logger_1.Logger.debug `Successfully uploaded files with Score`;
            return {
                success: true,
                analysisId: params.analysisId,
                manifestFile: params.manifestFile,
                manifestContent,
                message: "Files uploaded successfully",
            };
        }
        catch (error) {
            this.handleServiceError(error, "manifest upload workflow");
        }
    }
    /**
     * Generate manifest file using SONG client or direct API approach
     */
    async generateManifest(params) {
        logger_1.Logger.info `Generating manifest for analysis: ${params.analysisId}`;
        // Check if Docker song-client is available
        const useSongDocker = await this.checkIfDockerContainerRunning("song-client");
        if (useSongDocker) {
            logger_1.Logger.infoString(`Using Song Docker client to generate manifest`);
            await this.generateManifestWithSongClient(params);
        }
        else {
            logger_1.Logger.infoString(`Using direct API approach to generate manifest`);
            await this.generateManifestDirect(params);
        }
        // Verify manifest was created
        if (!fs.existsSync(params.manifestFile)) {
            throw errors_1.ErrorFactory.file("Manifest file not generated", params.manifestFile, [
                "Check SONG client configuration",
                "Verify analysis ID exists",
                "Review command execution logs",
            ]);
        }
        const manifestContent = fs.readFileSync(params.manifestFile, "utf8");
        logger_1.Logger.debugString(`Generated manifest content:\n${manifestContent}`);
        logger_1.Logger.info `Successfully generated manifest at ${params.manifestFile}`;
    }
    /**
     * Generate manifest using SONG Docker client
     */
    async generateManifestWithSongClient(params) {
        try {
            // Convert local paths to container paths
            const containerManifestPath = "/output/manifest.txt";
            const containerDataDir = "/data/fileData";
            // Construct Docker song-client manifest command
            const command = [
                `docker exec`,
                `song-client`,
                `sh -c "sing manifest -a ${params.analysisId} -f ${containerManifestPath} -d ${containerDataDir}"`,
            ].join(" ");
            logger_1.Logger.debugString(`Executing: ${command}`);
            // Execute the command
            const { stdout, stderr } = await execPromise(command, {
                timeout: this.SONG_EXEC_TIMEOUT,
            });
            // Log output
            if (stdout)
                logger_1.Logger.debugString(`SONG manifest stdout: ${stdout}`);
            if (stderr)
                logger_1.Logger.warnString(`SONG manifest stderr: ${stderr}`);
        }
        catch (error) {
            logger_1.Logger.errorString(`SONG client manifest generation failed`);
            if (error.stdout)
                logger_1.Logger.debugString(`Stdout: ${error.stdout}`);
            if (error.stderr)
                logger_1.Logger.debugString(`Stderr: ${error.stderr}`);
            throw errors_1.ErrorFactory.connection("Failed to generate manifest using SONG client", { originalError: error }, [
                "Check that song-client Docker container is running",
                "Verify analysis ID exists in SONG",
                "Review Docker container logs",
                "Ensure proper volume mounts are configured",
            ]);
        }
    }
    /**
     * Generate manifest directly using SONG API
     */
    async generateManifestDirect(params) {
        var _a, _b;
        try {
            logger_1.Logger.info `Fetching analysis ${params.analysisId} details from SONG API`;
            // Create a temporary HTTP client for SONG
            const songConfig = {
                url: params.songUrl || "http://localhost:8080",
                timeout: 10000,
                authToken: params.authToken,
            };
            const axios = require("axios");
            const baseUrl = songConfig.url.endsWith("/")
                ? songConfig.url.slice(0, -1)
                : songConfig.url;
            // Get all studies to find which one contains our analysis
            const studiesResponse = await axios.get(`${baseUrl}/studies/all`, {
                headers: {
                    Accept: "application/json",
                    Authorization: ((_a = params.authToken) === null || _a === void 0 ? void 0 : _a.startsWith("Bearer "))
                        ? params.authToken
                        : `Bearer ${params.authToken}`,
                },
            });
            const studies = Array.isArray(studiesResponse.data)
                ? studiesResponse.data
                : [studiesResponse.data];
            let analysis = null;
            let studyId = null;
            // Search for the analysis across all studies
            for (const study of studies) {
                try {
                    const analysisResponse = await axios.get(`${baseUrl}/studies/${study}/analysis/${params.analysisId}`, {
                        headers: {
                            Accept: "application/json",
                            Authorization: ((_b = params.authToken) === null || _b === void 0 ? void 0 : _b.startsWith("Bearer "))
                                ? params.authToken
                                : `Bearer ${params.authToken}`,
                        },
                    });
                    if (analysisResponse.status === 200) {
                        analysis = analysisResponse.data;
                        studyId = study;
                        logger_1.Logger.info `Found analysis ${params.analysisId} in study ${studyId}`;
                        break;
                    }
                }
                catch (error) {
                    // Continue to next study if analysis not found
                    continue;
                }
            }
            if (!analysis || !studyId) {
                throw errors_1.ErrorFactory.validation(`Analysis ${params.analysisId} not found in any study`, { analysisId: params.analysisId }, [
                    "Verify the analysis ID is correct",
                    "Check that the analysis exists in SONG",
                    "Ensure you have access to the study",
                ]);
            }
            // Extract file information from the analysis
            const files = analysis.files || [];
            if (files.length === 0) {
                throw errors_1.ErrorFactory.validation(`No files found in analysis ${params.analysisId}`, { analysisId: params.analysisId }, [
                    "Check that the analysis contains files",
                    "Verify the analysis was submitted correctly",
                ]);
            }
            logger_1.Logger.info `Found ${files.length} files in analysis ${params.analysisId}`;
            // Generate manifest content
            let manifestContent = `${params.analysisId}\t\t\n`;
            for (const file of files) {
                const objectId = file.objectId;
                const fileName = file.fileName;
                const fileMd5sum = file.fileMd5sum;
                if (!objectId || !fileName || !fileMd5sum) {
                    logger_1.Logger.warnString(`Missing required fields for file: ${JSON.stringify(file)}`);
                    continue;
                }
                const containerFilePath = `/data/fileData/${fileName}`;
                manifestContent += `${objectId}\t${containerFilePath}\t${fileMd5sum}\n`;
            }
            // Write the manifest to file
            logger_1.Logger.debugString(`Writing manifest content to ${params.manifestFile}:\n${manifestContent}`);
            fs.writeFileSync(params.manifestFile, manifestContent);
            logger_1.Logger.success `Successfully generated manifest at ${params.manifestFile}`;
        }
        catch (error) {
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            throw errors_1.ErrorFactory.connection("Failed to generate manifest using SONG API", { originalError: error }, [
                "Check SONG service availability",
                "Verify authentication credentials",
                "Ensure analysis ID exists",
            ]);
        }
    }
    /**
     * Upload files using score-client
     */
    async uploadFiles(params) {
        logger_1.Logger.infoString(`Uploading files with Score client`);
        // Check if Docker score-client is available
        const useScoreDocker = await this.checkIfDockerContainerRunning("score-client");
        if (!useScoreDocker) {
            throw errors_1.ErrorFactory.args("Score client Docker container not available", [
                "Install Docker and ensure score-client container is running",
                "Check Docker container status",
                "Verify container configuration",
            ]);
        }
        try {
            // Convert local path to container path
            const containerManifestPath = "/output/manifest.txt";
            // Construct Docker score-client upload command
            const command = [
                `docker exec`,
                `score-client`,
                `sh -c "score-client upload --manifest ${containerManifestPath}"`,
            ].join(" ");
            logger_1.Logger.debugString(`Executing: ${command}`);
            // Execute the command
            const { stdout, stderr } = await execPromise(command, {
                timeout: this.SCORE_EXEC_TIMEOUT,
            });
            // Log output
            if (stdout)
                logger_1.Logger.debugString(`SCORE upload stdout: ${stdout}`);
            if (stderr)
                logger_1.Logger.warnString(`SCORE upload stderr: ${stderr}`);
            logger_1.Logger.info `Files uploaded successfully with Score client`;
        }
        catch (error) {
            logger_1.Logger.errorString(`Score client upload failed`);
            if (error.stdout)
                logger_1.Logger.debugString(`Stdout: ${error.stdout}`);
            if (error.stderr)
                logger_1.Logger.debugString(`Stderr: ${error.stderr}`);
            throw errors_1.ErrorFactory.connection("Failed to upload with Score", { originalError: error }, [
                "Check score-client Docker container status",
                "Verify manifest file format",
                "Review container logs for errors",
                "Ensure proper network connectivity",
            ]);
        }
    }
    /**
     * Check if a Docker container is running
     */
    async checkIfDockerContainerRunning(containerName) {
        try {
            const command = `docker ps -q -f name=${containerName}`;
            logger_1.Logger.debugString(`Checking if container is running: ${command}`);
            const { stdout } = await execPromise(command);
            return stdout.trim().length > 0;
        }
        catch (error) {
            logger_1.Logger.debugString(`Docker container check failed: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    /**
     * Validate Docker availability
     */
    async validateDockerAvailability() {
        try {
            await execPromise("docker --version");
        }
        catch (error) {
            throw errors_1.ErrorFactory.args("Docker is required for Score operations but is not available", [
                "Install Docker and ensure it's running",
                "Add Docker to your system PATH",
                "Verify Docker daemon is started",
            ]);
        }
    }
}
exports.ScoreService = ScoreService;
