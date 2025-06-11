// src/services/score/ScoreService.ts - Enhanced with ErrorFactory patterns
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import {
  ScoreManifestUploadParams,
  ScoreManifestUploadResponse,
  ManifestGenerationParams,
} from "./types";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);

export class ScoreService extends BaseService {
  private readonly SONG_EXEC_TIMEOUT = 60000; // 60 seconds
  private readonly SCORE_EXEC_TIMEOUT = 300000; // 5 minutes for larger uploads

  constructor(config: ServiceConfig) {
    super(config);
  }

  get serviceName(): string {
    return "Score";
  }

  protected get healthEndpoint(): string {
    return "/download/ping";
  }

  /**
   * Complete manifest upload workflow: generate manifest -> upload files
   * Enhanced with ErrorFactory patterns
   */
  async uploadWithManifest(
    params: ScoreManifestUploadParams
  ): Promise<ScoreManifestUploadResponse> {
    try {
      // Enhanced parameter validation
      this.validateManifestUploadParams(params);

      // Enhanced data directory validation
      this.validateDataDirectory(params.dataDir);

      // Create output directory if needed with enhanced error handling
      const manifestDir = path.dirname(params.manifestFile);
      this.ensureDirectoryExists(manifestDir);

      Logger.info`Starting Score manifest upload for analysis: ${params.analysisId}`;

      // Step 1: Generate manifest with enhanced error handling
      await this.generateManifest({
        analysisId: params.analysisId,
        manifestFile: params.manifestFile,
        dataDir: params.dataDir,
        songUrl: params.songUrl,
        authToken: params.authToken,
      });

      // Step 2: Upload files using manifest with enhanced error handling
      await this.uploadFiles({
        manifestFile: params.manifestFile,
        authToken: params.authToken,
      });

      // Enhanced manifest content reading
      const manifestContent = this.readManifestContent(params.manifestFile);

      Logger.success`Successfully uploaded files with Score`;

      return {
        success: true,
        analysisId: params.analysisId,
        manifestFile: params.manifestFile,
        manifestContent,
        message: "Files uploaded successfully",
      };
    } catch (error) {
      this.handleServiceError(error, "manifest upload workflow");
    }
  }

  /**
   * Enhanced parameter validation
   */
  private validateManifestUploadParams(
    params: ScoreManifestUploadParams
  ): void {
    this.validateRequired(
      params,
      ["analysisId", "dataDir", "manifestFile"],
      "manifest upload"
    );

    // Enhanced analysis ID validation
    if (!/^[a-zA-Z0-9_-]+$/.test(params.analysisId)) {
      throw ErrorFactory.validation(
        `Invalid analysis ID format: ${params.analysisId}`,
        { analysisId: params.analysisId },
        [
          "Analysis ID must contain only letters, numbers, hyphens, and underscores",
          "Use the exact ID returned from SONG analysis submission",
          "Check for typos or extra characters",
          "Ensure the analysis exists in SONG",
        ]
      );
    }

    Logger.debug`Manifest upload parameters validated`;
  }

