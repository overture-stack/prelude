// src/services/song-score/songScoreService.ts - Enhanced with ErrorFactory patterns
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import { SongService } from "./songService";
import { ScoreService } from "./scoreService";
import { SongScoreWorkflowParams, SongScoreWorkflowResponse } from "./types";

/**
 * Combined service for SONG/Score workflows
 * Handles the complete end-to-end process of:
 * 1. Submitting analysis to SONG
 * 2. Generating manifest and uploading files to Score
 * 3. Publishing analysis in SONG
 */
export class SongScoreService extends BaseService {
  private songService: SongService;
  private scoreService: ScoreService;

  constructor(config: ServiceConfig, scoreConfig?: ServiceConfig) {
    super(config);

    // Initialize Song service with main config
    this.songService = new SongService(config);

    // Initialize Score service with separate config or default
    this.scoreService = new ScoreService(
      scoreConfig || {
        url: process.env.SCORE_URL || "http://localhost:8087",
        timeout: 30000,
        authToken: config.authToken,
      }
    );
  }

  get serviceName(): string {
    return "SONG/Score";
  }

  protected get healthEndpoint(): string {
    return "/isAlive"; // Use SONG's health endpoint as primary
  }

  /**
   * Execute complete SONG/Score workflow
   */
  async executeWorkflow(
    params: SongScoreWorkflowParams
  ): Promise<SongScoreWorkflowResponse> {
    const steps = {
      submitted: false,
      uploaded: false,
      published: false,
    };

    let analysisId = "";

    try {
      this.validateWorkflowParams(params);

      Logger.info`Starting SONG/Score workflow for study: ${params.studyId}`;

      // Step 1: Submit analysis to SONG
      Logger.info`Step 1: Submitting analysis to SONG`;
      const analysisResponse = await this.songService.submitAnalysis({
        analysisContent: params.analysisContent,
        studyId: params.studyId,
        allowDuplicates: params.allowDuplicates,
      });

      analysisId = analysisResponse.analysisId;
      steps.submitted = true;
      Logger.success`Analysis submitted with ID: ${analysisId}`;

      // Step 2: Generate manifest and upload files to Score
      Logger.info`Step 2: Generating manifest and uploading files to Score`;
      await this.scoreService.uploadWithManifest({
        analysisId,
        dataDir: params.dataDir,
        manifestFile: params.manifestFile,
        songUrl: params.songUrl,
        authToken: params.authToken,
      });

      steps.uploaded = true;
      Logger.success`Files uploaded successfully to Score`;

      // Step 3: Publish analysis in SONG
      Logger.info`Step 3: Publishing analysis in SONG`;
      await this.songService.publishAnalysis({
        analysisId,
        studyId: params.studyId,
        ignoreUndefinedMd5: params.ignoreUndefinedMd5,
      });

      steps.published = true;
      Logger.success`Analysis published successfully`;

      Logger.success`SONG/Score workflow completed successfully`;

      return {
        success: true,
        analysisId,
        studyId: params.studyId,
        manifestFile: params.manifestFile,
        status: "COMPLETED",
        steps,
        message: "Workflow completed successfully",
      };
    } catch (error) {
      return this.handleWorkflowError(error, analysisId, params, steps);
    }
  }

  /**
   * Validate workflow parameters
   */
  private validateWorkflowParams(params: SongScoreWorkflowParams): void {
    this.validateRequired(
      params,
      ["analysisContent", "studyId", "dataDir", "manifestFile"],
      "SONG/Score workflow"
    );

    // Validate study ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(params.studyId)) {
      throw ErrorFactory.validation(
        `Invalid study ID format: ${params.studyId}`,
        { studyId: params.studyId },
        [
          "Study ID must contain only letters, numbers, hyphens, and underscores",
          "Use the same study ID used when creating the study",
          "Check for typos or extra characters",
          "Ensure the study exists in SONG",
        ]
      );
    }

    // Validate analysis content is valid JSON
    try {
      JSON.parse(params.analysisContent);
    } catch (error) {
      throw ErrorFactory.validation(
        "Invalid JSON format in analysis content",
        { error: error instanceof Error ? error.message : String(error) },
        [
          "Check JSON syntax for errors (missing commas, brackets, quotes)",
          "Validate JSON structure using a JSON validator",
          "Ensure file encoding is UTF-8",
          "Try viewing the analysis file in a JSON editor",
        ]
      );
    }

    // Validate data directory exists
    const fs = require("fs");
    if (!fs.existsSync(params.dataDir)) {
      throw ErrorFactory.file(
        `Data directory not found: ${params.dataDir}`,
        params.dataDir,
        [
          "Check that the directory path is correct",
          "Ensure the directory exists",
          "Verify permissions allow access",
          `Current directory: ${process.cwd()}`,
          "Create the directory if it doesn't exist",
        ]
      );
    }

