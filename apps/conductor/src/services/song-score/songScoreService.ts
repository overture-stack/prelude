// src/services/song/SongScoreService.ts
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
      this.validateRequired(params, [
        "analysisContent",
        "studyId",
        "dataDir",
        "manifestFile",
      ]);

      Logger.debug`Starting SONG/Score workflow for study: ${params.studyId}`;

      // Step 1: Submit analysis to SONG
      Logger.debug`Submitting analysis to SONG`;
      const analysisResponse = await this.songService.submitAnalysis({
        analysisContent: params.analysisContent,
        studyId: params.studyId,
        allowDuplicates: params.allowDuplicates,
      });

      analysisId = analysisResponse.analysisId;
      steps.submitted = true;
      Logger.info`Analysis submitted with ID: ${analysisId}`;

      // Step 2: Generate manifest and upload files to Score
      Logger.debug`Generating manifest and uploading files to Score`;
      await this.scoreService.uploadWithManifest({
        analysisId,
        dataDir: params.dataDir,
        manifestFile: params.manifestFile,
        songUrl: params.songUrl,
        authToken: params.authToken,
      });

      steps.uploaded = true;
      Logger.info`Files uploaded successfully to Score`;

      // Step 3: Publish analysis in SONG
      Logger.infoString(`Publishing analysis in Song`);
      await this.songService.publishAnalysis({
        analysisId,
        studyId: params.studyId,
        ignoreUndefinedMd5: params.ignoreUndefinedMd5,
      });

      steps.published = true;
      Logger.info`Analysis published successfully`;

      Logger.debug`Song/Score workflow completed successfully`;

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
      // Determine the status based on which steps completed
      let status: "COMPLETED" | "PARTIAL" | "FAILED" = "FAILED";

      if (steps.submitted && steps.uploaded && !steps.published) {
        status = "PARTIAL";
      } else if (steps.submitted && !steps.uploaded) {
        status = "PARTIAL";
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      Logger.errorString(`Song/Score workflow failed: ${errorMessage}`);

      // Log which steps completed
      Logger.debug`Workflow status:`;
      Logger.debug`  - Analysis submitted: ${steps.submitted ? "✓" : "✗"}`;
      Logger.debug`  - Files uploaded: ${steps.uploaded ? "✓" : "✗"}`;
      Logger.debug`  - Analysis published: ${steps.published ? "✓" : "✗"}`;

      // If it's already a ConductorError, preserve it
      if (error instanceof Error && error.name === "ConductorError") {
        return {
          success: false,
          analysisId,
          studyId: params.studyId,
          manifestFile: params.manifestFile,
          status,
          steps,
          message: errorMessage,
        };
      }

      // Categorize workflow errors
      let workflowError;
      if (!steps.submitted) {
        workflowError = ErrorFactory.validation(
          "Failed to submit analysis to SONG",
          { originalError: error, steps },
          [
            "Check analysis file format and content",
            "Verify SONG service is accessible",
            "Review study ID and permissions",
          ]
        );
      } else if (!steps.uploaded) {
        workflowError = ErrorFactory.connection(
          "Failed to upload files to Score",
          { originalError: error, steps },
          [
            "Check Score service and Docker availability",
            "Verify file paths and manifest generation",
            "Review network connectivity",
          ]
        );
      } else {
        workflowError = ErrorFactory.validation(
          "Failed to publish analysis in SONG",
          { originalError: error, steps },
          [
            "Check analysis is ready for publication",
            "Verify all files were uploaded successfully",
            "Review analysis validation status",
          ]
        );
      }

      return {
        success: false,
        analysisId,
        studyId: params.studyId,
        manifestFile: params.manifestFile,
        status,
        steps,
        message: workflowError.message,
      };
    }
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

      return {
        song: songHealthy,
        score: scoreHealthy,
        overall: songHealthy && scoreHealthy,
      };
    } catch (error) {
      Logger.warnString(`Error checking services health: ${error}`);
      return {
        song: false,
        score: false,
        overall: false,
      };
    }
  }

  /**
   * Validate Docker availability for Score operations
   */
  async validateDockerRequirements(): Promise<void> {
    try {
      await this.scoreService.validateDockerAvailability();
    } catch (error) {
      this.handleServiceError(error, "Docker validation");
    }
  }
}