  /**
   * Enhanced data directory validation
   */
  private validateDataDirectory(dataDir: string): void {
    if (!fs.existsSync(dataDir)) {
      throw ErrorFactory.file(
        `Data directory not found: ${path.basename(dataDir)}`,
        dataDir,
        [
          "Check that the directory path is correct",
          "Ensure the directory exists",
          "Verify permissions allow access",
          `Current directory: ${process.cwd()}`,
          "Create the directory if it doesn't exist",
        ]
      );
    }

    const stats = fs.statSync(dataDir);
    if (!stats.isDirectory()) {
      throw ErrorFactory.file(
        `Path is not a directory: ${path.basename(dataDir)}`,
        dataDir,
        [
          "Provide a directory path, not a file path",
          "Check the path points to a directory",
          "Ensure the path is correct",
        ]
      );
    }

    // Check for data files
    const files = fs.readdirSync(dataDir);
    const dataFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [
        ".vcf",
        ".bam",
        ".fastq",
        ".fq",
        ".sam",
        ".cram",
        ".bed",
        ".txt",
        ".tsv",
        ".csv",
      ].includes(ext);
    });

    if (dataFiles.length === 0) {
      Logger.warn`No common data file types found in directory: ${path.basename(
        dataDir
      )}`;
      Logger.tipString(
        "Ensure data files match those referenced in your analysis file"
      );
    } else {
      Logger.debug`Found ${dataFiles.length} data file(s) in directory`;
    }

    Logger.debug`Data directory validated: ${dataDir}`;
  }

  /**
   * Enhanced directory creation with error handling
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        Logger.info`Created directory: ${dirPath}`;
      } catch (error) {
        throw ErrorFactory.file(
          `Cannot create manifest directory: ${path.basename(dirPath)}`,
          dirPath,
          [
            "Check directory permissions",
            "Ensure parent directories exist",
            "Verify disk space is available",
            "Use a different output directory",
          ]
        );
      }
    }
  }

  /**
   * Generate manifest file using SONG client or direct API approach
   * Enhanced with detailed error handling
   */
  private async generateManifest(
    params: ManifestGenerationParams
  ): Promise<void> {
    Logger.info`Generating manifest for analysis: ${params.analysisId}`;

    try {
      // Check if Docker song-client is available
      const useSongDocker = await this.checkIfDockerContainerRunning(
        "song-client"
      );

      if (useSongDocker) {
        Logger.info`Using SONG Docker client to generate manifest`;
        await this.generateManifestWithSongClient(params);
      } else {
        Logger.info`Using direct API approach to generate manifest`;
        await this.generateManifestDirect(params);
      }

      // Enhanced manifest verification
      this.verifyManifestGenerated(params.manifestFile);

      Logger.success`Successfully generated manifest at ${params.manifestFile}`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.connection(
        `Failed to generate manifest for analysis ${params.analysisId}`,
        "Score/SONG",
        undefined,
        [
          "Check that SONG service is accessible",
          "Verify analysis exists and contains file references",
          "Ensure Docker is available for SONG client operations",
          "Check network connectivity to SONG service",
          "Review analysis file structure and content",
        ]
      );
    }
  }

  /**
   * Generate manifest using SONG Docker client with enhanced error handling
   */
  private async generateManifestWithSongClient(
    params: ManifestGenerationParams
  ): Promise<void> {
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

      Logger.debug`Executing SONG client command: ${command}`;

      // Execute the command with enhanced error handling
      const { stdout, stderr } = await execPromise(command, {
        timeout: this.SONG_EXEC_TIMEOUT,
      });

      // Enhanced output logging
      if (stdout) Logger.debug`SONG manifest stdout: ${stdout}`;
      if (stderr) Logger.warn`SONG manifest stderr: ${stderr}`;

      Logger.debug`SONG client manifest generation completed`;
    } catch (error: any) {
      Logger.error`SONG client manifest generation failed`;

      if (error.stdout) Logger.debug`Stdout: ${error.stdout}`;
      if (error.stderr) Logger.debug`Stderr: ${error.stderr}`;

      if (error.code === "ETIMEDOUT") {
        throw ErrorFactory.connection(
          "SONG client manifest generation timed out",
          "SONG",
          undefined,
          [
            `Operation timed out after ${
              this.SONG_EXEC_TIMEOUT / 1000
            } seconds`,
            "Large analyses may require more time to process",
            "Check SONG service performance and connectivity",
            "Consider using direct API approach if Docker issues persist",
          ]
        );
      }

      throw ErrorFactory.connection(
        `SONG client manifest generation failed: ${
          error.message || "Unknown error"
        }`,
        "SONG",
        undefined,
        [
          "Check that song-client Docker container is running",
          "Verify Docker is properly configured",
          "Ensure SONG service is accessible from Docker container",
          "Check analysis ID exists and has file references",
          "Review Docker container logs for additional details",
        ]
      );
    }
  }

  /**
   * Generate manifest directly using SONG API with enhanced error handling
   */
  private async generateManifestDirect(
    params: ManifestGenerationParams
  ): Promise<void> {
    try {
      Logger.info`Fetching analysis ${params.analysisId} details from SONG API`;

      // Enhanced SONG service configuration
      const songConfig = {
        url: params.songUrl || "http://localhost:8080",
        timeout: 10000,
        authToken: params.authToken,
      };

      // Validate SONG URL
      try {
        new URL(songConfig.url);
      } catch (error) {
        throw ErrorFactory.config(
          `Invalid SONG URL for manifest generation: ${songConfig.url}`,
          "songUrl",
          [
            "Use a valid URL format: http://localhost:8080",
            "Include protocol (http:// or https://)",
            "Check for typos in the URL",
            "Verify SONG service is accessible",
          ]
        );
      }

      const analysis = await this.fetchAnalysisFromSong(
        songConfig,
        params.analysisId
      );

      // Enhanced manifest content generation
      const manifestContent = this.generateManifestContent(
        analysis,
        params.analysisId
      );

      // Write the manifest to file with enhanced error handling
      this.writeManifestFile(params.manifestFile, manifestContent);

      Logger.info`Successfully generated manifest using direct API approach`;
    } catch (error: any) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.connection(
        `Direct manifest generation failed: ${
          error.message || "Unknown error"
        }`,
        "SONG",
        params.songUrl,
        [
          "Check SONG service connectivity and availability",
          "Verify analysis ID exists and contains files",
          "Ensure proper authentication credentials",
          "Check network connectivity to SONG service",
        ]
      );
    }
  }

  /**
   * Enhanced analysis fetching from SONG
   */
  private async fetchAnalysisFromSong(
    songConfig: any,
    analysisId: string
  ): Promise<any> {
    const axios = require("axios");
    const baseUrl = songConfig.url.endsWith("/")
      ? songConfig.url.slice(0, -1)
      : songConfig.url;

    try {
      // Get all studies to find which one contains our analysis
      const studiesResponse = await axios.get(`${baseUrl}/studies/all`, {
        headers: {
          Accept: "application/json",
          Authorization: songConfig.authToken?.startsWith("Bearer ")
            ? songConfig.authToken
            : `Bearer ${songConfig.authToken}`,
        },
        timeout: songConfig.timeout,
      });

      const studies = Array.isArray(studiesResponse.data)
        ? studiesResponse.data
        : [studiesResponse.data];

      // Search for the analysis across all studies
      for (const study of studies) {
        try {
          const analysisResponse = await axios.get(
            `${baseUrl}/studies/${study}/analysis/${analysisId}`,
            {
              headers: {
                Accept: "application/json",
                Authorization: songConfig.authToken?.startsWith("Bearer ")
                  ? songConfig.authToken
                  : `Bearer ${songConfig.authToken}`,
              },
              timeout: songConfig.timeout,
            }
          );

          if (analysisResponse.status === 200) {
            Logger.info`Found analysis ${analysisId} in study ${study}`;
            return analysisResponse.data;
          }
        } catch (error) {
          // Continue to next study if analysis not found
          continue;
        }
      }

      throw ErrorFactory.validation(
        `Analysis not found in any study: ${analysisId}`,
        { analysisId, studiesChecked: studies.length },
        [
          "Verify analysis ID is correct",
          "Check that analysis was successfully submitted to SONG",
          "Ensure analysis exists and is in UNPUBLISHED state",
          "Confirm you have access to the study containing the analysis",
        ]
      );
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("401") || errorMessage.includes("403")) {
        throw ErrorFactory.connection(
          "SONG API authentication failed",
          "SONG",
          songConfig.url,
          [
            "Check authentication token is valid",
            "Verify API credentials and permissions",
            "Ensure token hasn't expired",
            "Confirm access to SONG studies and analyses",
          ]
        );
      }

      throw ErrorFactory.connection(
        `Failed to fetch analysis from SONG: ${errorMessage}`,
        "SONG",
        songConfig.url,
        [
          "Check SONG service connectivity",
          "Verify analysis ID exists",
          "Ensure proper authentication",
          "Check network connectivity",
        ]
      );
    }
  }

  /**
   * Enhanced manifest content generation
   */
  private generateManifestContent(analysis: any, analysisId: string): string {
    // Extract file information from the analysis
    const files = analysis.files || [];

    if (files.length === 0) {
      throw ErrorFactory.validation(
        `No files found in analysis ${analysisId}`,
        { analysisId, analysis: Object.keys(analysis) },
        [
          "Analysis must contain file references",
          "Check that files were properly added to the analysis",
          "Verify analysis structure includes 'files' array",
          "Ensure files have required objectId, fileName, and fileMd5sum",
        ]
      );
    }

    Logger.info`Found ${files.length} files in analysis ${analysisId}`;

    // Generate manifest content
    // First line: analysis ID followed by two tabs
    let manifestContent = `${analysisId}\t\t\n`;

    for (const file of files) {
      const objectId = file.objectId;
      const fileName = file.fileName;
      const fileMd5sum = file.fileMd5sum;

      if (!objectId || !fileName || !fileMd5sum) {
        Logger.warn`Missing required fields for file: ${JSON.stringify(file)}`;
        continue;
      }

      // Use container path for Docker compatibility
      const containerFilePath = `/data/fileData/${fileName}`;
      manifestContent += `${objectId}\t${containerFilePath}\t${fileMd5sum}\n`;
    }

    return manifestContent;
  }

  /**
   * Enhanced manifest file writing
   */
  private writeManifestFile(manifestFile: string, content: string): void {
    try {
      Logger.debug`Writing manifest content to ${manifestFile}`;
      fs.writeFileSync(manifestFile, content);
    } catch (error) {
      throw ErrorFactory.file(
        `Failed to write manifest file: ${path.basename(manifestFile)}`,
        manifestFile,
        [
          "Check directory permissions",
          "Ensure sufficient disk space",
          "Verify file path is accessible",
          "Try using a different output directory",
        ]
      );
    }
  }

  /**
   * Enhanced manifest verification
   */
  private verifyManifestGenerated(manifestFile: string): void {
    if (!fs.existsSync(manifestFile)) {
      throw ErrorFactory.file(
        `Manifest file not generated at expected path: ${path.basename(
          manifestFile
        )}`,
        manifestFile,
        [
          "Check manifest generation process completed successfully",
          "Verify output directory is writable",
          "Ensure no errors occurred during generation",
          "Try running manifest generation again",
        ]
      );
    }

    const stats = fs.statSync(manifestFile);
    if (stats.size === 0) {
      throw ErrorFactory.file(
        `Generated manifest file is empty: ${path.basename(manifestFile)}`,
        manifestFile,
        [
          "Check that analysis contains file references",
          "Verify manifest generation process worked correctly",
          "Ensure analysis has valid file entries",
          "Review SONG analysis structure",
        ]
      );
    }

    const manifestContent = fs.readFileSync(manifestFile, "utf8");
    Logger.debug`Generated manifest content:\n${manifestContent}`;
  }

  /**
   * Enhanced manifest content reading
   */
  private readManifestContent(manifestFile: string): string {
    try {
      return fs.readFileSync(manifestFile, "utf8");
    } catch (error) {
      Logger.warn`Could not read manifest file for response: ${error}`;
      return "";
    }
  }

  /**
   * Upload files using score-client with enhanced error handling
   */
  private async uploadFiles(params: {
    manifestFile: string;
    authToken?: string;
  }): Promise<void> {
    Logger.info`Uploading files with Score client`;

    // Enhanced Docker availability check
    const useScoreDocker = await this.checkIfDockerContainerRunning(
      "score-client"
    );

    if (!useScoreDocker) {
      throw ErrorFactory.validation(
        "Score client Docker container not available",
        { container: "score-client" },
        [
          "Install Docker and ensure it's running",
          "Pull the score-client Docker image",
          "Start the score-client container",
          "Verify Docker container is properly configured",
          "Check Docker daemon is accessible",
        ]
      );
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

      Logger.debug`Executing Score client command: ${command}`;

      // Execute the command with enhanced error handling
      const { stdout, stderr } = await execPromise(command, {
        timeout: this.SCORE_EXEC_TIMEOUT,
      });

      // Enhanced output logging
      if (stdout) Logger.debug`SCORE upload stdout: ${stdout}`;
      if (stderr) Logger.warn`SCORE upload stderr: ${stderr}`;

      Logger.success`Files uploaded successfully with Score client`;
    } catch (error: any) {
      Logger.error`Score client upload failed`;

      if (error.stdout) Logger.debug`Stdout: ${error.stdout}`;
      if (error.stderr) Logger.debug`Stderr: ${error.stderr}`;

      if (error.code === "ETIMEDOUT") {
        throw ErrorFactory.connection(
          "Score client upload timed out",
          "Score",
          this.config.url,
          [
            `Upload timed out after ${this.SCORE_EXEC_TIMEOUT / 1000} seconds`,
            "Large files may require more time to upload",
            "Check Score service performance and connectivity",
            "Consider uploading smaller batches of files",
            "Verify network stability and bandwidth",
          ]
        );
      }

      throw ErrorFactory.connection(
        `Score client upload failed: ${error.message || "Unknown error"}`,
        "Score",
        this.config.url,
        [
          "Check that score-client Docker container is running",
          "Verify Docker is properly configured",
          "Ensure Score service is accessible from Docker container",
          "Check manifest file format and content",
          "Verify all referenced files exist in data directory",
          "Review Docker container logs for additional details",
        ]
      );
    }
  }

  /**
   * Check if a Docker container is running with enhanced error handling
   */
  private async checkIfDockerContainerRunning(
    containerName: string
  ): Promise<boolean> {
    try {
      const command = `docker ps -q -f name=${containerName}`;
      Logger.debug`Checking if container is running: ${command}`;

      const { stdout } = await execPromise(command, { timeout: 5000 });
      const isRunning = stdout.trim().length > 0;

      Logger.debug`Container ${containerName} ${
        isRunning ? "is" : "is not"
      } running`;

      return isRunning;
    } catch (error) {
      Logger.debug`Docker container check failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      return false;
    }
  }

  /**
   * Validate Docker availability with enhanced error handling
   */
  async validateDockerAvailability(): Promise<void> {
    try {
      await execPromise("docker --version", { timeout: 5000 });
      Logger.debug`Docker is available`;
    } catch (error) {
      throw ErrorFactory.validation(
        "Docker is required for Score operations but is not available",
        { error: error instanceof Error ? error.message : String(error) },
        [
          "Install Docker and ensure it's running",
          "Check Docker daemon is started",
          "Verify Docker is accessible from command line",
          "Ensure proper Docker permissions",
          "Test with: docker --version",
        ]
      );
    }
  }

  /**
   * Enhanced service error handling with Score-specific context
   */
  protected handleServiceError(error: unknown, operation: string): never {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Enhanced error handling with Score-specific guidance
    const errorMessage = error instanceof Error ? error.message : String(error);

    let suggestions = [
      `Check that Score service is running and accessible`,
      `Verify service URL: ${this.config.url}`,
      "Check network connectivity and firewall settings",
      "Confirm Score service configuration",
      "Review Score service logs for additional details",
    ];

    // Add operation-specific suggestions
    if (operation === "manifest upload workflow") {
      suggestions = [
        "Verify analysis exists and contains file references",
        "Check that data directory contains referenced files",
        "Ensure Docker is available for Score operations",
        "Verify SONG service connectivity for manifest generation",
        ...suggestions,
      ];
    }

    // Handle Docker-specific errors
    if (errorMessage.includes("Docker") || errorMessage.includes("container")) {
      suggestions.unshift("Docker is required for Score operations");
      suggestions.unshift("Ensure Docker is installed and running");
      suggestions.unshift(
        "Check that score-client and song-client containers are available"
      );
    }

    throw ErrorFactory.connection(
      `Score ${operation} failed: ${errorMessage}`,
      "Score",
      this.config.url,
      suggestions
    );
  }
}