    Logger.debug`Workflow parameters validated`;
  }

  /**
   * Handle workflow errors with detailed context
   */
  private handleWorkflowError(
    error: unknown,
    analysisId: string,
    params: SongScoreWorkflowParams,
    steps: { submitted: boolean; uploaded: boolean; published: boolean }
  ): SongScoreWorkflowResponse {
    // Determine the status based on which steps completed
    let status: "COMPLETED" | "PARTIAL" | "FAILED" = "FAILED";

    if (steps.submitted && steps.uploaded && !steps.published) {
      status = "PARTIAL";
    } else if (steps.submitted && !steps.uploaded) {
      status = "PARTIAL";
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    Logger.error`SONG/Score workflow failed: ${errorMessage}`;

    // Log which steps completed
    Logger.info`Workflow status:`;
    Logger.info`  - Analysis submitted: ${steps.submitted ? "✓" : "✗"}`;
    Logger.info`  - Files uploaded: ${steps.uploaded ? "✓" : "✗"}`;
    Logger.info`  - Analysis published: ${steps.published ? "✓" : "✗"}`;

    // Provide specific guidance based on failure point
    let suggestions: string[] = [];

    if (!steps.submitted) {
      suggestions = [
        "Analysis submission failed - check SONG service connectivity",
        "Verify analysis file format and content",
        "Ensure study exists in SONG",
        "Check SONG service authentication",
      ];
    } else if (!steps.uploaded) {
      suggestions = [
        "File upload failed - check Score service and Docker requirements",
        "Verify data files exist in specified directory",
        "Ensure Docker containers are running (song-client, score-client)",
        "Check Score service connectivity",
      ];
    } else if (!steps.published) {
      suggestions = [
        "Analysis publication failed - files uploaded but publication incomplete",
        "Run songPublishAnalysis command manually to complete",
        "Check analysis validation status in SONG",
        "Verify all required files were uploaded successfully",
      ];
    } else {
      suggestions = [
        "Unexpected workflow failure",
        "Check all service connectivities",
        "Review service logs for detailed errors",
        "Contact support if issue persists",
      ];
    }

    return {
      success: false,
      analysisId,
      studyId: params.studyId,
      manifestFile: params.manifestFile,
      status,
      steps,
      message: `Workflow failed: ${errorMessage}`,
      suggestions,
    };
  }

  /**
   * Check health of both SONG and Score services
   */
  async checkServicesHealth(): Promise<{
    song: boolean;
    score: boolean;
    overall: boolean;
  }> {
    try {
      const [songHealth, scoreHealth] = await Promise.allSettled([
        this.songService.checkHealth(),
        this.scoreService.checkHealth(),
      ]);

      const songHealthy =
        songHealth.status === "fulfilled" && songHealth.value.healthy;
      const scoreHealthy =
        scoreHealth.status === "fulfilled" && scoreHealth.value.healthy;

      if (!songHealthy) {
        Logger.warn`SONG service health check failed`;
      }
      if (!scoreHealthy) {
        Logger.warn`Score service health check failed`;
      }

      return {
        song: songHealthy,
        score: scoreHealthy,
        overall: songHealthy && scoreHealthy,
      };
    } catch (error) {
      Logger.warn`Error checking services health: ${error}`;
      return {
        song: false,
        score: false,
        overall: false,
      };
    }
  }

  /**
   * Validate Docker requirements for Score operations
   */
  async validateDockerRequirements(): Promise<void> {
    try {
      await this.scoreService.validateDockerAvailability();
      Logger.debug`Docker requirements validated for Score operations`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.validation(
        "Docker validation failed for SONG/Score workflow",
        { error: error instanceof Error ? error.message : String(error) },
        [
          "Docker is required for Score file upload operations",
          "Install Docker and ensure it's running",
          "Check Docker daemon is accessible",
          "Verify Docker permissions are correct",
          "Test with: docker --version",
        ]
      );
    }
  }

  /**
   * Enhanced service error handling for combined workflow
   */
  protected handleServiceError(error: unknown, operation: string): never {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    let suggestions = [
      "Check that both SONG and Score services are running",
      "Verify all service URLs and connectivity",
      "Ensure proper authentication for all services",
      "Check Docker is available for Score operations",
      "Review service logs for detailed errors",
    ];

    // Add operation-specific suggestions
    if (operation === "workflow execution") {
      suggestions = [
        "Workflow involves multiple services - check each component",
        "SONG: verify analysis format and study existence",
        "Score: ensure Docker containers and file accessibility",
        "Check network connectivity to all services",
        ...suggestions,
      ];
    } else if (operation === "Docker validation") {
      suggestions = [
        "Docker is required for Score file upload operations",
        "Install Docker and ensure it's running",
        "Check Docker daemon is accessible",
        "Verify score-client and song-client containers are available",
      ];
    }

    throw ErrorFactory.connection(
      `SONG/Score ${operation} failed: ${errorMessage}`,
      "SONG/Score",
      this.config.url,
      suggestions
    );
  }
}
